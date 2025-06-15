/**
 * pages/bindCoach/bindCoach.js
 * 学员绑定教练页面 - 通过二维码扫描进入，实现学员与教练的师生关系绑定
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    coachId: null,           // 教练ID
    coachData: {},           // 教练信息
    isLoading: true,         // 加载状态
    isLoggedIn: false,       // 登录状态
    isBinding: false         // 绑定状态
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查登录状态
    this.checkLoginStatus();
    
    // 获取教练ID参数
    if (options.coach_id) {
      this.setData({
        coachId: parseInt(options.coach_id)
      });
      
      // 加载教练信息
      this.loadCoachInfo();
    }
  },

  /**
   * 检查用户登录状态
   */
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const isLoggedIn = wx.getStorageSync('isLoggedIn') || false;
    
    this.setData({
      isLoggedIn: !!token && isLoggedIn
    });
  },

  /**
   * 加载教练信息
   */
  async loadCoachInfo() {
    try {
      wx.showLoading({
        title: '加载中...'
      });

      const result = await api.coach.getDetail(this.data.coachId);
      
      if (result && result.data) {
        const coachData = result.data;
        
        this.setData({
          coachInfo: {
            id: coachData.id,
            nickname: coachData.nickname || '未知教练',
            avatar_url: coachData.avatar_url || '/images/defaultAvatar.png',
            phone: coachData.phone || '',
            description: coachData.description || '暂无介绍'
          }
        });
      }
      
      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      console.error('加载教练信息失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 点击绑定教练按钮
   */
  async onBindCoach() {
    const { isLoggedIn, isBinding } = this.data;
    
    if (isBinding) {
      return; // 防止重复点击
    }

    if (!isLoggedIn) {
      // 用户未登录，先进行登录
      this.goToLogin();
    } else {
      // 用户已登录，直接绑定
      await this.bindCoach();
    }
  },

  /**
   * 跳转到登录页面
   */
  goToLogin() {
    const { coachId } = this.data;
    
    wx.showModal({
      title: '需要登录',
      content: '绑定教练需要先登录，是否立即登录？',
      success: (res) => {
        if (res.confirm) {
          // 跳转到登录页面，携带回调参数
          wx.redirectTo({
            url: `/pages/login/login?from=bindCoach&coach_id=${coachId}`
          });
        }
      }
    });
  },

  /**
   * 绑定师生关系
   */
  async bindCoach() {
    try {
      wx.showLoading({
        title: '绑定中...'
      });

      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo.id) {
        throw new Error('用户信息未找到');
      }

      const bindData = {
        coach_id: this.data.coachId,
        student_id: userInfo.id,
        student_remark: this.data.studentRemark || ''
      };

      const result = await api.relation.create(bindData);
      
      if (result && result.data) {
        wx.hideLoading();
        
        wx.showToast({
          title: '绑定成功',
          icon: 'success'
        });

        // 延迟跳转到首页
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }, 1500);
      }
    } catch (error) {
      wx.hideLoading();
      console.error('绑定教练失败:', error);
      wx.showToast({
        title: error.message || '绑定失败',
        icon: 'none'
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时重新检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 返回上一页
   */
  onGoBack() {
    wx.navigateBack();
  }
}) 