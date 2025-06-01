/**
 * pages/profile/profile.js
 * 我的页面逻辑
 */
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      nickname: '请设置昵称',
      avatar: '/images/defaultAvatar.png'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserInfo();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadUserInfo();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const storedUserInfo = wx.getStorageSync('userInfo');
    if (storedUserInfo && storedUserInfo.nickName) {
      this.setData({
        userInfo: {
          nickname: storedUserInfo.nickName,
          avatar: storedUserInfo.avatarUrl || '/images/defaultAvatar.png'
        }
      });
    } else {
      // 确保有默认值
      this.setData({
        userInfo: {
          nickname: '请设置昵称',
          avatar: '/images/defaultAvatar.png'
        }
      });
    }
  },

  /**
   * 编辑个人资料
   */
  onEditProfile() {
    wx.navigateTo({
      url: '/pages/editProfile/editProfile'
    })
  },

  /**
   * 我的教练
   */
  onMyCoaches() {
    wx.navigateTo({
      url: '/pages/coachList/coachList'
    })
  },

  /**
   * 我的课程
   */
  onMyCourses() {
    wx.navigateTo({
      url: '/pages/courseList/courseList'
    })
  }
})