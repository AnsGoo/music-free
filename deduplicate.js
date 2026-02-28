const db = require('./db');
const fs = require('fs');
const path = require('path');

// 检测重复音乐
async function detectDuplicateSongs(strategy = 'default') {
  return new Promise((resolve, reject) => {
    // 查询所有歌曲，包括艺术家和专辑信息
    db.all(`
      SELECT s.id, s.title, s.artist_id, s.album_id, s.duration, s.file_path, s.format, s.quality,
             a.name as artist, al.title as album
      FROM songs s
      LEFT JOIN artists a ON s.artist_id = a.id
      LEFT JOIN albums al ON s.album_id = al.id
    `, (err, songs) => {
      if (err) {
        reject(err);
        return;
      }

      // 按标题、艺术家、专辑和时长分组，找出重复的歌曲
      const duplicateGroups = {};

      songs.forEach(song => {
        let key;
        
        // 根据不同的去重策略生成键
        switch (strategy) {
          case 'strict':
            // 严格模式：基于标题、艺术家、专辑、时长和格式
            key = `${song.title.toLowerCase()}|${song.artist || 'unknown'}|${song.album || 'unknown'}|${song.duration || 0}|${song.format || 'unknown'}`;
            break;
          case 'loose':
            // 宽松模式：只基于标题和时长
            key = `${song.title.toLowerCase()}|${song.duration || 0}`;
            break;
          default:
            // 默认模式：基于标题、艺术家、专辑和时长
            key = `${song.title.toLowerCase()}|${song.artist || 'unknown'}|${song.album || 'unknown'}|${song.duration || 0}`;
        }
        
        if (!duplicateGroups[key]) {
          duplicateGroups[key] = [];
        }
        duplicateGroups[key].push(song);
      });

      // 过滤出有重复的组
      const duplicates = Object.values(duplicateGroups).filter(group => group.length > 1);
      
      // 为每个重复组添加额外信息
      const enhancedDuplicates = duplicates.map(group => {
        // 计算每个文件的大小
        const groupWithSize = group.map(song => {
          try {
            const stats = fs.statSync(song.file_path);
            return {
              ...song,
              file_size: stats.size
            };
          } catch (error) {
            return {
              ...song,
              file_size: 0
            };
          }
        });
        
        // 按文件大小排序（从大到小），如果文件大小相同，则按ID排序（保留最早的）
        groupWithSize.sort((a, b) => {
          if (b.file_size !== a.file_size) {
            return b.file_size - a.file_size;
          } else {
            return a.id - b.id;
          }
        });
        
        return groupWithSize;
      });
      
      resolve(enhancedDuplicates);
    });
  });
}

// 删除重复音乐
async function deleteDuplicateSong(songId) {
  return new Promise((resolve, reject) => {
    // 先获取歌曲信息，包括文件路径
    db.get(`SELECT file_path FROM songs WHERE id = ?`, [songId], (err, song) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (song) {
        // 删除文件
        try {
          if (fs.existsSync(song.file_path)) {
            fs.unlinkSync(song.file_path);
          }
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
      
      // 从数据库中删除记录
      db.run(`DELETE FROM songs WHERE id = ?`, [songId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(true);
      });
    });
  });
}

// 批量删除重复音乐
async function deleteDuplicateSongs(songIds) {
  return new Promise((resolve, reject) => {
    let deletedCount = 0;
    let errors = [];
    
    // 逐个删除歌曲
    songIds.forEach((songId, index) => {
      deleteDuplicateSong(songId)
        .then(() => {
          deletedCount++;
          if (index === songIds.length - 1) {
            resolve({ deleted: deletedCount, errors });
          }
        })
        .catch(error => {
          errors.push({ songId, error: error.message });
          if (index === songIds.length - 1) {
            resolve({ deleted: deletedCount, errors });
          }
        });
    });
  });
}

// 自动删除重复音乐（保留最高质量的版本）
async function autoDeleteDuplicates(strategy = 'default') {
  try {
    console.log('开始自动删除重复音乐，策略:', strategy);
    const duplicates = await detectDuplicateSongs(strategy);
    console.log('找到重复歌曲组数量:', duplicates.length);
    
    const deletedSongs = [];
    
    for (const group of duplicates) {
      console.log('处理重复歌曲组，包含', group.length, '首歌曲');
      console.log('保留的歌曲:', group[0].title, '文件大小:', group[0].file_size);
      // 保留第一个（文件最大的），删除其余的
      for (let i = 1; i < group.length; i++) {
        console.log('删除歌曲:', group[i].title, '文件大小:', group[i].file_size, 'ID:', group[i].id);
        await deleteDuplicateSong(group[i].id);
        deletedSongs.push(group[i]);
      }
    }
    
    console.log('自动删除完成，共删除', deletedSongs.length, '首重复歌曲');
    return { deleted: deletedSongs.length, songs: deletedSongs };
  } catch (error) {
    console.error('自动删除重复音乐时出错:', error);
    throw error;
  }
}

module.exports = {
  detectDuplicateSongs,
  deleteDuplicateSong,
  deleteDuplicateSongs,
  autoDeleteDuplicates
};
