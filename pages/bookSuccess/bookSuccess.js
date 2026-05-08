/**
 * pages/bookSuccess/bookSuccess.js
 * 预约成功页面
 */
Page({
  data: {
    courseId: ''
  },

  /**
   * 生命周期函数--监听页面加载
   * @param {Object} options 页面参数
   */
  onLoad(options) {
    this.setData({
      courseId: options.courseId || ''
    });
  },

  /**
   * 跳转到订阅消息页面
   */
  handleSubscribeMessage() {
    wx.redirectTo({
      url: '/pages/subscribeMessage/subscribeMessage'
    });
  },

  /**
   * 跳转到课程详情页
   */
  handleViewCourseDetail() {
    const { courseId } = this.data;
    if (!courseId) {
      wx.showToast({
        title: '课程信息缺失',
        icon: 'none'
      });
      return;
    }

    wx.redirectTo({
      url: `/pages/courseDetail/courseDetail?id=${courseId}`
    });
  },

  /**
   * 返回首页
   */
  handleBackHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 页面分享配置
   * @returns {Object} 分享配置
   */
  onShareAppMessage() {
    const { courseId } = this.data;
    return {
      title: '课程已预约，点击查看课程详情',
      path: courseId
        ? `/pages/courseDetail/courseDetail?id=${courseId}`
        : '/pages/index/index'
    };
  }
});
