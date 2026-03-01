const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const schedule = require('node-schedule');
const mm = require('music-metadata');
const db = require('./db');
const webdav = require('./webdav');

// 音乐目录路径
const MUSIC_DIR = path.join(__dirname, 'music');

// 存储已处理的文件信息
let processedFiles = new Map();

// 存储重复文件路径
let duplicateFiles = new Set();

// 存储封面哈希和路径的映射
let coverHashes = new Map();

// 扫描状态
let scanStatus = {
  scanning: false,
  totalFiles: 0,
  processedFiles: 0,
  failedFiles: 0,
  startTime: null,
  endTime: null
};

// 计算封面的哈希值
function calculateCoverHash(coverData) {
  return crypto.createHash('md5').update(coverData).digest('hex');
}

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
          if (filePath.startsWith('webdav://')) {
            // 对于WebDAV文件，使用当前时间作为mtime
            processedFiles.set(filePath, {
              mtime: Date.now()
            });
          } else if (filePath.startsWith('music/webdav-')) {
            // 对于旧格式的WebDAV文件，也使用当前时间作为mtime
            processedFiles.set(filePath, {
              mtime: Date.now()
            });
          } else {
            // 对于本地文件，获取实际的mtime
            const stats = fs.statSync(filePath);
            processedFiles.set(filePath, {
              mtime: stats.mtime.getTime()
            });
          }
        } catch (error) {
          // 忽略文件不存在的错误，特别是对于旧格式的WebDAV文件
          if (error.code !== 'ENOENT') {
            console.error('Error getting file stats:', error);
          }
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
      const coverHash = calculateCoverHash(picture.data);
      
      // 检查是否已经存在相同的封面
      if (coverHashes.has(coverHash)) {
        // 使用现有的封面路径
        coverArt = coverHashes.get(coverHash);
      } else {
        // 保存新封面
        const coverPath = path.join(__dirname, 'music', `${coverHash}-cover.${format}`);
        fs.writeFileSync(coverPath, picture.data);
        coverArt = path.relative(__dirname, coverPath);
        // 记录封面哈希和路径的映射
        coverHashes.set(coverHash, coverArt);
      }
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

// 检查歌曲是否重复
function isSongDuplicate(title, artist, album, duration) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT songs.id FROM songs 
      JOIN artists ON songs.artist_id = artists.id 
      JOIN albums ON songs.album_id = albums.id 
      WHERE songs.title = ? AND artists.name = ? AND albums.title = ? AND ABS(songs.duration - ?) <= 1
    `, [title, artist, album, duration], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

// 处理新增的音乐文件
async function processNewFile(filePath) {
  try {
    // 检查是否为重复文件
    const relativePath = path.relative(__dirname, filePath);
    if (duplicateFiles.has(relativePath)) {
      console.log(`Skipping duplicate file: ${relativePath}`);
      return;
    }
    
    // 解析元数据
    const metadata = await parseMusicMetadata(filePath);
    
    // 检查歌曲是否重复
    const isDuplicate = await isSongDuplicate(metadata.title, metadata.artist, metadata.album, metadata.duration);
    if (isDuplicate) {
      console.log(`Duplicate song found: ${metadata.title} by ${metadata.artist}`);
      // 标记为重复文件
      duplicateFiles.add(relativePath);
      return;
    }
    
    // 查找或创建艺术家
    db.get(`SELECT id FROM artists WHERE name = ?`, [metadata.artist], (err, artistRow) => {
      if (err) {
        console.error('Error querying artist:', err);
        return;
      }
      
      if (artistRow) {
        const artistId = artistRow.id;
        processAlbum(artistId);
      } else {
        db.run(`INSERT INTO artists (name) VALUES (?)`, [metadata.artist], function(err) {
          if (err) {
            console.error('Error creating artist:', err);
            return;
          }
          // 直接使用lastID，因为我们已经在db.js中修改了run函数，确保this.lastID被正确设置
          const artistId = this.lastID || 1; // 提供默认值以防万一
          processAlbum(artistId);
        });
      }
      
      function processAlbum(artistId) {
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
            // 直接使用lastID，因为我们已经在db.js中修改了run函数，确保this.lastID被正确设置
            albumId = this.lastID || 1; // 提供默认值以防万一
            processSong();
          });
          }
          
          function processSong() {
            // 创建歌曲记录
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

// 扫描WebDAV目录
async function scanWebdavDirectories() {
  try {
    // 确保WebDAV模块已初始化
    webdav.init();
    
    const configs = webdav.getWebdavConfig();
    const webdavFiles = [];
    
    console.log(`Found ${configs.length} WebDAV configurations`);
    
    for (const config of configs) {
      console.log(`Scanning WebDAV directory: ${config.url}`);
      const files = await scanWebdavDirectory(config, '/');
      console.log(`Found ${files.length} files in ${config.url}`);
      webdavFiles.push(...files);
    }
    
    console.log(`Total WebDAV files found: ${webdavFiles.length}`);
    return webdavFiles;
  } catch (error) {
    console.error('Error scanning WebDAV directories:', error);
    return [];
  }
}

// 递归扫描WebDAV目录
async function scanWebdavDirectory(config, remotePath) {
  try {
    console.log(`Scanning WebDAV directory: ${remotePath}`);
    const files = [];
    const remoteFiles = await webdav.getWebdavFiles(config, remotePath);
    
    console.log(`Found ${remoteFiles.length} items in ${remotePath}`);
    
    for (const item of remoteFiles) {
      if (item.type === 'directory') {
        console.log(`Found directory: ${item.filename}`);
        // 递归扫描子目录
        const subFiles = await scanWebdavDirectory(config, item.path);
        files.push(...subFiles);
      } else if (item.type === 'file' && /\.(mp3|wav|flac|ogg)$/i.test(item.filename)) {
        // 只处理音乐文件
        console.log(`Found music file: ${item.filename}`);
        files.push({ config, path: item.path, filename: item.basename });
      }
    }
    
    console.log(`Scanned ${remotePath}, found ${files.length} music files`);
    return files;
  } catch (error) {
    console.error(`Error scanning WebDAV directory ${remotePath}:`, error);
    return [];
  }
}

// 处理WebDAV音乐文件
async function processWebdavFile(webdavFile) {
  let stream = null;
  try {
    const { config, path: remotePath, filename } = webdavFile;
    const webdavPath = `webdav://${config.id}${remotePath}`;
    
    console.log(`Processing WebDAV file: ${filename} at ${remotePath}`);
    
    // 检查是否为重复文件
    if (duplicateFiles.has(webdavPath)) {
      console.log(`Skipping duplicate file: ${webdavPath}`);
      return;
    }
    
    // 检查文件是否已处理
    if (!processedFiles.has(webdavPath)) {
      console.log(`File not processed yet, processing now: ${webdavPath}`);
      // 获取文件流
      stream = await webdav.getWebdavFileStream(config, remotePath);
      console.log(`Got file stream for ${filename}`);
      
      // 直接从流中提取元数据
      const metadata = await parseMusicMetadataFromStream(stream);
      console.log(`Extracted metadata for ${filename}:`, metadata);
      
      // 检查歌曲是否重复
      const isDuplicate = await isSongDuplicate(metadata.title, metadata.artist, metadata.album, metadata.duration);
      if (isDuplicate) {
        console.log(`Duplicate song found: ${metadata.title} by ${metadata.artist}`);
        // 标记为重复文件
        duplicateFiles.add(webdavPath);
        return;
      }
      
      // 查找或创建艺术家
      db.get(`SELECT id FROM artists WHERE name = ?`, [metadata.artist], (err, artistRow) => {
        if (err) {
          console.error('Error querying artist:', err);
          return;
        }
        
        if (artistRow) {
          const artistId = artistRow.id;
          console.log(`Found existing artist: ${metadata.artist} (ID: ${artistId})`);
          processAlbum(artistId);
        } else {
          db.run(`INSERT INTO artists (name) VALUES (?)`, [metadata.artist], function(err) {
            if (err) {
              console.error('Error creating artist:', err);
              return;
            }
            // 直接使用lastID，因为我们已经在db.js中修改了run函数，确保this.lastID被正确设置
            const artistId = this.lastID || 1; // 提供默认值以防万一
            console.log(`Created new artist: ${metadata.artist} (ID: ${artistId})`);
            processAlbum(artistId);
          });
        }
        
        function processAlbum(artistId) {
          // 查找或创建专辑
          db.get(`SELECT id FROM albums WHERE title = ? AND artist_id = ?`, [metadata.album, artistId], (err, albumRow) => {
            if (err) {
              console.error('Error querying album:', err);
              return;
            }
            
            let albumId;
            
            if (albumRow) {
              albumId = albumRow.id;
              console.log(`Found existing album: ${metadata.album} (ID: ${albumId})`);
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
            // 直接使用lastID，因为我们已经在db.js中修改了run函数，确保this.lastID被正确设置
            albumId = this.lastID || 1; // 提供默认值以防万一
            console.log(`Created new album: ${metadata.album} (ID: ${albumId})`);
            processSong();
          });
            }
            
            function processSong() {
              // 创建歌曲记录，使用WebDAV路径作为file_path
              db.run(`
                INSERT INTO songs (title, artist_id, album_id, file_path, format, duration, quality)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [metadata.title, artistId, albumId, webdavPath, metadata.format, metadata.duration, metadata.quality], (err) => {
                if (err) {
                  console.error('Error creating song:', err);
                  return;
                }
                
                // 添加WebDAV路径到已处理文件列表
                processedFiles.set(webdavPath, { mtime: Date.now() });
                
                console.log(`Added WebDAV song: ${filename} from ${config.url}`);
              });
            }
          });
        }
      });
    } else {
      console.log(`File already processed: ${webdavPath}`);
    }
  } catch (error) {
    console.error('Error processing WebDAV file:', error);
  } finally {
    // 确保流被正确关闭
    if (stream) {
      try {
        stream.destroy();
      } catch (error) {
        console.error('Error closing stream:', error);
      }
    }
  }
}

// 从流中解析音乐文件元数据
async function parseMusicMetadataFromStream(stream) {
  try {
    const metadata = await mm.parseStream(stream, undefined, { fileSize: Infinity });
    
    // 提取专辑封面
    let coverArt = null;
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      const format = picture.format.split('/')[1] || 'jpg';
      const coverHash = calculateCoverHash(picture.data);
      
      // 检查是否已经存在相同的封面
      if (coverHashes.has(coverHash)) {
        // 使用现有的封面路径
        coverArt = coverHashes.get(coverHash);
      } else {
        // 保存新封面
        const coverPath = path.join(__dirname, 'music', `${coverHash}-cover.${format}`);
        fs.writeFileSync(coverPath, picture.data);
        coverArt = path.relative(__dirname, coverPath);
        // 记录封面哈希和路径的映射
        coverHashes.set(coverHash, coverArt);
      }
    }
    
    return {
      title: metadata.common.title || '未知歌曲',
      artist: metadata.common.artists?.[0] || '未知艺术家',
      album: metadata.common.album || '未知专辑',
      duration: Math.round(metadata.format.duration || 0),
      format: metadata.format.container || '未知格式',
      quality: '未知音质',
      coverArt
    };
  } catch (error) {
    console.error('Error parsing metadata from stream:', error);
    return {
      title: '未知歌曲',
      artist: '未知艺术家',
      album: '未知专辑',
      duration: 0,
      format: '未知格式',
      quality: '未知音质',
      coverArt: null
    };
  }
}

// 同步音乐文件
async function syncMusicFiles() {
  console.log('Starting music sync...');
  
  // 重置扫描状态
  scanStatus = {
    scanning: true,
    totalFiles: 0,
    processedFiles: 0,
    failedFiles: 0,
    startTime: Date.now(),
    endTime: null
  };
  
  try {
    // 扫描本地目录
    const localFiles = scanDirectory(MUSIC_DIR);
    console.log(`Found ${localFiles.length} local files`);
    
    // 扫描WebDAV目录
    console.log('Scanning WebDAV directories...');
    const webdavFiles = await scanWebdavDirectories();
    console.log(`Found ${webdavFiles.length} WebDAV files`);
    
    // 计算总文件数
    scanStatus.totalFiles = localFiles.length + webdavFiles.length;
    console.log(`Total files to process: ${scanStatus.totalFiles}`);
    
    // 检查新增的本地文件
    for (const file of localFiles) {
      const relativePath = path.relative(__dirname, file);
      const stats = fs.statSync(file);
      const mtime = stats.mtime.getTime();
      
      if (!processedFiles.has(relativePath)) {
        // 新增文件
        try {
          await processNewFile(file);
          scanStatus.processedFiles++;
        } catch (error) {
          console.error('Error processing local file:', error);
          scanStatus.failedFiles++;
        }
      } else {
        // 检查文件是否被修改
        const existingFile = processedFiles.get(relativePath);
        if (mtime > existingFile.mtime) {
          // 文件被修改，重新处理
          try {
            await processNewFile(file);
            scanStatus.processedFiles++;
          } catch (error) {
            console.error('Error processing modified local file:', error);
            scanStatus.failedFiles++;
          }
        } else {
          scanStatus.processedFiles++;
        }
      }
    }
    
    // 检查新增的WebDAV文件
    for (const file of webdavFiles) {
      try {
        await processWebdavFile(file);
        scanStatus.processedFiles++;
      } catch (error) {
        console.error('Error processing WebDAV file:', error);
        scanStatus.failedFiles++;
      }
    }
    
    // 检查删除的文件
    let deletedFiles = 0;
    for (const [filePath] of processedFiles) {
      if (!filePath.startsWith('webdav://') && !fs.existsSync(path.join(__dirname, filePath))) {
        // 本地文件被删除
        processDeletedFile(filePath);
        deletedFiles++;
      }
    }
    
    // 完成扫描
    scanStatus.scanning = false;
    scanStatus.endTime = Date.now();
    const duration = (scanStatus.endTime - scanStatus.startTime) / 1000;
    
    console.log(`Music sync completed in ${duration.toFixed(2)} seconds`);
    console.log(`Processed: ${scanStatus.processedFiles}, Failed: ${scanStatus.failedFiles}, Deleted: ${deletedFiles}`);
  } catch (error) {
    console.error('Error syncing music files:', error);
    scanStatus.scanning = false;
    scanStatus.endTime = Date.now();
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

// 获取扫描状态
function getScanStatus() {
  return scanStatus;
}

module.exports = {
  init,
  syncMusicFiles,
  getScanStatus
};