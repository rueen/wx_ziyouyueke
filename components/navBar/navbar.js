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
      const systemInfo = wx.getSystemInfoSync();
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      const navBarHeight = systemInfo.statusBarHeight + menuButtonInfo.height + (menuButtonInfo.top - systemInfo.statusBarHeight) * 2;
      this.setData({
        navBarHeight
      })
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