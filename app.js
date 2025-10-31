// app.js
App({
  onLaunch() {
    // 初始化导航栏高度
    this.getNavBarInfo();
  },

  /**
   * 获取导航栏信息
   * @returns {Object} 包含 navBarHeight 和 contentHeight 的对象
   */
  getNavBarInfo() {
    // 如果已经计算过（值大于0），直接返回缓存值
    if (this.globalData.navBarHeight > 0 && this.globalData.contentHeight > 0) {
      return {
        navBarHeight: this.globalData.navBarHeight,
        contentHeight: this.globalData.contentHeight
      };
    }

    try {
      const systemInfo = wx.getSystemInfoSync(); // TODO: 升级到 wx.getSystemInfo
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      const navBarHeight = systemInfo.statusBarHeight + menuButtonInfo.height + (menuButtonInfo.top - systemInfo.statusBarHeight) * 2;
      const contentHeight = menuButtonInfo.height + (menuButtonInfo.top - systemInfo.statusBarHeight) * 2;
      
      // 缓存到 globalData
      this.globalData.navBarHeight = navBarHeight;
      this.globalData.contentHeight = contentHeight;
      
      return {
        navBarHeight,
        contentHeight
      };
    } catch (error) {
      console.warn('获取系统信息失败，使用默认高度', error);
      const defaultNavBarHeight = 88;
      const defaultContentHeight = 44;
      this.globalData.navBarHeight = defaultNavBarHeight;
      this.globalData.contentHeight = defaultContentHeight;
      return {
        navBarHeight: defaultNavBarHeight,
        contentHeight: defaultContentHeight
      };
    }
  },

  /**
   * 获取导航栏高度
   * @returns {number} 导航栏高度（单位：px）
   */
  getNavBarHeight() {
    const info = this.getNavBarInfo();
    return info.navBarHeight;
  },

  globalData: {
    userInfo: null,
    defaultAvatar: 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
    navBarHeight: 0, // 导航栏高度（单位：px）
    contentHeight: 0 // 导航栏内容高度（单位：px）
  }
})
