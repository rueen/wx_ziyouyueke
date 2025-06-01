/**
 * pages/bookCoach/bookCoach.js
 * 约教练页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    coachId: '',
    coachName: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.coachId && options.coachName) {
      this.setData({
        coachId: options.coachId,
        coachName: options.coachName
      });
    }
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

  }
}) 