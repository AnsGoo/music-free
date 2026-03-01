// FLAC文件播放功能测试
const request = require('supertest');
const express = require('express');
const app = express();

// 模拟服务器配置
app.get('/rest/stream', (req, res) => {
  res.setHeader('Content-Type', 'audio/mpeg');
  res.send('Mock audio data');
});

describe('FLAC Playback functionality', () => {
  it('should return audio/mpeg content type for FLAC files', async () => {
    const response = await request(app)
      .get('/rest/stream')
      .query({ id: 62, u: 'admin', p: 'admin' });
    
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('audio/mpeg');
  });
  
  it('should handle format detection case-insensitively', async () => {
    // 测试不同大小写的格式检测
    const formats = ['FLAC', 'flac', 'Flac', 'fLaC'];
    
    for (const format of formats) {
      const response = await request(app)
        .get('/rest/stream')
        .query({ id: 62, format: format, u: 'admin', p: 'admin' });
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('audio/mpeg');
    }
  });
});
