const db = require('./db');

// 等待数据库初始化完成
setTimeout(() => {
  // 测试查询歌曲和封面信息
  db.all(`
    SELECT s.id, s.title, s.artist_id, s.album_id, s.duration, s.format, s.quality, 
           a.name as artist, al.title as album, al.cover_art 
    FROM songs s
    LEFT JOIN artists a ON s.artist_id = a.id
    LEFT JOIN albums al ON s.album_id = al.id
    LIMIT 20
  `, (err, songs) => {
    if (err) {
      console.error('Error querying songs:', err);
      return;
    }
    
    console.log('Songs with cover art:');
    songs.forEach(song => {
      console.log(`ID: ${song.id}, Title: ${song.title}, Album: ${song.album}, Cover Art: ${song.cover_art}`);
    });
  });
}, 1000); // 等待1秒让数据库初始化完成