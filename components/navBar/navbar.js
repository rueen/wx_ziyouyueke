/**
 * components/NavBar/navbar.js
 * 导航栏组件
 */
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    title: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    navBarHeight: 0,
    contentHeight: 0,
    canGoBack: false
  },

  lifetimes: {
    attached() {
      this.getNavBarHeight();
      this.checkCanGoBack();
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 获取导航栏高度
     */
    getNavBarHeight(){
      try {
        const systemInfo = wx.getSystemInfoSync(); // TODO: 升级到 wx.getSystemInfo
        const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
        const navBarHeight = systemInfo.statusBarHeight + menuButtonInfo.height + (menuButtonInfo.top - systemInfo.statusBarHeight) * 2;
        this.setData({
          navBarHeight,
          contentHeight: menuButtonInfo.height + (menuButtonInfo.top - systemInfo.statusBarHeight) * 2
        })
      } catch (error) {
        console.warn('获取系统信息失败，使用默认高度', error);
        this.setData({
          navBarHeight: 88,
          contentHeight: 44
        });
      }
    },

    /**
     * 检查是否可以返回上一页
     */
    checkCanGoBack() {
      const pages = getCurrentPages();
      const canGoBack = pages.length > 1;
      this.setData({
        canGoBack
      });
    },

    /**
     * 返回上一页
     */
    onBack() {
      wx.navigateBack();
    }
  }
})