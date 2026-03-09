// 简单的元数据编辑按钮测试脚本

// 模拟登录
localStorage.setItem('authParams', 'u=admin&p=admin');

try {
  console.log('测试 searchMetadataSongs 函数...');
  
  // 模拟输入搜索关键词
  document.getElementById('metadataSearch').value = 'test';
  
  // 调用搜索函数
  searchMetadataSongs();
  
  console.log('searchMetadataSongs 函数调用成功');
  
  // 等待搜索结果加载
  setTimeout(() => {
    console.log('测试编辑按钮点击...');
    
    // 查找编辑按钮
    const editButtons = document.querySelectorAll('#metadataSongsList button');
    console.log(`找到 ${editButtons.length} 个编辑按钮`);
    
    if (editButtons.length > 0) {
      // 点击第一个编辑按钮
      editButtons[0].click();
      console.log('编辑按钮点击成功');
    } else {
      console.log('没有找到编辑按钮');
    }
  }, 2000);
  
} catch (error) {
  console.error('测试过程中出现错误:', error);
}
