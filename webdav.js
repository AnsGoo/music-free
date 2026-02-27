const fs = require('fs');
const path = require('path');
const { createClient } = require('webdav');

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
    ...config
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
  // 确保用户名和密码是字符串且正确编码
  const username = String(config.username || '');
  const password = String(config.password || '');
  
  // 使用默认方式创建客户端
  return createClient(config.url, {
    username: username,
    password: password
  });
}

// 获取WebDAV文件列表
async function getWebdavFiles(config, remotePath = '/') {
  try {
    const client = createWebdavClient(config);
    const remoteFiles = await client.getDirectoryContents(remotePath);
    
    return remoteFiles.map(item => ({
      type: item.type,
      filename: item.filename,
      basename: path.basename(item.filename),
      path: item.filename
    }));
  } catch (error) {
    console.error(`Error getting WebDAV files from ${config.url}:`, error);
    return [];
  }
}

// 获取WebDAV文件流
async function getWebdavFileStream(config, remotePath) {
  try {
    const client = createWebdavClient(config);
    const stream = await client.createReadStream(remotePath);
    return stream;
  } catch (error) {
    console.error(`Error getting WebDAV file stream from ${config.url}:`, error);
    throw error;
  }
}

// 初始化
function init() {
  loadWebdavConfig();
  console.log('WebDAV module initialized');
}

module.exports = {
  init,
  addWebdavConfig,
  removeWebdavConfig,
  getWebdavConfig,
  getWebdavFiles,
  getWebdavFileStream
};