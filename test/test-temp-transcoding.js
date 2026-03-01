// 运行临时文件转码功能测试
const { execSync } = require('child_process');

console.log('开始运行临时文件转码功能测试...');

try {
  // 运行测试
  const output = execSync('npx jest test/temp-transcoding.test.js', { encoding: 'utf8' });
  console.log('测试结果:');
  console.log(output);
  console.log('\n✅ 临时文件转码功能测试完成');
} catch (error) {
  console.error('测试失败:');
  console.error(error.stdout);
  console.error('\n❌ 临时文件转码功能测试失败');
  process.exit(1);
}
