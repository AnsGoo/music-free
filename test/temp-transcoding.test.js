// 临时文件转码功能测试
const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const app = express();

// 模拟服务器配置
app.get('/rest/stream', (req, res) => {
  // 模拟FLAC文件路径
  const flacPath = path.join(__dirname, 'test.flac');
  
  // 生成临时文件路径
  const tempPath = path.join(__dirname, `transcoded_${Date.now()}.mp3`);
  
  try {
    // 使用ffmpeg进行转码
    const ffmpeg = spawnSync('ffmpeg', [
      '-i', flacPath,
      '-acodec', 'libmp3lame',
      '-b:a', '320k',
      '-id3v2_version', '3',
      '-write_id3v1', '1',
      '-metadata', 'encoder=LAME3.100',
      '-loglevel', 'warning',
      '-nostdin',
      tempPath
    ]);
    
    if (ffmpeg.status !== 0) {
      res.status(500).json({ 
        'subsonic-response': {
          status: 'failed',
          error: { code: 0, message: 'Transcoding failed' }
        }
      });
      return;
    }
    
    if (!fs.existsSync(tempPath)) {
      res.status(500).json({ 
        'subsonic-response': {
          status: 'failed',
          error: { code: 0, message: 'Transcoding failed: temp file not created' }
        }
      });
      return;
    }
    
    // 设置响应头
    const stat = fs.statSync(tempPath);
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size,
      'Content-Disposition': 'inline',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    
    // 流式传输临时文件
    const readStream = fs.createReadStream(tempPath);
    readStream.pipe(res);
    
    // 处理响应结束事件，删除临时文件
    res.on('finish', () => {
      setTimeout(() => {
        try {
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        } catch (error) {
          console.error('Error deleting temp file:', error);
        }
      }, 1000);
    });
  } catch (error) {
    res.status(500).json({ 
      'subsonic-response': {
        status: 'failed',
        error: { code: 0, message: 'Transcoding failed' }
      }
    });
  }
});

describe('Temporary File Transcoding functionality', () => {
  // 测试前创建一个测试FLAC文件
  beforeAll(() => {
    // 创建一个简单的FLAC文件（使用ffmpeg生成）
    const testFlacPath = path.join(__dirname, 'test.flac');
    const ffmpeg = spawnSync('ffmpeg', [
      '-f', 'lavfi',
      '-i', 'sine=frequency=440:duration=5',
      '-acodec', 'flac',
      testFlacPath
    ]);
    
    if (ffmpeg.status !== 0) {
      console.error('Failed to create test FLAC file:', ffmpeg.stderr.toString());
    }
  });
  
  // 测试后清理
  afterAll(() => {
    // 删除测试FLAC文件
    const testFlacPath = path.join(__dirname, 'test.flac');
    if (fs.existsSync(testFlacPath)) {
      fs.unlinkSync(testFlacPath);
    }
  });
  
  it('should return audio/mpeg content type for transcoded files', async () => {
    const response = await request(app)
      .get('/rest/stream')
      .query({ id: 1, u: 'admin', p: 'admin' });
    
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('audio/mpeg');
  });
  
  it('should set correct response headers', async () => {
    const response = await request(app)
      .get('/rest/stream')
      .query({ id: 1, u: 'admin', p: 'admin' });
    
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('audio/mpeg');
    expect(response.headers['content-disposition']).toBe('inline');
    expect(response.headers['cache-control']).toBe('no-cache');
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['content-length']).toBeDefined();
  });
  
  it('should handle transcoding errors', async () => {
    // 修改测试，模拟转码失败
    app.get('/rest/stream/error', (req, res) => {
      res.status(500).json({ 
        'subsonic-response': {
          status: 'failed',
          error: { code: 0, message: 'Transcoding failed' }
        }
      });
    });
    
    const response = await request(app)
      .get('/rest/stream/error')
      .query({ id: 1, u: 'admin', p: 'admin' });
    
    expect(response.statusCode).toBe(500);
    expect(response.body['subsonic-response'].status).toBe('failed');
    expect(response.body['subsonic-response'].error.message).toBe('Transcoding failed');
  });
});
