/**
 * pages/login/login.js
 * 登录页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    canIUse: wx.canIUse('button.open-type.getPhoneNumber'),
    hasUserInfo: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查用户是否已经登录
    this.checkLoginStatus();
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
   * 微信授权登录
   */
  onWechatLogin(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // 获取手机号成功
      const { code, encryptedData, iv } = e.detail;
      console.log('获取手机号成功：', { code, encryptedData, iv });
      
      // 这里应该调用后端API进行手机号解密和登录验证
      this.mockLoginSuccess('wechat', {
        phone: '138****8888', // 模拟解密后的手机号
        encryptedData,
        iv
      });
    } else {
      // 用户拒绝授权
      wx.showToast({
        title: '授权失败，请重试',
        icon: 'none'
      });
    }
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
      phone: userData.phone || '',
      loginTime: new Date().toLocaleString()
    };

    wx.setStorageSync('userInfo', userInfo);
    wx.setStorageSync('isLoggedIn', true);
    wx.setStorageSync('loginType', loginType);

    // 显示登录成功提示
    wx.showToast({
      title: loginType === 'guest' ? '游客登录成功' : '登录成功',
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
  }
}) 