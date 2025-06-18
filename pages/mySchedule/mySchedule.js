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
    userRole: '',
    currentUserId: null,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 页面初始化由组件处理
    this.getUserRole();
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
   * 获取用户角色
   */
  getUserRole(callback) {
    try {
      const userRole = wx.getStorageSync('userRole');
      const userInfo = wx.getStorageSync('userInfo');
      
      if (userRole && userInfo) {
        this.setData({
          userRole: userRole,
          currentUserId: userInfo.id
        });
        
        // 执行回调函数
        if (callback && typeof callback === 'function') {
          callback();
        }
      } else {
        console.error('未找到用户角色或用户信息');
        wx.showToast({
          title: '请先登录',
          icon: 'error'
        });
        
        // 跳转到登录页面
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }, 1500);
      }
    } catch (error) {
      console.error('获取用户角色失败:', error);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'error'
      });
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
    if (slot.courseId != null) {
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
  }
}); 