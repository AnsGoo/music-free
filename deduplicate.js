const db = require('./db');

// 检测重复音乐
async function detectDuplicateSongs() {
  return new Promise((resolve, reject) => {
    // 查询所有歌曲，包括艺术家和专辑信息
    db.all(`
      SELECT s.id, s.title, s.artist_id, s.album_id, s.duration, s.file_path, 
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
        // 创建一个唯一键，基于标题、艺术家、专辑和时长
        // 标题和时长是必须的，艺术家和专辑可能为空
        const key = `${song.title.toLowerCase()}|${song.artist || 'unknown'}|${song.album || 'unknown'}|${song.duration || 0}`;
        
        if (!duplicateGroups[key]) {
          duplicateGroups[key] = [];
        }
        duplicateGroups[key].push(song);
      });

      // 过滤出有重复的组
      const duplicates = Object.values(duplicateGroups).filter(group => group.length > 1);
      
      resolve(duplicates);
    });
  });
}

// 删除重复音乐
async function deleteDuplicateSong(songId) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM songs WHERE id = ?`, [songId], (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(true);
    });
  });
}

module.exports = {
  detectDuplicateSongs,
  deleteDuplicateSong
};
