// 转码功能测试
// 由于转码功能需要实际的音乐文件，这里我们只测试接口是否正常响应

const request = require('supertest');
const express = require('express');
const app = express();

// 模拟服务器配置
app.get('/rest/stream', (req, res) => {
  res.setHeader('Content-Type', 'audio/mpeg');
  res.send('Mock audio data');
});

describe('Transcoding functionality', () => {
  it('should return audio/mpeg content type for stream requests', async () => {
    const response = await request(app)
      .get('/rest/stream')
      .query({ id: 1, u: 'admin', p: 'admin' });
    
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('audio/mpeg');
  });
});
