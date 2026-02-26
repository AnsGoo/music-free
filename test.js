const http = require('http');
const fs = require('fs');
const path = require('path');

// 测试配置
const baseUrl = 'http://localhost:4040';
const authParams = 'u=admin&p=admin';

// 测试结果
const testResults = [];

// 测试函数
function testApi(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}${authParams}`;
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data && method === 'POST') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 运行测试
async function runTests() {
  console.log('开始测试音乐服务器接口...');

  // 1. 测试系统接口
  console.log('\n1. 测试系统接口');
  try {
    const response = await testApi('/rest/ping');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'ping', status: 'PASS' });
      console.log('✓ ping接口测试通过');
    } else {
      testResults.push({ test: 'ping', status: 'FAIL' });
      console.log('✗ ping接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'ping', status: 'ERROR', error: error.message });
    console.log('✗ ping接口测试错误:', error.message);
  }

  // 2. 测试艺术家接口
  console.log('\n2. 测试艺术家接口');
  try {
    const response = await testApi('/rest/getArtists');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getArtists', status: 'PASS' });
      console.log('✓ getArtists接口测试通过');
    } else {
      testResults.push({ test: 'getArtists', status: 'FAIL' });
      console.log('✗ getArtists接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getArtists', status: 'ERROR', error: error.message });
    console.log('✗ getArtists接口测试错误:', error.message);
  }

  // 3. 测试专辑接口
  console.log('\n3. 测试专辑接口');
  try {
    const response = await testApi('/rest/getAlbumList?type=newest&size=10');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getAlbumList', status: 'PASS' });
      console.log('✓ getAlbumList接口测试通过');
    } else {
      testResults.push({ test: 'getAlbumList', status: 'FAIL' });
      console.log('✗ getAlbumList接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getAlbumList', status: 'ERROR', error: error.message });
    console.log('✗ getAlbumList接口测试错误:', error.message);
  }

  // 4. 测试音乐接口
  console.log('\n4. 测试音乐接口');
  try {
    const response = await testApi('/rest/getIndexes');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getIndexes', status: 'PASS' });
      console.log('✓ getIndexes接口测试通过');
    } else {
      testResults.push({ test: 'getIndexes', status: 'FAIL' });
      console.log('✗ getIndexes接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getIndexes', status: 'ERROR', error: error.message });
    console.log('✗ getIndexes接口测试错误:', error.message);
  }

  // 5. 测试搜索接口
  console.log('\n5. 测试搜索接口');
  try {
    const response = await testApi('/rest/search3?query=test&songCount=5&albumCount=5&artistCount=5');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'search3', status: 'PASS' });
      console.log('✓ search3接口测试通过');
    } else {
      testResults.push({ test: 'search3', status: 'FAIL' });
      console.log('✗ search3接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'search3', status: 'ERROR', error: error.message });
    console.log('✗ search3接口测试错误:', error.message);
  }

  // 6. 测试歌单接口
  console.log('\n6. 测试歌单接口');
  try {
    const response = await testApi('/rest/getPlaylists');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getPlaylists', status: 'PASS' });
      console.log('✓ getPlaylists接口测试通过');
    } else {
      testResults.push({ test: 'getPlaylists', status: 'FAIL' });
      console.log('✗ getPlaylists接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getPlaylists', status: 'ERROR', error: error.message });
    console.log('✗ getPlaylists接口测试错误:', error.message);
  }

  // 7. 测试创建歌单接口
  console.log('\n7. 测试创建歌单接口');
  try {
    const response = await testApi('/rest/createPlaylist?name=测试歌单');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'createPlaylist', status: 'PASS' });
      console.log('✓ createPlaylist接口测试通过');
    } else {
      testResults.push({ test: 'createPlaylist', status: 'FAIL' });
      console.log('✗ createPlaylist接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'createPlaylist', status: 'ERROR', error: error.message });
    console.log('✗ createPlaylist接口测试错误:', error.message);
  }

  // 8. 测试上传接口（这里只是测试接口是否存在，实际上传需要文件）
  console.log('\n8. 测试上传接口');
  try {
    // 由于上传需要文件，这里只是测试接口是否能响应
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const url = `${baseUrl}/upload?${authParams}`;
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (jsonData.error === 'No file uploaded') {
            testResults.push({ test: 'upload', status: 'PASS' });
            console.log('✓ upload接口测试通过');
          } else {
            testResults.push({ test: 'upload', status: 'FAIL' });
            console.log('✗ upload接口测试失败');
          }
        } catch (error) {
          testResults.push({ test: 'upload', status: 'ERROR', error: error.message });
          console.log('✗ upload接口测试错误:', error.message);
        }
      });
    });

    req.on('error', (error) => {
      testResults.push({ test: 'upload', status: 'ERROR', error: error.message });
      console.log('✗ upload接口测试错误:', error.message);
    });

    req.write('title=Test Song&artist=Test Artist&album=Test Album');
    req.end();
  } catch (error) {
    testResults.push({ test: 'upload', status: 'ERROR', error: error.message });
    console.log('✗ upload接口测试错误:', error.message);
  }

  // 输出测试结果
  console.log('\n=== 测试结果汇总 ===');
  testResults.forEach(result => {
    console.log(`${result.test}: ${result.status}${result.error ? ` - ${result.error}` : ''}`);
  });

  const passedTests = testResults.filter(result => result.status === 'PASS').length;
  const totalTests = testResults.length;
  console.log(`\n测试完成: ${passedTests}/${totalTests} 个接口测试通过`);
}

// 运行测试
runTests().catch(error => {
  console.error('测试过程中出现错误:', error);
});