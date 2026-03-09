const { test, expect } = require('@playwright/test');

test('测试元数据编辑按钮功能', async ({ page }) => {
  // 导航到首页
  await page.goto('http://localhost:4040');
  
  // 登录
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button:has-text("登录")');
  
  // 等待页面加载完成
  await page.waitForLoadState('networkidle');
  
  // 点击元数据管理标签
  await page.click('a:has-text("元数据管理")');
  
  // 等待元数据管理页面加载
  await page.waitForTimeout(2000);
  
  // 输入搜索关键词
  await page.fill('input#metadataSearch', 'test');
  
  // 点击搜索按钮
  await page.click('button#searchMetadataBtn');
  
  // 等待搜索结果加载
  await page.waitForTimeout(2000);
  
  // 检查是否有搜索结果
  const searchResults = await page.$$('#metadataResults button');
  console.log(`找到 ${searchResults.length} 个搜索结果`);
  
  if (searchResults.length > 0) {
    // 点击第一个搜索结果的编辑按钮
    await searchResults[0].click();
    
    // 等待元数据编辑表单加载
    await page.waitForTimeout(2000);
    
    // 检查表单是否显示
    const titleInput = await page.$('input#editTitle');
    expect(titleInput).toBeTruthy();
    
    console.log('元数据编辑按钮点击成功，表单已显示');
  } else {
    console.log('没有搜索结果，无法测试编辑按钮');
  }
  
  // 截图保存
  await page.screenshot({ path: 'test/metadata-test-screenshot.png' });
  
  // 检查控制台日志
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));
  
  // 等待一段时间收集日志
  await page.waitForTimeout(2000);
  
  // 输出控制台日志
  console.log('控制台日志:');
  consoleLogs.forEach(log => console.log(log));
});
