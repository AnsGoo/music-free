const express = require('express');
const db = require('./db');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mm = require('music-metadata');
const sync = require('./sync');

const app = express();
const port = 4040;

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'music'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 解析JSON请求体
app.use(express.json());

// 解析URL编码的请求体
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'music')));

// 身份验证中间件
function authenticate(req, res, next) {
  const { u, p, t, s } = req.query;
  
  // 简单的身份验证，实际应用中应该使用更安全的方式
  if (u === 'admin' && p === 'admin') {
    next();
  } else {
    res.status(401).json({
      "subsonic-response": {
        "status": "failed",
        "error": {
          "code": 40, 
          "message": "Unauthorized"
        }
      }
    });
  }
}

// 通用响应格式
function createResponse(data, status = 'ok') {
  return {
    "subsonic-response": {
      "status": status,
      "version": "1.16.1",
      ...data
    }
  };
}

// 系统相关接口
app.get('/rest/ping', (req, res) => {
  res.json(createResponse({}));
});

app.get('/rest/getLicense', (req, res) => {
  res.json(createResponse({ 
    license: {
      valid: true,
      email: 'admin@example.com',
      licenseExpires: '2030-12-31'
    }
  }));
});

app.get('/rest/getOpenSubsonicExtensions', (req, res) => {
  res.json(createResponse({ 
    openSubsonicExtensions: {
      extension: []
    }
  }));
});

app.get('/rest/tokenInfo', (req, res) => {
  res.json(createResponse({ 
    tokenInfo: {
      username: 'admin',
      email: 'admin@example.com',
      scrobblingEnabled: false,
      adminRole: true,
      settingsRole: true,
      downloadRole: true,
      uploadRole: true,
      playlistRole: true,
      coverArtRole: true,
      commentRole: true,
      podcastRole: true,
      streamRole: true,
      jukeboxRole: true,
      shareRole: true,
      videoConversionRole: true,
      musicFolderRole: true,
      chatRole: true,
      radioRole: true
    }
  }));
});

// 浏览接口
app.get('/rest/getMusicFolders', authenticate, (req, res) => {
  res.json(createResponse({ 
    musicFolders: {
      musicFolder: [
        {
          id: 1,
          name: 'Music'
        }
      ]
    }
  }));
});

app.get('/rest/getGenres', authenticate, (req, res) => {
  res.json(createResponse({ 
    genres: {
      genre: []
    }
  }));
});

app.get('/rest/getMusicDirectory', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    musicDirectory: {
      id: id,
      name: 'Music Directory',
      child: []
    }
  }));
});

app.get('/rest/getVideos', authenticate, (req, res) => {
  res.json(createResponse({ 
    videos: {
      video: []
    }
  }));
});

app.get('/rest/getVideoInfo', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    videoInfo: {
      id: id,
      title: 'Video',
      artist: 'Unknown',
      album: 'Unknown',
      duration: 0,
      width: 0,
      height: 0,
      videoUrl: ''
    }
  }));
});

app.get('/rest/getArtistInfo', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    artistInfo: {
      id: id,
      name: 'Artist',
      bio: '',
      similarArtist: []
    }
  }));
});

app.get('/rest/getArtistInfo2', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    artistInfo2: {
      id: id,
      name: 'Artist',
      bio: '',
      similarArtist: []
    }
  }));
});

app.get('/rest/getAlbumInfo', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    albumInfo: {
      id: id,
      name: 'Album',
      artist: 'Artist',
      artistId: 1,
      bio: '',
      similarAlbum: []
    }
  }));
});

app.get('/rest/getAlbumInfo2', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    albumInfo2: {
      id: id,
      name: 'Album',
      artist: 'Artist',
      artistId: 1,
      bio: '',
      similarAlbum: []
    }
  }));
});

app.get('/rest/getSimilarSongs', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    similarSongs: {
      song: []
    }
  }));
});

app.get('/rest/getSimilarSongs2', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    similarSongs2: {
      song: []
    }
  }));
});

app.get('/rest/getTopSongs', authenticate, (req, res) => {
  const { artist, count } = req.query;
  res.json(createResponse({ 
    topSongs: {
      song: []
    }
  }));
});

// 音乐管理接口

// 获取所有音乐
app.get('/rest/getIndexes', authenticate, (req, res) => {
  db.all(`
    SELECT DISTINCT SUBSTR(title, 1, 1) as name 
    FROM songs 
    ORDER BY name
  `, (err, rows) => {
    if (err) {
      res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
      return;
    }
    
    res.json(createResponse({ 
      indexes: { 
        index: rows.map(row => ({
          name: row.name,
          artists: []
        }))
      }
    }));
  });
});

// 搜索音乐
app.get('/rest/search3', authenticate, (req, res) => {
  const { query, artistCount, albumCount, songCount } = req.query;
  
  // 搜索歌曲
    db.all(`
      SELECT s.id, s.title, s.artist_id, s.album_id, s.duration, s.format, s.quality, 
             a.name as artist, al.title as album, al.cover_art 
      FROM songs s
      LEFT JOIN artists a ON s.artist_id = a.id
      LEFT JOIN albums al ON s.album_id = al.id
      WHERE s.title LIKE ? OR a.name LIKE ? OR al.title LIKE ?
      LIMIT ?
    `, [`%${query}%`, `%${query}%`, `%${query}%`, songCount || 20], (err, songs) => {
      if (err) {
        res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
        return;
      }
      
      console.log('Songs from database:', songs);
      
      // 搜索艺术家
      db.all(`
        SELECT id, name 
        FROM artists 
        WHERE name LIKE ?
        LIMIT ?
      `, [`%${query}%`, artistCount || 10], (err, artists) => {
        if (err) {
          res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
          return;
        }
        
        // 搜索专辑
        db.all(`
          SELECT al.id, al.title, al.artist_id, a.name as artist 
          FROM albums al
          LEFT JOIN artists a ON al.artist_id = a.id
          WHERE al.title LIKE ? OR a.name LIKE ?
          LIMIT ?
        `, [`%${query}%`, `%${query}%`, albumCount || 10], (err, albums) => {
          if (err) {
            res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
            return;
          }
          
          res.json(createResponse({ 
            searchResult3: {
              artist: artists.map(artist => ({
                id: artist.id,
                name: artist.name
              })),
              album: albums.map(album => ({
                id: album.id,
                name: album.title,
                artist: album.artist,
                artistId: album.artist_id
              })),
              song: songs.map(song => ({
                id: song.id,
                title: song.title,
                artist: song.artist,
                artistId: song.artist_id,
                album: song.album,
                albumId: song.album_id,
                duration: song.duration,
                format: song.format,
                quality: song.quality,
                coverArt: song.cover_art || null
              }))
            }
          }));
        });
      });
    });
});

// 获取歌曲详情
app.get('/rest/getSong', authenticate, (req, res) => {
  const { id } = req.query;
  
  db.get(`
    SELECT s.*, a.name as artist, al.title as album 
    FROM songs s
    LEFT JOIN artists a ON s.artist_id = a.id
    LEFT JOIN albums al ON s.album_id = al.id
    WHERE s.id = ?
  `, [id], (err, song) => {
    if (err) {
      res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
      return;
    }
    
    if (!song) {
      res.status(404).json(createResponse({ error: { code: 70, message: 'Song not found' } }, 'failed'));
      return;
    }
    
    res.json(createResponse({ 
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        artistId: song.artist_id,
        album: song.album,
        albumId: song.album_id,
        format: song.format,
        encoding: song.encoding,
        track: song.track,
        duration: song.duration,
        quality: song.quality
      }
    }));
  });
});

// 媒体检索接口
app.get('/rest/download', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    download: {
      id: id
    }
  }));
});

app.get('/rest/hls', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    hls: {
      id: id
    }
  }));
});

app.get('/rest/getCaptions', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    captions: {
      caption: []
    }
  }));
});

app.get('/rest/getCoverArt', authenticate, (req, res) => {
  const { id, size } = req.query;
  res.status(404).json(createResponse({ error: { code: 70, message: 'Cover art not found' } }, 'failed'));
});

app.get('/rest/getLyrics', authenticate, (req, res) => {
  const { artist, title } = req.query;
  res.json(createResponse({ 
    lyrics: {
      artist: artist,
      title: title,
      value: ''
    }
  }));
});

app.get('/rest/getAvatar', authenticate, (req, res) => {
  const { username } = req.query;
  res.status(404).json(createResponse({ error: { code: 70, message: 'Avatar not found' } }, 'failed'));
});

app.get('/rest/getLyricsBySongId', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({ 
    lyrics: {
      id: id,
      value: ''
    }
  }));
});

// 流式播放音乐
app.get('/rest/stream', authenticate, (req, res) => {
  const { id } = req.query;
  
  db.get(`SELECT file_path FROM songs WHERE id = ?`, [id], (err, song) => {
    if (err) {
      res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
      return;
    }
    
    if (!song) {
      res.status(404).json(createResponse({ error: { code: 70, message: 'Song not found' } }, 'failed'));
      return;
    }
    
    // 确保文件路径正确，避免路径重复
    let filePath = song.file_path;
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(__dirname, filePath);
    }
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json(createResponse({ error: { code: 70, message: 'File not found' } }, 'failed'));
      return;
    }
    
    // 流式传输文件
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size
    });
    
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

// 专辑/歌曲列表接口
app.get('/rest/getAlbumList2', authenticate, (req, res) => {
  const { type, size, offset, musicFolderId } = req.query;
  res.json(createResponse({ 
    albumList2: {
      album: []
    }
  }));
});

app.get('/rest/getRandomSongs', authenticate, (req, res) => {
  const { size, musicFolderId } = req.query;
  res.json(createResponse({ 
    randomSongs: {
      song: []
    }
  }));
});

app.get('/rest/getSongsByGenre', authenticate, (req, res) => {
  const { genre, count, offset } = req.query;
  res.json(createResponse({ 
    songsByGenre: {
      song: []
    }
  }));
});

app.get('/rest/getNowPlaying', authenticate, (req, res) => {
  res.json(createResponse({ 
    nowPlaying: {
      entry: []
    }
  }));
});

app.get('/rest/getStarred', authenticate, (req, res) => {
  res.json(createResponse({ 
    starred: {
      artist: [],
      album: [],
      song: []
    }
  }));
});

app.get('/rest/getStarred2', authenticate, (req, res) => {
  res.json(createResponse({ 
    starred2: {
      artist: [],
      album: [],
      song: []
    }
  }));
});

// 搜索接口
app.get('/rest/search', authenticate, (req, res) => {
  const { query, artistCount, albumCount, songCount } = req.query;
  res.json(createResponse({ 
    searchResult: {
      artist: [],
      album: [],
      song: []
    }
  }));
});

app.get('/rest/search2', authenticate, (req, res) => {
  const { query, artistCount, albumCount, songCount } = req.query;
  res.json(createResponse({ 
    searchResult2: {
      artist: [],
      album: [],
      song: []
    }
  }));
});

// 专辑管理接口

// 获取专辑列表
app.get('/rest/getAlbumList', authenticate, (req, res) => {
  const { type, size, offset } = req.query;
  
  db.all(`
    SELECT al.id, al.title, al.artist_id, a.name as artist 
    FROM albums al
    LEFT JOIN artists a ON al.artist_id = a.id
    ORDER BY al.title
    LIMIT ? OFFSET ?
  `, [size || 20, offset || 0], (err, albums) => {
    if (err) {
      res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
      return;
    }
    
    res.json(createResponse({ 
      albumList: {
        album: albums.map(album => ({
          id: album.id,
          name: album.title,
          artist: album.artist,
          artistId: album.artist_id
        }))
      }
    }));
  });
});

// 获取专辑详情
app.get('/rest/getAlbum', authenticate, (req, res) => {
  const { id } = req.query;
  
  db.get(`
    SELECT al.*, a.name as artist 
    FROM albums al
    LEFT JOIN artists a ON al.artist_id = a.id
    WHERE al.id = ?
  `, [id], (err, album) => {
    if (err) {
      res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
      return;
    }
    
    if (!album) {
      res.status(404).json(createResponse({ error: { code: 70, message: 'Album not found' } }, 'failed'));
      return;
    }
    
    // 获取专辑中的歌曲
    db.all(`
      SELECT s.id, s.title, s.track, s.duration 
      FROM songs s
      WHERE s.album_id = ?
      ORDER BY s.track
    `, [id], (err, songs) => {
      if (err) {
        res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
        return;
      }
      
      res.json(createResponse({ 
        album: {
          id: album.id,
          name: album.title,
          artist: album.artist,
          artistId: album.artist_id,
          song: songs.map(song => ({
            id: song.id,
            title: song.title,
            track: song.track,
            duration: song.duration
          }))
        }
      }));
    });
  });
});

// 艺术家管理接口

// 获取艺术家列表
app.get('/rest/getArtists', authenticate, (req, res) => {
  db.all(`SELECT id, name FROM artists ORDER BY name`, (err, artists) => {
    if (err) {
      res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
      return;
    }
    
    res.json(createResponse({ 
      artists: {
        artist: artists.map(artist => ({
          id: artist.id,
          name: artist.name
        }))
      }
    }));
  });
});

// 获取艺术家详情
app.get('/rest/getArtist', authenticate, (req, res) => {
  const { id } = req.query;
  
  db.get(`SELECT * FROM artists WHERE id = ?`, [id], (err, artist) => {
    if (err) {
      res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
      return;
    }
    
    if (!artist) {
      res.status(404).json(createResponse({ error: { code: 70, message: 'Artist not found' } }, 'failed'));
      return;
    }
    
    // 获取艺术家的专辑
    db.all(`
      SELECT id, title 
      FROM albums 
      WHERE artist_id = ?
      ORDER BY title
    `, [id], (err, albums) => {
      if (err) {
        res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
        return;
      }
      
      res.json(createResponse({ 
        artist: {
          id: artist.id,
          name: artist.name,
          gender: artist.gender,
          nationality: artist.nationality,
          album: albums.map(album => ({
            id: album.id,
            name: album.title
          }))
        }
      }));
    });
  });
});

// 歌单管理接口

// 获取歌单列表
app.get('/rest/getPlaylists', authenticate, (req, res) => {
  db.all(`SELECT id, name, created_at as created FROM playlists ORDER BY created_at DESC`, (err, playlists) => {
    if (err) {
      res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
      return;
    }
    
    res.json(createResponse({ 
      playlists: {
        playlist: playlists.map(playlist => ({
          id: playlist.id,
          name: playlist.name,
          created: playlist.created
        }))
      }
    }));
  });
});

// 创建歌单
app.get('/rest/createPlaylist', authenticate, (req, res) => {
  const { name } = req.query;
  
  db.run(`INSERT INTO playlists (name) VALUES (?)`, [name], function(err) {
    if (err) {
      res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
      return;
    }
    
    res.json(createResponse({ playlist: { id: this.lastID, name: name } }));
  });
});

// 向歌单添加歌曲
app.get('/rest/updatePlaylist', authenticate, (req, res) => {
  const { playlistId, songId } = req.query;
  
  db.run(`INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)`, [playlistId, songId], (err) => {
    if (err) {
      res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
      return;
    }
    
    res.json(createResponse({}));
  });
});

// 获取歌单详情
app.get('/rest/getPlaylist', authenticate, (req, res) => {
  const { id } = req.query;
  
  db.get(`SELECT id, name, created_at as created FROM playlists WHERE id = ?`, [id], (err, playlist) => {
    if (err) {
      res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
      return;
    }
    
    if (!playlist) {
      res.status(404).json(createResponse({ error: { code: 70, message: 'Playlist not found' } }, 'failed'));
      return;
    }
    
    // 获取歌单中的歌曲
    db.all(`
      SELECT s.id, s.title, s.artist_id, s.album_id, s.duration, 
             a.name as artist, al.title as album 
      FROM playlist_songs ps
      JOIN songs s ON ps.song_id = s.id
      LEFT JOIN artists a ON s.artist_id = a.id
      LEFT JOIN albums al ON s.album_id = al.id
      WHERE ps.playlist_id = ?
    `, [id], (err, songs) => {
      if (err) {
        res.status(500).json(createResponse({ error: { code: 0, message: err.message } }, 'failed'));
        return;
      }
      
      res.json(createResponse({ 
        playlist: {
          id: playlist.id,
          name: playlist.name,
          created: playlist.created,
          entry: songs.map(song => ({
            id: song.id,
            title: song.title,
            artist: song.artist,
            artistId: song.artist_id,
            album: song.album,
            albumId: song.album_id,
            duration: song.duration
          }))
        }
      }));
    });
  });
});

// 媒体注解接口
app.get('/rest/star', authenticate, (req, res) => {
  const { id, type } = req.query;
  res.json(createResponse({}));
});

app.get('/rest/unstar', authenticate, (req, res) => {
  const { id, type } = req.query;
  res.json(createResponse({}));
});

app.get('/rest/setRating', authenticate, (req, res) => {
  const { id, rating } = req.query;
  res.json(createResponse({}));
});

app.get('/rest/scrobble', authenticate, (req, res) => {
  const { id, time, submission } = req.query;
  res.json(createResponse({}));
});

// 分享接口
app.get('/rest/getShares', authenticate, (req, res) => {
  res.json(createResponse({ 
    shares: {
      share: []
    }
  }));
});

app.get('/rest/createShare', authenticate, (req, res) => {
  const { id, description, expires } = req.query;
  res.json(createResponse({ 
    share: {
      id: 1,
      description: description,
      expires: expires
    }
  }));
});

app.get('/rest/updateShare', authenticate, (req, res) => {
  const { id, description, expires } = req.query;
  res.json(createResponse({}));
});

app.get('/rest/deleteShare', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({}));
});

// 播客接口
app.get('/rest/getPodcasts', authenticate, (req, res) => {
  res.json(createResponse({ 
    podcasts: {
      channel: []
    }
  }));
});

app.get('/rest/getNewestPodcasts', authenticate, (req, res) => {
  const { count } = req.query;
  res.json(createResponse({ 
    newestPodcasts: {
      channel: []
    }
  }));
});

app.get('/rest/refreshPodcasts', authenticate, (req, res) => {
  res.json(createResponse({}));
});

app.get('/rest/createPodcastChannel', authenticate, (req, res) => {
  const { url } = req.query;
  res.json(createResponse({ 
    podcastChannel: {
      id: 1,
      url: url
    }
  }));
});

app.get('/rest/deletePodcastChannel', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({}));
});

app.get('/rest/deletePodcastEpisode', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({}));
});

app.get('/rest/downloadPodcastEpisode', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({}));
});

// 点歌台接口
app.get('/rest/jukeboxControl', authenticate, (req, res) => {
  const { action, index, id } = req.query;
  res.json(createResponse({ 
    jukeboxStatus: {
      currentIndex: 0,
      playing: false,
      gain: 100
    }
  }));
});

// 网络电台接口
app.get('/rest/getInternetRadioStations', authenticate, (req, res) => {
  res.json(createResponse({ 
    internetRadioStations: {
      internetRadioStation: []
    }
  }));
});

app.get('/rest/createInternetRadioStation', authenticate, (req, res) => {
  const { name, streamUrl, homepageUrl } = req.query;
  res.json(createResponse({ 
    internetRadioStation: {
      id: 1,
      name: name,
      streamUrl: streamUrl,
      homepageUrl: homepageUrl
    }
  }));
});

app.get('/rest/updateInternetRadioStation', authenticate, (req, res) => {
  const { id, name, streamUrl, homepageUrl } = req.query;
  res.json(createResponse({}));
});

app.get('/rest/deleteInternetRadioStation', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({}));
});

// 聊天接口
app.get('/rest/getChatMessages', authenticate, (req, res) => {
  const { since } = req.query;
  res.json(createResponse({ 
    chatMessages: {
      chatMessage: []
    }
  }));
});

app.get('/rest/addChatMessage', authenticate, (req, res) => {
  const { message } = req.query;
  res.json(createResponse({}));
});

// 用户管理接口
app.get('/rest/getUser', authenticate, (req, res) => {
  const { username } = req.query;
  res.json(createResponse({ 
    user: {
      username: username,
      email: 'user@example.com',
      scrobblingEnabled: false,
      adminRole: false,
      settingsRole: false,
      downloadRole: true,
      uploadRole: false,
      playlistRole: true,
      coverArtRole: true,
      commentRole: false,
      podcastRole: true,
      streamRole: true,
      jukeboxRole: false,
      shareRole: false,
      videoConversionRole: false,
      musicFolderRole: false,
      chatRole: false,
      radioRole: false
    }
  }));
});

app.get('/rest/getUsers', authenticate, (req, res) => {
  res.json(createResponse({ 
    users: {
      user: [
        {
          username: 'admin',
          email: 'admin@example.com',
          scrobblingEnabled: false,
          adminRole: true,
          settingsRole: true,
          downloadRole: true,
          uploadRole: true,
          playlistRole: true,
          coverArtRole: true,
          commentRole: true,
          podcastRole: true,
          streamRole: true,
          jukeboxRole: true,
          shareRole: true,
          videoConversionRole: true,
          musicFolderRole: true,
          chatRole: true,
          radioRole: true
        }
      ]
    }
  }));
});

app.get('/rest/createUser', authenticate, (req, res) => {
  const { username, password, email, ldapAuthenticated, adminRole, settingsRole, downloadRole, uploadRole, playlistRole, coverArtRole, commentRole, podcastRole, streamRole, jukeboxRole, shareRole, videoConversionRole, musicFolderRole, chatRole, radioRole } = req.query;
  res.json(createResponse({}));
});

app.get('/rest/updateUser', authenticate, (req, res) => {
  const { username, password, email, ldapAuthenticated, adminRole, settingsRole, downloadRole, uploadRole, playlistRole, coverArtRole, commentRole, podcastRole, streamRole, jukeboxRole, shareRole, videoConversionRole, musicFolderRole, chatRole, radioRole } = req.query;
  res.json(createResponse({}));
});

app.get('/rest/deleteUser', authenticate, (req, res) => {
  const { username } = req.query;
  res.json(createResponse({}));
});

app.get('/rest/changePassword', authenticate, (req, res) => {
  const { username, oldPassword, newPassword } = req.query;
  res.json(createResponse({}));
});

// 书签接口
app.get('/rest/getBookmarks', authenticate, (req, res) => {
  res.json(createResponse({ 
    bookmarks: {
      bookmark: []
    }
  }));
});

app.get('/rest/createBookmark', authenticate, (req, res) => {
  const { id, position, comment } = req.query;
  res.json(createResponse({ 
    bookmark: {
      id: id,
      position: position,
      comment: comment
    }
  }));
});

app.get('/rest/deleteBookmark', authenticate, (req, res) => {
  const { id } = req.query;
  res.json(createResponse({}));
});

app.get('/rest/getPlayQueue', authenticate, (req, res) => {
  res.json(createResponse({ 
    playQueue: {
      entry: []
    }
  }));
});

app.get('/rest/savePlayQueue', authenticate, (req, res) => {
  const { id, position } = req.query;
  res.json(createResponse({}));
});

// 媒体库扫描接口
app.get('/rest/getScanStatus', authenticate, (req, res) => {
  res.json(createResponse({ 
    scanStatus: {
      scanning: false,
      count: 0,
      scanned: 0
    }
  }));
});

app.get('/rest/startScan', authenticate, (req, res) => {
  res.json(createResponse({}));
});

// 上传音乐文件
app.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  
  try {
    // 提取音频文件的元数据
    const metadata = await mm.parseFile(req.file.path);
    
    // 使用提取的元数据或用户提供的数据
    const title = req.body.title || metadata.common.title || path.basename(req.file.filename, path.extname(req.file.filename));
    const artist = req.body.artist || metadata.common.artists?.[0] || '未知艺术家';
    const album = req.body.album || metadata.common.album || '未知专辑';
    const format = req.body.format || path.extname(req.file.filename).substring(1).toUpperCase();
    const encoding = req.body.encoding || '未知编码';
    const track = req.body.track || metadata.common.track?.no || 1;
    const duration = req.body.duration || Math.round(metadata.format.duration || 0);
    const quality = req.body.quality || '未知音质';
    
    // 提取专辑封面
    let coverArt = null;
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      // 提取文件扩展名，从 'image/jpeg' 中提取 'jpeg'
      const format = picture.format.split('/')[1] || 'jpg';
      const coverPath = path.join(__dirname, 'music', `${Date.now()}-cover.${format}`);
      fs.writeFileSync(coverPath, picture.data);
      coverArt = path.relative(__dirname, coverPath);
      console.log('Extracted cover art:', coverArt);
    }
    
    // 查找或创建艺术家
    db.get(`SELECT id FROM artists WHERE name = ?`, [artist], (err, artistRow) => {
      if (err) {
        res.status(500).json({ error: 'Failed to query artist' });
        return;
      }
      
      let artistId;
      
      if (artistRow) {
        artistId = artistRow.id;
        processAlbum();
      } else {
        db.run(`INSERT INTO artists (name) VALUES (?)`, [artist], function(err) {
          if (err) {
            res.status(500).json({ error: 'Failed to create artist' });
            return;
          }
          artistId = this.lastID;
          processAlbum();
        });
      }
      
      function processAlbum() {
        // 查找或创建专辑
        db.get(`SELECT id FROM albums WHERE title = ? AND artist_id = ?`, [album, artistId], (err, albumRow) => {
          if (err) {
            res.status(500).json({ error: 'Failed to query album' });
            return;
          }
          
          let albumId;
          
          if (albumRow) {
            albumId = albumRow.id;
            // 如果有封面，更新专辑封面
            if (coverArt) {
              db.run(`UPDATE albums SET cover_art = ? WHERE id = ?`, [coverArt, albumId], (err) => {
                if (err) {
                  console.error('Error updating album cover:', err);
                }
                processSong();
              });
            } else {
              processSong();
            }
          } else {
            db.run(`INSERT INTO albums (title, artist_id, cover_art) VALUES (?, ?, ?)`, [album, artistId, coverArt], function(err) {
              if (err) {
                res.status(500).json({ error: 'Failed to create album' });
                return;
              }
              albumId = this.lastID;
              processSong();
            });
          }
          
          function processSong() {
            // 创建歌曲记录
            const relativePath = path.relative(__dirname, req.file.path);
            db.run(`
              INSERT INTO songs (title, artist_id, album_id, file_path, format, encoding, track, duration, quality)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [title, artistId, albumId, relativePath, format, encoding, track, duration, quality], (err) => {
              if (err) {
                console.error('Error creating song:', err);
                res.status(500).json({ error: 'Failed to create song: ' + err.message });
                return;
              }
              
              res.json({ 
                success: true, 
                message: 'File uploaded successfully',
                metadata: {
                  title,
                  artist,
                  album,
                  format,
                  encoding,
                  track,
                  duration,
                  quality
                }
              });
            });
          }
        });
      }
    });
  } catch (error) {
    console.error('Error extracting metadata:', error);
    // 如果提取元数据失败，使用用户提供的数据
    const { title, artist, album, format, encoding, track, duration, quality } = req.body;
    let coverArt = null;
    
    if (!title || !artist || !album) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    
    // 查找或创建艺术家
    db.get(`SELECT id FROM artists WHERE name = ?`, [artist], (err, artistRow) => {
      if (err) {
        res.status(500).json({ error: 'Failed to query artist' });
        return;
      }
      
      let artistId;
      
      if (artistRow) {
        artistId = artistRow.id;
        processAlbum();
      } else {
        db.run(`INSERT INTO artists (name) VALUES (?)`, [artist], function(err) {
          if (err) {
            res.status(500).json({ error: 'Failed to create artist' });
            return;
          }
          artistId = this.lastID;
          processAlbum();
        });
      }
      
      function processAlbum() {
        // 查找或创建专辑
        db.get(`SELECT id FROM albums WHERE title = ? AND artist_id = ?`, [album, artistId], (err, albumRow) => {
          if (err) {
            res.status(500).json({ error: 'Failed to query album' });
            return;
          }
          
          let albumId;
          
          if (albumRow) {
            albumId = albumRow.id;
            // 如果有封面，更新专辑封面
            if (coverArt) {
              db.run(`UPDATE albums SET cover_art = ? WHERE id = ?`, [coverArt, albumId], (err) => {
                if (err) {
                  console.error('Error updating album cover:', err);
                }
                processSong();
              });
            } else {
              processSong();
            }
          } else {
            db.run(`INSERT INTO albums (title, artist_id, cover_art) VALUES (?, ?, ?)`, [album, artistId, coverArt], function(err) {
              if (err) {
                res.status(500).json({ error: 'Failed to create album' });
                return;
              }
              albumId = this.lastID;
              processSong();
            });
          }
          
          function processSong() {
            // 创建歌曲记录
            const relativePath = path.relative(__dirname, req.file.path);
            db.run(`
              INSERT INTO songs (title, artist_id, album_id, file_path, format, encoding, track, duration, quality)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [title, artistId, albumId, relativePath, format, encoding, track, duration, quality], (err) => {
              if (err) {
                console.error('Error creating song:', err);
                res.status(500).json({ error: 'Failed to create song: ' + err.message });
                return;
              }
              
              res.json({ 
                success: true, 
                message: 'File uploaded successfully (metadata extraction failed, used provided data)',
                metadata: {
                  title,
                  artist,
                  album,
                  format,
                  encoding,
                  track,
                  duration,
                  quality
                }
              });
            });
          }
        });
      }
    });
  }
});

// 手动触发音乐同步
app.get('/rest/syncMusic', authenticate, (req, res) => {
  sync.syncMusicFiles()
    .then(() => {
      res.json(createResponse({}));
    })
    .catch(error => {
      res.status(500).json(createResponse({ error: { code: 0, message: error.message } }, 'failed'));
    });
});

// 启动服务器
app.listen(port, () => {
  console.log(`音乐服务器运行在 http://localhost:${port}`);
  // 等待数据库初始化完成后再启动同步
  setTimeout(() => {
    sync.init();
  }, 1000);
});