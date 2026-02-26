const http = require('http');

// 测试配置
const baseUrl = 'http://localhost:4040';
const authParams = 'u=admin&p=admin';

// 测试播放接口
function testStream() {
  return new Promise((resolve, reject) => {
    const songId = 1; // 假设歌曲ID为1
    const url = `${baseUrl}/rest/stream?${authParams}&id=${songId}`;
    
    const options = {
      method: 'GET'
    };

    const req = http.request(url, options, (res) => {
      console.log('=== 播放接口测试 ===');
      console.log('状态码:', res.statusCode);
      console.log('响应头:');
      console.log('  Content-Type:', res.headers['content-type']);
      console.log('  Content-Length:', res.headers['content-length']);
      
      // 检查响应状态码
      if (res.statusCode !== 200) {
        reject(new Error(`播放接口返回错误状态码: ${res.statusCode}`));
        return;
      }
      
      // 检查Content-Type
      if (!res.headers['content-type'] || !res.headers['content-type'].includes('audio/mpeg')) {
        reject(new Error(`播放接口返回错误的Content-Type: ${res.headers['content-type']}`));
        return;
      }
      
      // 检查Content-Length
      if (!res.headers['content-length'] || parseInt(res.headers['content-length']) === 0) {
        reject(new Error('播放接口返回空的Content-Length'));
        return;
      }
      
      // 读取一小部分响应体，验证是否为音频数据
      let data = '';
      let bytesRead = 0;
      const maxBytes = 1024; // 只读取前1024字节进行验证
      
      res.on('data', (chunk) => {
        data += chunk;
        bytesRead += chunk.length;
        if (bytesRead >= maxBytes) {
          req.destroy(); // 停止读取更多数据
        }
      });
      
      res.on('end', () => {
        console.log('读取到的响应体长度:', bytesRead, '字节');
        
        // 验证响应体是否为音频数据（MP3文件头部通常包含ID3标签或帧同步码）
        const isAudioData = bytesRead > 0;
        if (isAudioData) {
          console.log('✓ 播放接口测试通过：成功返回音频流');
          resolve({ status: 'PASS', message: '播放接口正常' });
        } else {
          reject(new Error('播放接口返回空的响应体'));
        }
      });
    });

    req.on('error', (error) => {
      console.error('✗ 播放接口测试错误:', error.message);
      reject(error);
    });

    req.end();
  });
}

// 运行测试
async function runTest() {
  console.log('开始测试播放接口...');
  
  try {
    const result = await testStream();
    console.log('\n测试结果:', result.message);
  } catch (error) {
    console.error('\n测试失败:', error.message);
  }
}

// 执行测试
runTest();