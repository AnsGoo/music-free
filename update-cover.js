const db = require('./db');

// 等待数据库初始化完成
setTimeout(() => {
  // 手动更新第一个专辑的封面路径
  const coverArt = 'music/1772123702151-cover.jpeg';
  
  db.run('UPDATE albums SET cover_art = ? WHERE id = 1', [coverArt], (err) => {
    if (err) {
      console.error('Error updating cover art:', err);
      return;
    }
    console.log('Cover art updated successfully');
    
    // 检查更新后的结果
    db.all('SELECT id, title, cover_art FROM albums', (err, albums) => {
      if (err) {
        console.error('Error querying albums:', err);
        return;
      }
      
      console.log('Updated albums:');
      albums.forEach(album => {
        console.log(`ID: ${album.id}, Title: ${album.title}, Cover Art: ${album.cover_art}`);
      });
    });
  });
}, 1000); // 等待1秒让数据库初始化完成