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
      avatar: '/images/defaultAvatar.png'
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
    this.loadUserInfo();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.loadUserInfo();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const storedUserInfo = wx.getStorageSync('userInfo');
    if (storedUserInfo && storedUserInfo.nickName) {
      this.setData({
        userInfo: {
          name: storedUserInfo.nickName,
          avatar: storedUserInfo.avatarUrl || '/images/defaultAvatar.png'
        }
      });
    } else {
      // 确保有默认值
      this.setData({
        userInfo: {
          name: 'rueen',
          avatar: '/images/defaultAvatar.png'
        }
      });
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    
  },

  /**
   * 约课按钮点击事件
   */
  onBookCourse: function() {
    wx.navigateTo({
      url: '/pages/bookCoach/bookCoach?from=home'
    });
  },

  /**
   * 统计项点击事件
   */
  onStatClick: function(e) {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  }
})
