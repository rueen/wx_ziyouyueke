/**
 * pages/studentDetail/studentDetail.js
 * 学员详情页面
 */
Page({

  /**
   * 页面的初始数据
   */
  data: {
    studentData: {}
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.studentData) {
      try {
        const studentData = JSON.parse(decodeURIComponent(options.studentData));
        this.setData({
          studentData
        });
      } catch (error) {
        console.error('解析学员数据失败：', error);
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
      }
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
   * 约课
   */
  onBookStudent() {
    const { studentData } = this.data;
    wx.navigateTo({
      url: `/pages/bookStudent/bookStudent?from=studentDetail&studentId=${studentData.id}&studentName=${encodeURIComponent(studentData.name)}`
    });
  }
})