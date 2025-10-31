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
     * 获取导航栏高度（使用全局方法）
     */
    getNavBarHeight() {
      const app = getApp();
      const navBarHeight = app.getNavBarHeight();
      this.setData({
        navBarHeight
      });
    }
  }
})