const fs = require('fs');
const path = require('path');
const { createClient } = require('webdav');
const schedule = require('node-schedule');

// 音乐目录路径
const MUSIC_DIR = path.join(__dirname, 'music');

// WebDAV配置存储
let webdavConfig = [];

// 加载WebDAV配置
function loadWebdavConfig() {
  const configPath = path.join(__dirname, 'webdav-config.json');
  try {
    if (fs.existsSync(configPath)) {
      const config = fs.readFileSync(configPath, 'utf8');
      webdavConfig = JSON.parse(config);
      console.log(`Loaded ${webdavConfig.length} WebDAV configurations`);
    }
  } catch (error) {
    console.error('Error loading WebDAV config:', error);
    webdavConfig = [];
  }
}

// 保存WebDAV配置
function saveWebdavConfig() {
  const configPath = path.join(__dirname, 'webdav-config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(webdavConfig, null, 2));
    console.log('WebDAV config saved');
  } catch (error) {
    console.error('Error saving WebDAV config:', error);
  }
}

// 添加WebDAV配置
function addWebdavConfig(config) {
  // 验证配置
  if (!config.url || !config.username || !config.password) {
    throw new Error('WebDAV config must include url, username, and password');
  }
  
  // 生成唯一ID
  const id = Date.now().toString();
  const newConfig = {
    id,
    ...config,
    lastSync: null
  };
  
  webdavConfig.push(newConfig);
  saveWebdavConfig();
  return newConfig;
}

// 删除WebDAV配置
function removeWebdavConfig(id) {
  webdavConfig = webdavConfig.filter(config => config.id !== id);
  saveWebdavConfig();
  return true;
}

// 获取WebDAV配置列表
function getWebdavConfig() {
  return webdavConfig;
}

// 创建WebDAV客户端
function createWebdavClient(config) {
  return createClient(config.url, {
    username: config.username,
    password: config.password
  });
}

// 同步单个WebDAV目录
async function syncWebdavDirectory(config) {
  try {
    console.log(`Syncing WebDAV directory: ${config.url}`);
    
    const client = createWebdavClient(config);
    const remoteFiles = await client.getDirectoryContents('/');
    
    // 创建本地挂载目录
    const mountDir = path.join(MUSIC_DIR, `webdav-${config.id}`);
    if (!fs.existsSync(mountDir)) {
      fs.mkdirSync(mountDir, { recursive: true });
    }
    
    // 同步文件
    for (const item of remoteFiles) {
      if (item.type === 'file' && /\.(mp3|wav|flac|ogg)$/i.test(item.filename)) {
        const localPath = path.join(mountDir, item.filename);
        console.log(`Downloading ${item.filename} from ${config.url}`);
        
        // 下载文件
        const stream = await client.createReadStream(item.filename);
        const writeStream = fs.createWriteStream(localPath);
        
        await new Promise((resolve, reject) => {
          stream.pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
        });
      }
    }
    
    // 更新同步时间
    config.lastSync = new Date().toISOString();
    saveWebdavConfig();
    console.log(`WebDAV directory synced: ${config.url}`);
  } catch (error) {
    console.error(`Error syncing WebDAV directory ${config.url}:`, error);
  }
}

// 同步所有WebDAV目录
async function syncAllWebdavDirectories() {
  console.log('Starting WebDAV sync...');
  
  for (const config of webdavConfig) {
    await syncWebdavDirectory(config);
  }
  
  console.log('WebDAV sync completed');
}

// 启动WebDAV同步定时任务
function startWebdavSyncSchedule() {
  // 每30分钟同步一次
  const job = schedule.scheduleJob('*/30 * * * *', syncAllWebdavDirectories);
  console.log('WebDAV sync schedule started (every 30 minutes)');
  
  // 立即执行一次同步
  syncAllWebdavDirectories();
  
  return job;
}

// 初始化
function init() {
  loadWebdavConfig();
  startWebdavSyncSchedule();
}

module.exports = {
  init,
  addWebdavConfig,
  removeWebdavConfig,
  getWebdavConfig,
  syncAllWebdavDirectories,
  syncWebdavDirectory
};