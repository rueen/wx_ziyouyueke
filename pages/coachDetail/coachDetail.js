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
    relationId: null,
    coachId: null,
    auto_confirm_by_coach: 0, // 该教练发起的课程预约自动确认
    myCards: [] // 我的卡片列表
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.coachId && options.relationId) {
      this.setData({
        coachId: options.coachId - 0,
        relationId: options.relationId - 0
      }, () => {
        this.loadCoachDetail();
        // this.setTimeSelectorCoachId();
      });
    }
  },

  /**
   * 从API加载教练详情
   */
  async loadCoachDetail() {
    const { relationId } = this.data;
    try {
      wx.showLoading({
        title: '加载中...'
      });

      const result = await api.relation.getMyCoachDetail(relationId);
      
      wx.hideLoading();

      if (result && result.data) {
        const coach = result.data;
        this.setData({
          coachData: coach,
          auto_confirm_by_coach: coach.auto_confirm_by_coach
        });
        
        // 加载卡片信息
        this.loadMyCards();
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
   * 加载我的卡片（学员视角）
   */
  async loadMyCards() {
    const { coachId } = this.data;
    
    try {
      const result = await api.card.getMyCards(coachId);
      
      if (result && result.data) {
        // 只显示已开启且未过期的卡片
        // const activeCards = (result.data.list || []).filter(card => 
        //   card.card_status === 1 && !card.is_expired
        // );
        
        this.setData({
          myCards: result.data.list || []
        });
      }
    } catch (error) {
      console.error('加载卡片信息失败:', error);
      // 静默失败，不影响主流程
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

  // 打开活动
  onGroupCourses() {
    const { coachId } = this.data;
    wx.navigateTo({
      url: `/pages/groupCourses/groupCourses?coachId=${coachId}`
    })
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
  },

  async uploadPermissions(auto_confirm_by_coach) {
    const { relationId } = this.data;
    try{
      wx.showLoading();
      const res = await api.relation.permissions(relationId, {
        auto_confirm_by_coach: auto_confirm_by_coach - 0
      });
      wx.hideLoading();
      if (res && res.success) {
        this.setData({
          auto_confirm_by_coach: auto_confirm_by_coach
        })
      } else {
        this.setData({
          auto_confirm_by_coach: !auto_confirm_by_coach
        })
      }
    } catch (e) {
      console.log(e)
      this.setData({
        auto_confirm_by_coach: !auto_confirm_by_coach
      })
    }
  },

  autoConfirmByCoachChange(e) {
    if(e.detail.value) {
      wx.showModal({
        content: '开启后，该教练发起的所有课程预约，不需要你二次确认，确定开启吗？',
        success: (res) => {
          if (res.confirm) {
            this.uploadPermissions(e.detail.value);
          } else if (res.cancel) {
            this.setData({
              auto_confirm_by_coach: false
            })
          }
        }
      })
    } else {
      wx.showModal({
        content: '关闭后，该教练发起的所有课程预约，需要你的二次确认，确定关闭吗？',
        success: (res) => {
          if (res.confirm) {
            this.uploadPermissions(e.detail.value);
          } else if (res.cancel) {
            this.setData({
              auto_confirm_by_coach: true
            })
          }
        }
      }) 
    }
  },

  /**
   * 查看卡片详情
   */
  onViewCardDetail(e) {
    const { card } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/cardDetail/cardDetail?cardId=${card.id}`
    });
  }
}) 