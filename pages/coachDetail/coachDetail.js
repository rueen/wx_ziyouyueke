/**
 * pages/coachDetail/coachDetail.js
 * 教练详情页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    coachData: {},
    coachId: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.coachData) {
      try {
        const coachData = JSON.parse(decodeURIComponent(options.coachData));
        this.setData({
          coachData,
          coachId: coachData.id
        });
        // 设置时间选择器的教练ID
        this.setTimeSelectorCoachId(coachData.id);
      } catch (error) {
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
      }
    } else if (options.coachId) {
      // 如果只有教练ID，从API获取详情
      const coachId = parseInt(options.coachId);
      this.setData({ coachId });
      this.loadCoachDetail(coachId);
      this.setTimeSelectorCoachId(coachId);
    }
  },

  /**
   * 设置时间选择器的教练ID
   */
  setTimeSelectorCoachId(coachId) {
    // 等待页面渲染完成后设置
    setTimeout(() => {
      const timeSelector = this.selectComponent('#timeSelector');
      if (timeSelector) {
        timeSelector.setData({
          coachId: coachId
        });
        // 重新初始化组件
        timeSelector.initializeComponent();
      }
    }, 100);
  },

  /**
   * 从API加载教练详情
   */
  async loadCoachDetail(coachId) {
    try {
      wx.showLoading({
        title: '加载中...'
      });

      const result = await api.user.getDetail(coachId);
      
      wx.hideLoading();

      if (result && result.data) {
        const coach = result.data;
        const coachData = {
          id: coach.id,
          name: coach.nickname || '未知教练',
          avatar: coach.avatar_url || '/images/defaultAvatar.png',
          introduction: coach.intro || '暂无介绍',
          stats: coach.stats || {},
          phone: coach.phone || '',
          remainingLessons: coach.remaining_lessons || 0
        };

        this.setData({
          coachData
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载教练详情失败:', error);
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 刷新时间选择器数据
    const timeSelector = this.selectComponent('#timeSelector');
    if (timeSelector) {
      timeSelector.refresh();
    }
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
    } else if (slot.status === 'available') {
      // 如果是可预约时间段，跳转到约课页面
      this.onBookCoach();
    }
  },

  /**
   * 处理日期选择事件
   */
  onDateSelected(e) {
    const { date } = e.detail;
    // 可以在这里添加日期选择的处理逻辑
  },

  /**
   * 处理时间段加载完成事件
   */
  onTimeSlotsLoaded(e) {
    const { date, timeSlots } = e.detail;
    // 可以在这里添加时间段加载完成的处理逻辑
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
   * 约课
   */
  onBookCoach() {
    const { coachData } = this.data;
    
    // 检查登录状态
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    const loginType = wx.getStorageSync('loginType');
    
    if (!isLoggedIn || loginType === 'guest') {
      // 未登录，提示登录
      wx.showModal({
        title: '请先登录',
        content: '预约课程需要先登录您的账户',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    // 已登录，跳转到约课页面
    wx.navigateTo({
      url: `/pages/bookCourse/bookCourse?type=student-book-coach&from=coachDetail&coachId=${coachData.id}&coachName=${encodeURIComponent(coachData.name)}`
    });
  }
}) 