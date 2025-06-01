/**
 * index.js
 * 首页逻辑
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      name: 'rueen',
      avatar: '/images/profile.png'
    },
    stats: {
      points: 0,
      energy: 0,
      coupons: 1
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    
  },

  /**
   * 约课按钮点击事件
   */
  onBookCourse: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  /**
   * 统计项点击事件
   */
  onStatClick: function(e) {
    const type = e.currentTarget.dataset.type
    wx.showToast({
      title: `查看${type}`,
      icon: 'none'
    })
  }
})
