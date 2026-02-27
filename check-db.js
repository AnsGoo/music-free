const db = require('./db');

// 等待数据库初始化完成
setTimeout(() => {
  // 检查albums表中的数据
  db.all('SELECT id, title, cover_art FROM albums', (err, albums) => {
    if (err) {
      console.error('Error querying albums:', err);
      return;
    }
    
    console.log('Albums in database:');
    albums.forEach(album => {
      console.log(`ID: ${album.id}, Title: ${album.title}, Cover Art: ${album.cover_art}`);
    });
    
    // 检查songs表中的数据
    db.all('SELECT id, title, artist_id, album_id FROM songs', (err, songs) => {
      if (err) {
        console.error('Error querying songs:', err);
        return;
      }
      
      console.log('\nSongs in database:');
      songs.forEach(song => {
        console.log(`ID: ${song.id}, Title: ${song.title}, Artist ID: ${song.artist_id}, Album ID: ${song.album_id}`);
      });
    });
  });
}, 1000); // 等待1秒让数据库初始化完成