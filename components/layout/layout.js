/**
 * components/layout/layout.js
 * 布局组件
 */
Component({

  /**
   * 组件的属性列表
   */
  properties: {

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
    /**
     * 获取导航栏高度
     */
    getNavBarHeight(){
      try {
        const systemInfo = wx.getSystemInfoSync(); // TODO: 升级到 wx.getSystemInfo
        const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
        const navBarHeight = systemInfo.statusBarHeight + menuButtonInfo.height + (menuButtonInfo.top - systemInfo.statusBarHeight) * 2;
        this.setData({
          navBarHeight
        })
      } catch (error) {
        console.warn('获取系统信息失败，使用默认高度', error);
        this.setData({
          navBarHeight: 88
        });
      }
    }
  }
})