/**
 * pages/bindCoach/bindCoach.js
 * 学员绑定教练页面 - 通过二维码扫描进入，实现学员与教练的师生关系绑定
 */

// 引入API工具类
const api = require('../../utils/api.js');
const { navigateToLoginWithRedirect, parseSceneParams, splitByLineBreak } = require('../../utils/util.js');

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
    options = parseSceneParams(options);
    const { coachId } = options;

    if (!coachId) {
      wx.showToast({
        title: '参数错误，请重新扫码',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
      return;
    }

    this.setData({
      coachId: coachId
    });

    // 检查登录状态
    this.checkLoginStatus();
    
    // 加载教练信息
    this.loadCoachInfo();
  },

    /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时重新检查登录状态
    this.checkLoginStatus();
    const phoneVerify = this.selectComponent('#phoneVerify');
    if (phoneVerify) {
      phoneVerify.onShow();
    }
  },

  onNeedLogin() {
    navigateToLoginWithRedirect({
      message: '游客用户名下没有已绑定的教练/学员，不能完成预约，是否前往登录？',
      redirectParams: {
        isFixedRole: true,
        selectedRole: 'student',
        coachId: this.data.coachId
      }
    });
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
      const { coachId } = this.data;
      
      wx.showLoading({
        title: '加载教练信息...'
      });

      // 调用获取用户详情接口（无需认证）
      const result = await api.user.getDetail(coachId);
      
      wx.hideLoading();
      
      if (result && result.success && result.data) {
        const coach = result.data;
        const coachData = {
          ...coach,
          nickname: coach.nickname || '未知教练',
          avatar_url: coach.avatar_url || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
          certification: splitByLineBreak(coach.certification),
          intro: splitByLineBreak(coach.intro)
        };

        this.setData({
          coachData,
          isLoading: false
        });
      } else {
        throw new Error(result.message || '获取教练信息失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载教练信息失败:', error);
      
      this.setData({
        isLoading: false
      });
      
      wx.showModal({
        title: '加载失败',
        content: '无法获取教练信息，请重试',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  /**
   * 点击绑定教练按钮
   */
  async onBindCoach() {
    const { isBinding } = this.data;
    
    if (isBinding) {
      return; // 防止重复点击
    }

    this.bindCoachRelation();
  },

  /**
   * 绑定师生关系
   */
  async bindCoachRelation() {
    const { coachId, coachData } = this.data;
    
    try {
      this.setData({
        isBinding: true
      });

      wx.showLoading({
        title: '绑定中...'
      });

      // 调用绑定师生关系接口
      const relationData = {
        coach_id: parseInt(coachId),
        student_id: null, // 后端会自动获取当前用户ID
        total_sessions: 0, // 初始课时为0，后续可以充值
        remaining_sessions: 0,
        status: 'active',
        notes: `学员主动绑定教练：${coachData.name}`
      };

      const result = await api.relation.create(relationData);
      
      wx.hideLoading();

      if (result && result.success) {
        // 绑定成功，设置用户角色为学员
        wx.setStorageSync('userRole', 'student');
        
        wx.showToast({
          title: '绑定成功！',
          icon: 'success'
        });

        // 延迟跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
        
      } else {
        throw new Error(result.message || '绑定失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('绑定师生关系失败:', error);
      
      this.setData({
        isBinding: false
      });

      // 处理特定错误
      let errorMessage = error.message;
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    }
  },

  /**
   * 返回上一页
   */
  onGoBack() {
    wx.navigateBack();
  }
}) 