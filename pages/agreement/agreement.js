/**
 * pages/agreement/agreement.js
 * 用户协议和隐私政策页面
 */

Page({
  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 'user', // 当前激活的标签：'user' | 'privacy'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 可以通过参数指定显示哪个标签
    const { tab } = options;
    if (tab && (tab === 'user' || tab === 'privacy')) {
      this.setData({
        activeTab: tab
      });
    }
  },

  /**
   * 切换标签
   */
  onTabSwitch(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({
      activeTab: tab
    });
  },

  /**
   * 分享功能
   */
  onShareAppMessage() {
    return {
      title: '用户协议和隐私政策',
      path: '/pages/agreement/agreement'
    };
  }
}); 