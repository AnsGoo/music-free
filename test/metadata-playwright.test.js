const { test, expect } = require('@playwright/test');

test('测试元数据编辑按钮功能和控制台日志', async ({ page }) => {
  // 导航到首页
  await page.goto('http://localhost:4040');
  
  // 登录
  await page.fill('input#username', 'admin');
  await page.fill('input#password', 'admin');
  await page.click('button:has-text("登录")');
  
  // 等待页面加载完成
  await page.waitForLoadState('networkidle');
  
  // 点击元数据管理标签
  await page.click('a:has-text("元数据")');
  
  // 等待元数据管理页面加载
  await page.waitForTimeout(1000);
  
  // 收集控制台日志
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(msg.text());
    console.log('控制台日志:', msg.text());
  });
  
  // 输入搜索关键词
  await page.fill('input#metadataSearch', 'test');
  
  // 点击搜索按钮（使用更具体的选择器）
  await page.click('#metadata .search-bar button');
  
  // 等待搜索结果加载
  await page.waitForTimeout(2000);
  
  // 检查是否有搜索结果
  const editButtons = await page.$$('#metadataSongsList button');
  console.log(`找到 ${editButtons.length} 个编辑按钮`);
  
  if (editButtons.length > 0) {
    // 点击第一个编辑按钮
    await editButtons[0].click();
    
    // 等待元数据编辑表单加载
    await page.waitForTimeout(2000);
    
    // 检查表单是否显示
    const titleInput = await page.$('input#editTitle');
    expect(titleInput).toBeTruthy();
    
    console.log('元数据编辑按钮点击成功，表单已显示');
  } else {
    console.log('没有搜索结果，无法测试编辑按钮');
  }
  
  // 输出所有控制台日志
  console.log('\n=== 所有控制台日志 ===');
  consoleLogs.forEach(log => console.log(log));
  
  // 截图保存
  await page.screenshot({ path: 'test/metadata-test-result.png' });
});
