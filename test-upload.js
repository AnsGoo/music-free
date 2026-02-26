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

// 测试上传接口
function testUpload() {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, '阿梨粤-晚风心里吹.mp3');
    if (!fs.existsSync(filePath)) {
      reject(new Error('音乐文件不存在'));
      return;
    }

    const boundary = '--------------------------' + Date.now().toString(16);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
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
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // 构建multipart/form-data请求体
    const fileContent = fs.readFileSync(filePath);
    const formData = `
--${boundary}
Content-Disposition: form-data; name="file"; filename="阿梨粤-晚风心里吹.mp3"
Content-Type: audio/mpeg

${fileContent}
--${boundary}
Content-Disposition: form-data; name="title"

晚风心里吹
--${boundary}
Content-Disposition: form-data; name="artist"

阿梨粤
--${boundary}
Content-Disposition: form-data; name="album"

晚风心里吹
--${boundary}
Content-Disposition: form-data; name="format"

mp3
--${boundary}
Content-Disposition: form-data; name="encoding"

MP3
--${boundary}
Content-Disposition: form-data; name="track"

1
--${boundary}
Content-Disposition: form-data; name="duration"

240
--${boundary}
Content-Disposition: form-data; name="quality"

320kbps
--${boundary}--
`;

    req.write(formData);
    req.end();
  });
}

// 运行测试
async function runTests() {
  console.log('开始测试音乐服务器接口...');

  // 1. 测试上传接口
  console.log('\n1. 测试上传接口');
  try {
    const response = await testUpload();
    if (response.success) {
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

  // 2. 测试搜索接口
  console.log('\n2. 测试搜索接口');
  try {
    const response = await testApi('/rest/search3?query=晚风&songCount=5&albumCount=5&artistCount=5');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'search3', status: 'PASS' });
      console.log('✓ search3接口测试通过');
      // 打印搜索结果
      const result = response['subsonic-response'].searchResult3;
      if (result.song && result.song.length > 0) {
        console.log('  找到歌曲:', result.song.map(s => s.title).join(', '));
      }
      if (result.album && result.album.length > 0) {
        console.log('  找到专辑:', result.album.map(a => a.name).join(', '));
      }
      if (result.artist && result.artist.length > 0) {
        console.log('  找到艺术家:', result.artist.map(a => a.name).join(', '));
      }
    } else {
      testResults.push({ test: 'search3', status: 'FAIL' });
      console.log('✗ search3接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'search3', status: 'ERROR', error: error.message });
    console.log('✗ search3接口测试错误:', error.message);
  }

  // 3. 测试获取艺术家列表
  console.log('\n3. 测试获取艺术家列表');
  try {
    const response = await testApi('/rest/getArtists');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getArtists', status: 'PASS' });
      console.log('✓ getArtists接口测试通过');
      // 打印艺术家列表
      const artists = response['subsonic-response'].artists.artist;
      if (artists.length > 0) {
        console.log('  艺术家列表:', artists.map(a => a.name).join(', '));
      }
    } else {
      testResults.push({ test: 'getArtists', status: 'FAIL' });
      console.log('✗ getArtists接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getArtists', status: 'ERROR', error: error.message });
    console.log('✗ getArtists接口测试错误:', error.message);
  }

  // 4. 测试获取专辑列表
  console.log('\n4. 测试获取专辑列表');
  try {
    const response = await testApi('/rest/getAlbumList?type=newest&size=10');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getAlbumList', status: 'PASS' });
      console.log('✓ getAlbumList接口测试通过');
      // 打印专辑列表
      const albums = response['subsonic-response'].albumList.album;
      if (albums.length > 0) {
        console.log('  专辑列表:', albums.map(a => a.name).join(', '));
      }
    } else {
      testResults.push({ test: 'getAlbumList', status: 'FAIL' });
      console.log('✗ getAlbumList接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getAlbumList', status: 'ERROR', error: error.message });
    console.log('✗ getAlbumList接口测试错误:', error.message);
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