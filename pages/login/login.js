/**
 * pages/login/login.js
 * 登录页面
 */
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
    isInvited: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查用户是否已经登录
    this.checkLoginStatus();
    
    // 处理邀请码参数
    this.handleInviteParams(options);
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
    
    if (userInfo && isLoggedIn) {
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
        console.log('微信登录成功，code:', res.code);
        
        // 获取用户信息
        wx.getUserProfile({
          desc: '用于完善会员资料',
          success: (userRes) => {
            console.log('获取用户信息成功:', userRes);
            wx.hideLoading();
            
            // 这里应该调用后端API进行登录验证
            this.mockLoginSuccess('wechat', {
              nickname: userRes.userInfo.nickName,
              avatar: userRes.userInfo.avatarUrl,
              code: res.code
            });
          },
          fail: (err) => {
            console.error('获取用户信息失败:', err);
            wx.hideLoading();
            
            // 用户拒绝授权，使用默认信息登录
            this.mockLoginSuccess('wechat', {
              nickname: '微信用户',
              avatar: '/images/defaultAvatar.png',
              code: res.code
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
          this.mockLoginSuccess('guest', {
            nickname: '游客用户',
            avatar: '/images/defaultAvatar.png'
          });
        }
      }
    });
  },

  /**
   * 模拟登录成功
   */
  mockLoginSuccess(loginType, userData) {
    // 保存用户信息
    const userInfo = {
      loginType,
      nickName: userData.nickname || '微信用户',
      avatarUrl: userData.avatar || '/images/defaultAvatar.png',
      loginTime: new Date().toLocaleString(),
      wxCode: userData.code || '' // 保存微信登录凭证
    };

    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('isLoggedIn', true);
    wx.setStorageSync('loginType', loginType);
    wx.setStorageSync('userRole', this.data.selectedRole); // 保存选择的身份

    // 显示登录成功提示
    const roleNames = { student: '学员', coach: '教练' };
    const roleText = roleNames[this.data.selectedRole];
    wx.showToast({
      title: loginType === 'guest' ? '游客登录成功' : `${roleText}身份登录成功`,
      icon: 'success',
      duration: 2000
    });

    // 延迟跳转到首页
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 2000);
  },

  /**
   * 查看用户协议和隐私政策
   */
  onViewAgreement() {
    wx.showModal({
      title: '用户协议和隐私政策',
      content: '这里会显示详细的用户协议和隐私政策内容。在实际应用中，可以跳转到专门的协议页面或打开WebView显示协议内容。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 处理邀请码参数
   */
  handleInviteParams(options) {
    const { coach, invite } = options;
    
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
    }
  }
}) 