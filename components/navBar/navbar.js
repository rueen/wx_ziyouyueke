// components/NavBar/navbar.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    title: {
      type: String
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    navBarHeight: 0
  },

  lifetimes: {
    attached() {
      this.getNavBarHeight();
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    getNavBarHeight(){
      const systemInfo = wx.getSystemInfoSync();
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      const navBarHeight = systemInfo.statusBarHeight + menuButtonInfo.height + (menuButtonInfo.top - systemInfo.statusBarHeight) * 2;
      this.setData({
        navBarHeight
      })
    }
  }
})