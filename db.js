const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// 确保音乐文件目录存在
const musicDir = path.join(__dirname, 'music');
if (!fs.existsSync(musicDir)) {
  fs.mkdirSync(musicDir);
}

// 数据库文件路径
const dbPath = path.join(dataDir, 'music.db');

// 全局数据库对象
let db;

// 初始化数据库
async function initDB() {
  try {
    // 加载SQL.js
    const SQL = await initSqlJs();
    
    // 读取数据库文件或创建新数据库
    let dbBuffer;
    if (fs.existsSync(dbPath)) {
      dbBuffer = fs.readFileSync(dbPath);
    } else {
      dbBuffer = new Uint8Array();
    }
    
    // 创建数据库实例
    db = new SQL.Database(dbBuffer);
    
    // 初始化表结构
    await initTables();
    
    console.log('成功连接到数据库');
  } catch (error) {
    console.error('连接数据库失败:', error.message);
  }
}

// 保存数据库到文件
function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// 初始化表结构
function initTables() {
  // 创建艺术家表
  db.run(`
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT,
      nationality TEXT,
      bio TEXT
    )
  `);

  // 创建专辑表
  db.run(`
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist_id INTEGER,
      release_date TEXT,
      cover_art TEXT,
      FOREIGN KEY (artist_id) REFERENCES artists(id)
    )
  `);

  // 创建音乐表
  db.run(`
    CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist_id INTEGER,
      album_id INTEGER,
      file_path TEXT NOT NULL,
      format TEXT,
      encoding TEXT,
      track INTEGER,
      duration INTEGER,
      quality TEXT,
      FOREIGN KEY (artist_id) REFERENCES artists(id),
      FOREIGN KEY (album_id) REFERENCES albums(id)
    )
  `);

  // 创建歌单表
  db.run(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建歌单歌曲关联表
  db.run(`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER,
      song_id INTEGER,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id),
      FOREIGN KEY (song_id) REFERENCES songs(id)
    )
  `);

  // 创建用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  // 插入默认用户
  db.run(`
    INSERT OR IGNORE INTO users (username, password) VALUES ('admin', 'admin')
  `);

  // 保存数据库
  saveDB();
}

// 包装数据库方法，使其与sqlite3 API兼容
const dbWrapper = {
  run: function(sql, params, callback) {
    try {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      // 处理参数化查询
      let processedSql = sql;
      if (params && params.length > 0) {
        let index = 0;
        processedSql = processedSql.replace(/\?/g, (match) => {
          if (index < params.length) {
            const param = params[index++];
            if (typeof param === 'string') {
              return `'${param}'`;
            } else {
              return param;
            }
          }
          return match;
        });
      }
      db.exec(processedSql);
      saveDB();
      if (callback) callback(null);
    } catch (error) {
      if (callback) callback(error);
    }
  },
  get: function(sql, params, callback) {
    try {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      // 处理参数化查询
      let processedSql = sql;
      if (params && params.length > 0) {
        let index = 0;
        processedSql = processedSql.replace(/\?/g, (match) => {
          if (index < params.length) {
            const param = params[index++];
            if (typeof param === 'string') {
              return `'${param}'`;
            } else {
              return param;
            }
          }
          return match;
        });
      }
      const result = db.exec(processedSql);
      if (result && result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const values = result[0].values[0];
        const row = {};
        columns.forEach((col, index) => {
          row[col] = values[index];
        });
        if (callback) callback(null, row);
      } else {
        if (callback) callback(null, null);
      }
    } catch (error) {
      if (callback) callback(error);
    }
  },
  all: function(sql, params, callback) {
    try {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      // 处理参数化查询
      let processedSql = sql;
      if (params && params.length > 0) {
        let index = 0;
        processedSql = processedSql.replace(/\?/g, (match) => {
          if (index < params.length) {
            const param = params[index++];
            if (typeof param === 'string') {
              return `'${param}'`;
            } else {
              return param;
            }
          }
          return match;
        });
      }
      const result = db.exec(processedSql);
      if (result && result.length > 0) {
        const columns = result[0].columns;
        const rows = result[0].values.map(values => {
          const row = {};
          columns.forEach((col, index) => {
            row[col] = values[index];
          });
          return row;
        });
        if (callback) callback(null, rows);
      } else {
        if (callback) callback(null, []);
      }
    } catch (error) {
      if (callback) callback(error);
    }
  }
};

// 初始化数据库
initDB();

module.exports = dbWrapper;