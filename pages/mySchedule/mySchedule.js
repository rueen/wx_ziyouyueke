/**
 * pages/mySchedule/mySchedule.js
 * 我的时间页面（教练专用）
 */

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 页面数据由组件管理
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 页面初始化由组件处理
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 刷新组件数据
    const timeSelector = this.selectComponent('#timeSelector');
    if (timeSelector) {
      timeSelector.refresh();
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    const timeSelector = this.selectComponent('#timeSelector');
    if (timeSelector) {
      timeSelector.refresh();
    }
    wx.stopPullDownRefresh();
  },

  /**
   * 处理时间段点击事件
   */
  onTimeSlotTap(e) {
    const { slot } = e.detail;
    
    // 如果是已预约的时间段，跳转到课程详情
    if (slot.status === 'booked' && slot.courseId) {
      wx.navigateTo({
        url: `/pages/courseDetail/courseDetail?id=${slot.courseId}`
      });
    }
  },

  /**
   * 处理日期选择事件
   */
  onDateSelected(e) {
    const { date } = e.detail;
  },

  /**
   * 处理时间段加载完成事件
   */
  onTimeSlotsLoaded(e) {
    const { date, timeSlots } = e.detail;
  },

  /**
   * 处理错误事件
   */
  onError(e) {
    const { message } = e.detail;
    wx.showToast({
      title: message || '操作失败',
      icon: 'none'
    });
  },

  /**
   * 日期选择事件
   */
  onDateSelect(e) {
    const { date } = e.detail;
    
    this.setData({
      selectedDate: date
    });
    
    // 加载选中日期的时间段
    this.loadTimeSlots(date);
  },

  /**
   * 加载时间段数据
   */
  async loadTimeSlots(date) {
    try {
      wx.showLoading({
        title: '加载中...'
      });

      // 这里应该调用API获取指定日期的时间段数据
      // 暂时使用模拟数据
      const timeSlots = [];
      
      this.setData({
        timeSlots: timeSlots
      });
      
      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('加载时间段失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  }
}); 