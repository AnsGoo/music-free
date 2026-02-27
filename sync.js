const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const mm = require('music-metadata');
const db = require('./db');

// 音乐目录路径
const MUSIC_DIR = path.join(__dirname, 'music');

// 存储已处理的文件信息
let processedFiles = new Map();

// 初始化已处理文件列表
function initProcessedFiles() {
  db.all('SELECT file_path FROM songs', (err, rows) => {
    if (err) {
      console.error('Error initializing processed files:', err);
      return;
    }
    
    rows.forEach(row => {
      const filePath = row.file_path;
      if (filePath) {
        try {
          const stats = fs.statSync(filePath);
          processedFiles.set(filePath, {
            mtime: stats.mtime.getTime()
          });
        } catch (error) {
          console.error('Error getting file stats:', error);
        }
      }
    });
    
    console.log(`Initialized processed files: ${processedFiles.size}`);
  });
}

// 遍历目录，检测新增和删除的文件
function scanDirectory(dir) {
  const files = [];
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const dirent of dirents) {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...scanDirectory(fullPath));
    } else if (dirent.isFile() && /\.(mp3|wav|flac|ogg)$/i.test(dirent.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 解析音乐文件元数据
async function parseMusicMetadata(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    
    // 提取专辑封面
    let coverArt = null;
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      const format = picture.format.split('/')[1] || 'jpg';
      const coverPath = path.join(__dirname, 'music', `${Date.now()}-cover.${format}`);
      fs.writeFileSync(coverPath, picture.data);
      coverArt = path.relative(__dirname, coverPath);
    }
    
    return {
      title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
      artist: metadata.common.artists?.[0] || '未知艺术家',
      album: metadata.common.album || '未知专辑',
      duration: Math.round(metadata.format.duration || 0),
      format: path.extname(filePath).substring(1).toUpperCase(),
      quality: '未知音质',
      coverArt
    };
  } catch (error) {
    console.error('Error parsing metadata:', error);
    return {
      title: path.basename(filePath, path.extname(filePath)),
      artist: '未知艺术家',
      album: '未知专辑',
      duration: 0,
      format: path.extname(filePath).substring(1).toUpperCase(),
      quality: '未知音质',
      coverArt: null
    };
  }
}

// 处理新增的音乐文件
async function processNewFile(filePath) {
  try {
    // 解析元数据
    const metadata = await parseMusicMetadata(filePath);
    
    // 查找或创建艺术家
    db.get(`SELECT id FROM artists WHERE name = ?`, [metadata.artist], (err, artistRow) => {
      if (err) {
        console.error('Error querying artist:', err);
        return;
      }
      
      let artistId;
      
      if (artistRow) {
        artistId = artistRow.id;
        processAlbum();
      } else {
        db.run(`INSERT INTO artists (name) VALUES (?)`, [metadata.artist], function(err) {
          if (err) {
            console.error('Error creating artist:', err);
            return;
          }
          artistId = this.lastID;
          processAlbum();
        });
      }
      
      function processAlbum() {
        // 查找或创建专辑
        db.get(`SELECT id FROM albums WHERE title = ? AND artist_id = ?`, [metadata.album, artistId], (err, albumRow) => {
          if (err) {
            console.error('Error querying album:', err);
            return;
          }
          
          let albumId;
          
          if (albumRow) {
            albumId = albumRow.id;
            // 如果有封面，更新专辑封面
            if (metadata.coverArt) {
              db.run(`UPDATE albums SET cover_art = ? WHERE id = ?`, [metadata.coverArt, albumId], (err) => {
                if (err) {
                  console.error('Error updating album cover:', err);
                }
                processSong();
              });
            } else {
              processSong();
            }
          } else {
            db.run(`INSERT INTO albums (title, artist_id, cover_art) VALUES (?, ?, ?)`, [metadata.album, artistId, metadata.coverArt], function(err) {
              if (err) {
                console.error('Error creating album:', err);
                return;
              }
              albumId = this.lastID;
              processSong();
            });
          }
          
          function processSong() {
            // 创建歌曲记录
            const relativePath = path.relative(__dirname, filePath);
            db.run(`
              INSERT INTO songs (title, artist_id, album_id, file_path, format, duration, quality)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [metadata.title, artistId, albumId, relativePath, metadata.format, metadata.duration, metadata.quality], (err) => {
              if (err) {
                console.error('Error creating song:', err);
                return;
              }
              
              // 更新已处理文件列表
              const stats = fs.statSync(filePath);
              processedFiles.set(relativePath, {
                mtime: stats.mtime.getTime()
              });
              
              console.log(`Added new song: ${metadata.title} by ${metadata.artist}`);
            });
          }
        });
      }
    });
  } catch (error) {
    console.error('Error processing new file:', error);
  }
}

// 处理删除的音乐文件
function processDeletedFile(filePath) {
  // 从数据库中删除记录
  db.run(`DELETE FROM songs WHERE file_path = ?`, [filePath], (err) => {
    if (err) {
      console.error('Error deleting song:', err);
      return;
    }
    
    // 从已处理文件列表中移除
    processedFiles.delete(filePath);
    console.log(`Deleted song: ${filePath}`);
  });
}

// 同步音乐文件
async function syncMusicFiles() {
  console.log('Starting music sync...');
  
  try {
    // 扫描目录
    const files = scanDirectory(MUSIC_DIR);
    
    // 检查新增的文件
    for (const file of files) {
      const relativePath = path.relative(__dirname, file);
      const stats = fs.statSync(file);
      const mtime = stats.mtime.getTime();
      
      if (!processedFiles.has(relativePath)) {
        // 新增文件
        await processNewFile(file);
      } else {
        // 检查文件是否被修改
        const existingFile = processedFiles.get(relativePath);
        if (mtime > existingFile.mtime) {
          // 文件被修改，重新处理
          await processNewFile(file);
        }
      }
    }
    
    // 检查删除的文件
    for (const [filePath] of processedFiles) {
      if (!fs.existsSync(path.join(__dirname, filePath))) {
        // 文件被删除
        processDeletedFile(filePath);
      }
    }
    
    console.log('Music sync completed');
  } catch (error) {
    console.error('Error syncing music files:', error);
  }
}

// 启动定时任务
function startSyncSchedule() {
  // 每5分钟同步一次
  const job = schedule.scheduleJob('*/5 * * * *', syncMusicFiles);
  console.log('Music sync schedule started (every 5 minutes)');
  
  // 立即执行一次同步
  syncMusicFiles();
  
  return job;
}

// 初始化
function init() {
  initProcessedFiles();
  startSyncSchedule();
}

module.exports = {
  init,
  syncMusicFiles
};