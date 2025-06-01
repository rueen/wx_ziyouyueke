/**
 * pages/coachDetail/coachDetail.js
 * 教练详情页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    coachData: {}
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.coachData) {
      try {
        const coachData = JSON.parse(decodeURIComponent(options.coachData));
        this.setData({
          coachData
        });
      } catch (error) {
        console.error('解析教练数据失败：', error);
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
   * 约课
   */
  onBookCoach() {
    const { coachData } = this.data;
    wx.navigateTo({
      url: `/pages/bookCoach/bookCoach?coachId=${coachData.id}&coachName=${coachData.name}`
    });
  }
}) 