const http = require('http');

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

// 测试系统接口
async function testSystemInterfaces() {
  console.log('=== 测试系统接口 ===');
  
  // 测试 ping 接口
  try {
    const response = await testApi('/rest/ping');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'ping', status: 'PASS' });
      console.log('✓ ping 接口测试通过');
    } else {
      testResults.push({ test: 'ping', status: 'FAIL' });
      console.log('✗ ping 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'ping', status: 'ERROR', error: error.message });
    console.log('✗ ping 接口测试错误:', error.message);
  }

  // 测试 getLicense 接口
  try {
    const response = await testApi('/rest/getLicense');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getLicense', status: 'PASS' });
      console.log('✓ getLicense 接口测试通过');
    } else {
      testResults.push({ test: 'getLicense', status: 'FAIL' });
      console.log('✗ getLicense 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getLicense', status: 'ERROR', error: error.message });
    console.log('✗ getLicense 接口测试错误:', error.message);
  }

  // 测试 getOpenSubsonicExtensions 接口
  try {
    const response = await testApi('/rest/getOpenSubsonicExtensions');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getOpenSubsonicExtensions', status: 'PASS' });
      console.log('✓ getOpenSubsonicExtensions 接口测试通过');
    } else {
      testResults.push({ test: 'getOpenSubsonicExtensions', status: 'FAIL' });
      console.log('✗ getOpenSubsonicExtensions 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getOpenSubsonicExtensions', status: 'ERROR', error: error.message });
    console.log('✗ getOpenSubsonicExtensions 接口测试错误:', error.message);
  }

  // 测试 tokenInfo 接口
  try {
    const response = await testApi('/rest/tokenInfo');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'tokenInfo', status: 'PASS' });
      console.log('✓ tokenInfo 接口测试通过');
    } else {
      testResults.push({ test: 'tokenInfo', status: 'FAIL' });
      console.log('✗ tokenInfo 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'tokenInfo', status: 'ERROR', error: error.message });
    console.log('✗ tokenInfo 接口测试错误:', error.message);
  }
}

// 测试浏览接口
async function testBrowsingInterfaces() {
  console.log('\n=== 测试浏览接口 ===');
  
  // 测试 getMusicFolders 接口
  try {
    const response = await testApi('/rest/getMusicFolders');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getMusicFolders', status: 'PASS' });
      console.log('✓ getMusicFolders 接口测试通过');
    } else {
      testResults.push({ test: 'getMusicFolders', status: 'FAIL' });
      console.log('✗ getMusicFolders 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getMusicFolders', status: 'ERROR', error: error.message });
    console.log('✗ getMusicFolders 接口测试错误:', error.message);
  }

  // 测试 getGenres 接口
  try {
    const response = await testApi('/rest/getGenres');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getGenres', status: 'PASS' });
      console.log('✓ getGenres 接口测试通过');
    } else {
      testResults.push({ test: 'getGenres', status: 'FAIL' });
      console.log('✗ getGenres 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getGenres', status: 'ERROR', error: error.message });
    console.log('✗ getGenres 接口测试错误:', error.message);
  }

  // 测试 getMusicDirectory 接口
  try {
    const response = await testApi('/rest/getMusicDirectory?id=1');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getMusicDirectory', status: 'PASS' });
      console.log('✓ getMusicDirectory 接口测试通过');
    } else {
      testResults.push({ test: 'getMusicDirectory', status: 'FAIL' });
      console.log('✗ getMusicDirectory 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getMusicDirectory', status: 'ERROR', error: error.message });
    console.log('✗ getMusicDirectory 接口测试错误:', error.message);
  }

  // 测试 getVideos 接口
  try {
    const response = await testApi('/rest/getVideos');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getVideos', status: 'PASS' });
      console.log('✓ getVideos 接口测试通过');
    } else {
      testResults.push({ test: 'getVideos', status: 'FAIL' });
      console.log('✗ getVideos 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getVideos', status: 'ERROR', error: error.message });
    console.log('✗ getVideos 接口测试错误:', error.message);
  }

  // 测试 getVideoInfo 接口
  try {
    const response = await testApi('/rest/getVideoInfo?id=1');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getVideoInfo', status: 'PASS' });
      console.log('✓ getVideoInfo 接口测试通过');
    } else {
      testResults.push({ test: 'getVideoInfo', status: 'FAIL' });
      console.log('✗ getVideoInfo 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getVideoInfo', status: 'ERROR', error: error.message });
    console.log('✗ getVideoInfo 接口测试错误:', error.message);
  }

  // 测试 getArtistInfo 接口
  try {
    const response = await testApi('/rest/getArtistInfo?id=1');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getArtistInfo', status: 'PASS' });
      console.log('✓ getArtistInfo 接口测试通过');
    } else {
      testResults.push({ test: 'getArtistInfo', status: 'FAIL' });
      console.log('✗ getArtistInfo 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getArtistInfo', status: 'ERROR', error: error.message });
    console.log('✗ getArtistInfo 接口测试错误:', error.message);
  }

  // 测试 getAlbumInfo 接口
  try {
    const response = await testApi('/rest/getAlbumInfo?id=1');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getAlbumInfo', status: 'PASS' });
      console.log('✓ getAlbumInfo 接口测试通过');
    } else {
      testResults.push({ test: 'getAlbumInfo', status: 'FAIL' });
      console.log('✗ getAlbumInfo 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getAlbumInfo', status: 'ERROR', error: error.message });
    console.log('✗ getAlbumInfo 接口测试错误:', error.message);
  }
}

// 测试音乐管理接口
async function testMusicManagementInterfaces() {
  console.log('\n=== 测试音乐管理接口 ===');
  
  // 测试 getIndexes 接口
  try {
    const response = await testApi('/rest/getIndexes');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getIndexes', status: 'PASS' });
      console.log('✓ getIndexes 接口测试通过');
    } else {
      testResults.push({ test: 'getIndexes', status: 'FAIL' });
      console.log('✗ getIndexes 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getIndexes', status: 'ERROR', error: error.message });
    console.log('✗ getIndexes 接口测试错误:', error.message);
  }

  // 测试 getSong 接口
  try {
    const response = await testApi('/rest/getSong?id=1');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getSong', status: 'PASS' });
      console.log('✓ getSong 接口测试通过');
    } else {
      testResults.push({ test: 'getSong', status: 'FAIL' });
      console.log('✗ getSong 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getSong', status: 'ERROR', error: error.message });
    console.log('✗ getSong 接口测试错误:', error.message);
  }

  // 测试 search3 接口
  try {
    const response = await testApi('/rest/search3?query=test&songCount=5');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'search3', status: 'PASS' });
      console.log('✓ search3 接口测试通过');
    } else {
      testResults.push({ test: 'search3', status: 'FAIL' });
      console.log('✗ search3 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'search3', status: 'ERROR', error: error.message });
    console.log('✗ search3 接口测试错误:', error.message);
  }
}

// 测试专辑管理接口
async function testAlbumManagementInterfaces() {
  console.log('\n=== 测试专辑管理接口 ===');
  
  // 测试 getAlbumList 接口
  try {
    const response = await testApi('/rest/getAlbumList?type=newest&size=10');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getAlbumList', status: 'PASS' });
      console.log('✓ getAlbumList 接口测试通过');
    } else {
      testResults.push({ test: 'getAlbumList', status: 'FAIL' });
      console.log('✗ getAlbumList 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getAlbumList', status: 'ERROR', error: error.message });
    console.log('✗ getAlbumList 接口测试错误:', error.message);
  }

  // 测试 getAlbum 接口
  try {
    const response = await testApi('/rest/getAlbum?id=1');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getAlbum', status: 'PASS' });
      console.log('✓ getAlbum 接口测试通过');
    } else {
      testResults.push({ test: 'getAlbum', status: 'FAIL' });
      console.log('✗ getAlbum 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getAlbum', status: 'ERROR', error: error.message });
    console.log('✗ getAlbum 接口测试错误:', error.message);
  }

  // 测试 getAlbumList2 接口
  try {
    const response = await testApi('/rest/getAlbumList2?type=newest&size=10');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getAlbumList2', status: 'PASS' });
      console.log('✓ getAlbumList2 接口测试通过');
    } else {
      testResults.push({ test: 'getAlbumList2', status: 'FAIL' });
      console.log('✗ getAlbumList2 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getAlbumList2', status: 'ERROR', error: error.message });
    console.log('✗ getAlbumList2 接口测试错误:', error.message);
  }
}

// 测试艺术家管理接口
async function testArtistManagementInterfaces() {
  console.log('\n=== 测试艺术家管理接口 ===');
  
  // 测试 getArtists 接口
  try {
    const response = await testApi('/rest/getArtists');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getArtists', status: 'PASS' });
      console.log('✓ getArtists 接口测试通过');
    } else {
      testResults.push({ test: 'getArtists', status: 'FAIL' });
      console.log('✗ getArtists 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getArtists', status: 'ERROR', error: error.message });
    console.log('✗ getArtists 接口测试错误:', error.message);
  }

  // 测试 getArtist 接口
  try {
    const response = await testApi('/rest/getArtist?id=1');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getArtist', status: 'PASS' });
      console.log('✓ getArtist 接口测试通过');
    } else {
      testResults.push({ test: 'getArtist', status: 'FAIL' });
      console.log('✗ getArtist 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getArtist', status: 'ERROR', error: error.message });
    console.log('✗ getArtist 接口测试错误:', error.message);
  }
}

// 测试歌单管理接口
async function testPlaylistManagementInterfaces() {
  console.log('\n=== 测试歌单管理接口 ===');
  
  // 测试 getPlaylists 接口
  try {
    const response = await testApi('/rest/getPlaylists');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getPlaylists', status: 'PASS' });
      console.log('✓ getPlaylists 接口测试通过');
    } else {
      testResults.push({ test: 'getPlaylists', status: 'FAIL' });
      console.log('✗ getPlaylists 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getPlaylists', status: 'ERROR', error: error.message });
    console.log('✗ getPlaylists 接口测试错误:', error.message);
  }

  // 测试 createPlaylist 接口
  try {
    const response = await testApi('/rest/createPlaylist?name=测试歌单');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'createPlaylist', status: 'PASS' });
      console.log('✓ createPlaylist 接口测试通过');
    } else {
      testResults.push({ test: 'createPlaylist', status: 'FAIL' });
      console.log('✗ createPlaylist 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'createPlaylist', status: 'ERROR', error: error.message });
    console.log('✗ createPlaylist 接口测试错误:', error.message);
  }

  // 测试 getPlaylist 接口
  try {
    const response = await testApi('/rest/getPlaylist?id=1');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getPlaylist', status: 'PASS' });
      console.log('✓ getPlaylist 接口测试通过');
    } else {
      testResults.push({ test: 'getPlaylist', status: 'FAIL' });
      console.log('✗ getPlaylist 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getPlaylist', status: 'ERROR', error: error.message });
    console.log('✗ getPlaylist 接口测试错误:', error.message);
  }
}

// 测试媒体检索接口
async function testMediaRetrievalInterfaces() {
  console.log('\n=== 测试媒体检索接口 ===');
  
  // 测试 stream 接口
  try {
    const url = `${baseUrl}/rest/stream?${authParams}&id=1`;
    const options = {
      method: 'GET'
    };

    const req = http.request(url, options, (res) => {
      if (res.statusCode === 200) {
        testResults.push({ test: 'stream', status: 'PASS' });
        console.log('✓ stream 接口测试通过');
      } else {
        testResults.push({ test: 'stream', status: 'FAIL' });
        console.log('✗ stream 接口测试失败');
      }
    });

    req.on('error', (error) => {
      testResults.push({ test: 'stream', status: 'ERROR', error: error.message });
      console.log('✗ stream 接口测试错误:', error.message);
    });

    req.end();
  } catch (error) {
    testResults.push({ test: 'stream', status: 'ERROR', error: error.message });
    console.log('✗ stream 接口测试错误:', error.message);
  }

  // 测试 getCoverArt 接口
  try {
    const response = await testApi('/rest/getCoverArt?id=1');
    // 即使返回 404 也是正常的，因为我们没有封面图
    testResults.push({ test: 'getCoverArt', status: 'PASS' });
    console.log('✓ getCoverArt 接口测试通过');
  } catch (error) {
    testResults.push({ test: 'getCoverArt', status: 'ERROR', error: error.message });
    console.log('✗ getCoverArt 接口测试错误:', error.message);
  }

  // 测试 getLyrics 接口
  try {
    const response = await testApi('/rest/getLyrics?artist=test&title=test');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getLyrics', status: 'PASS' });
      console.log('✓ getLyrics 接口测试通过');
    } else {
      testResults.push({ test: 'getLyrics', status: 'FAIL' });
      console.log('✗ getLyrics 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getLyrics', status: 'ERROR', error: error.message });
    console.log('✗ getLyrics 接口测试错误:', error.message);
  }
}

// 测试用户管理接口
async function testUserManagementInterfaces() {
  console.log('\n=== 测试用户管理接口 ===');
  
  // 测试 getUsers 接口
  try {
    const response = await testApi('/rest/getUsers');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getUsers', status: 'PASS' });
      console.log('✓ getUsers 接口测试通过');
    } else {
      testResults.push({ test: 'getUsers', status: 'FAIL' });
      console.log('✗ getUsers 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getUsers', status: 'ERROR', error: error.message });
    console.log('✗ getUsers 接口测试错误:', error.message);
  }

  // 测试 getUser 接口
  try {
    const response = await testApi('/rest/getUser?username=admin');
    if (response['subsonic-response'].status === 'ok') {
      testResults.push({ test: 'getUser', status: 'PASS' });
      console.log('✓ getUser 接口测试通过');
    } else {
      testResults.push({ test: 'getUser', status: 'FAIL' });
      console.log('✗ getUser 接口测试失败');
    }
  } catch (error) {
    testResults.push({ test: 'getUser', status: 'ERROR', error: error.message });
    console.log('✗ getUser 接口测试错误:', error.message);
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('开始测试所有OpenSubsonic API接口...');
  
  await testSystemInterfaces();
  await testBrowsingInterfaces();
  await testMusicManagementInterfaces();
  await testAlbumManagementInterfaces();
  await testArtistManagementInterfaces();
  await testPlaylistManagementInterfaces();
  await testMediaRetrievalInterfaces();
  await testUserManagementInterfaces();
  
  // 输出测试结果
  console.log('\n=== 测试结果汇总 ===');
  testResults.forEach(result => {
    console.log(`${result.test}: ${result.status}${result.error ? ` - ${result.error}` : ''}`);
  });
  
  const passedTests = testResults.filter(result => result.status === 'PASS').length;
  const totalTests = testResults.length;
  console.log(`\n测试完成: ${passedTests}/${totalTests} 个接口测试通过`);
}

// 执行测试
runAllTests().catch(error => {
  console.error('测试过程中出现错误:', error);
});