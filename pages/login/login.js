/**
 * pages/login/login.js
 * 登录页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    hasUserInfo: false,
    agreedToTerms: false, // 是否同意用户协议
    selectedRole: 'student', // 选择的身份，默认为学员
    // 邀请相关参数
    inviteCode: '',
    coachId: '',
    isInvited: false,
    fromBindCoach: false, // 是否从绑定教练页面跳转过来
    // 来源页面信息
    redirectUrl: '', // 登录成功后要跳转的页面
    redirectParams: {} // 跳转页面的参数
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查用户是否已经登录
    this.checkLoginStatus();
    
    // 处理邀请码参数
    this.handleInviteParams(options);
    
    // 处理来源页面参数
    this.handleRedirectParams(options);
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    const loginType = wx.getStorageSync('loginType');
    
    // 只有真正登录（非游客模式）才跳转到首页
    if (userInfo && isLoggedIn && loginType !== 'guest') {
      // 已登录，直接跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  /**
   * 身份选择事件
   */
  onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({
      selectedRole: role
    });
  },

  /**
   * 用户协议复选框变化事件
   */
  onAgreementChange(e) {
    this.setData({
      agreedToTerms: !!e.detail.value[0]
    });
  },

  /**
   * 微信授权登录
   */
  onWechatLogin(e) {
    // 检查是否同意用户协议
    if (!this.data.agreedToTerms) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }

    // 显示登录中提示
    wx.showLoading({
      title: '登录中...'
    });

    // 获取微信登录凭证
    wx.login({
      success: (res) => {
        // 获取用户信息
        wx.getUserProfile({
          desc: '用于完善会员资料',
          success: (userRes) => {
            // 调用后端API进行登录验证
            this.performLogin(res.code, {
              nickname: userRes.userInfo.nickName,
              avatarUrl: userRes.userInfo.avatarUrl,
              gender: userRes.userInfo.gender
            });
          },
          fail: (err) => {
            console.error('获取用户信息失败:', err);
            
            // 用户拒绝授权，使用默认信息登录
            this.performLogin(res.code, {
              nickname: '微信用户',
              avatarUrl: '/images/defaultAvatar.png',
              gender: 0
            });
          }
        });
      },
      fail: (err) => {
        console.error('微信登录失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 游客登录
   */
  onGuestLogin() {
    wx.showModal({
      title: '游客登录',
      content: '游客模式下功能受限，建议微信登录获得完整体验',
      confirmText: '继续',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.mockLoginSuccess('guest');
        }
      }
    });
  },

  /**
   * 执行真实登录
   */
  async performLogin(code, userInfo) {
    try {
      // 构建登录参数
      const loginParams = {
        code,
        userInfo
      };
      
      // 如果有邀请的教练ID，加入参数
      if (this.data.isInvited && this.data.coachId) {
        loginParams.coach_id = parseInt(this.data.coachId);
      }
      
      // 调用登录API
      const result = await api.auth.login(loginParams);
      
      wx.hideLoading();
      
      // 保存用户信息和Token
      const { token, user, isNewUser, autoBindCoach } = result.data;
      
      wx.setStorageSync('token', token);
      wx.setStorageSync('userInfo', user);
      wx.setStorageSync('isLoggedIn', true);
      wx.setStorageSync('loginType', 'wechat');
      wx.setStorageSync('userRole', this.data.selectedRole);
      
      // 显示登录成功提示
      let successMessage = '登录成功';
      
      if (isNewUser) {
        successMessage = '注册并登录成功';
      }
      
      if (autoBindCoach) {
        successMessage += '，已自动绑定教练';
      }
      
      wx.showToast({
        title: successMessage,
        icon: 'success',
        duration: 2000
      });
      
      // 延迟跳转
      setTimeout(() => {
        this.handleLoginRedirect();
      }, 2000);
      
    } catch (error) {
      wx.hideLoading();
      console.error('登录失败:', error);
      
      let errorMessage = '登录失败，请重试';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 2001) {
        errorMessage = '微信登录验证失败';
      } else if (error.code === -1) {
        errorMessage = '网络连接失败，请检查网络';
      }
      
      wx.showModal({
        title: '登录失败',
        content: errorMessage,
        showCancel: false,
        confirmText: '重试'
      });
    }
  },

  /**
   * 游客登录（简化版本）
   */
  mockLoginSuccess(loginType) {
    // 保存最基本的用户信息
    const userInfo = {
      id: null, // 游客没有ID
      nickname: '游客用户',
      avatar_url: '/images/defaultAvatar.png',
      loginType: loginType
    };

    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('isLoggedIn', true);
    wx.setStorageSync('loginType', loginType);
    wx.setStorageSync('userRole', this.data.selectedRole);

    // 显示登录成功提示
    wx.showToast({
      title: '游客登录成功',
      icon: 'success',
      duration: 2000
    });

    // 延迟跳转
    setTimeout(() => {
      this.handleLoginRedirect();
    }, 2000);
  },

  /**
   * 查看用户协议和隐私政策
   */
  onViewAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  },

  /**
   * 处理邀请码参数和绑定教练回调
   */
  handleInviteParams(options) {
    const { coach, invite, from, coach_id } = options;
    
    if (coach && invite) {
      // 有邀请码，自动设置为学员身份
      this.setData({
        selectedRole: 'student',
        coachId: coach,
        inviteCode: invite,
        isInvited: true
      });
      
      wx.showToast({
        title: '检测到教练邀请',
        icon: 'none',
        duration: 2000
      });
    } else if (from === 'bindCoach' && coach_id) {
      // 从绑定教练页面跳转过来，保存回调信息
      this.setData({
        selectedRole: 'student',
        coachId: coach_id,
        isInvited: false,
        fromBindCoach: true
      });
      
      wx.showToast({
        title: '请登录后绑定教练',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 处理来源页面参数
   */
  handleRedirectParams(options) {
    const { redirectUrl, ...params } = options;
    
    if (redirectUrl) {
      // 移除redirectUrl，剩下的都是页面参数
      delete params.coach;
      delete params.invite;
      delete params.from;
      delete params.coach_id;
      
      this.setData({
        redirectUrl: decodeURIComponent(redirectUrl),
        redirectParams: params
      });
      
      console.log('检测到来源页面:', this.data.redirectUrl, this.data.redirectParams);
    }
  },

  /**
   * 处理登录成功后的跳转
   */
  handleLoginRedirect() {
    if (this.data.fromBindCoach && this.data.coachId) {
      // 从绑定教练页面来的，返回绑定教练页面
      wx.redirectTo({
        url: `/pages/bindCoach/bindCoach?coach_id=${this.data.coachId}`
      });
    } else if (this.data.redirectUrl) {
      // 有来源页面，跳转回原页面
      let url = this.data.redirectUrl;
      
      // 构建参数字符串
      const paramKeys = Object.keys(this.data.redirectParams);
      if (paramKeys.length > 0) {
        const paramString = paramKeys
          .map(key => `${key}=${encodeURIComponent(this.data.redirectParams[key])}`)
          .join('&');
        url += (url.includes('?') ? '&' : '?') + paramString;
      }
      
      console.log('跳转回原页面:', url);
      
      // 判断是否为tabBar页面
      const tabBarPages = ['/pages/index/index', '/pages/profile/profile'];
      if (tabBarPages.includes(this.data.redirectUrl)) {
        wx.switchTab({
          url: this.data.redirectUrl
        });
      } else {
        wx.redirectTo({
          url: url
        });
      }
    } else {
      // 正常登录，跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  }
}) 