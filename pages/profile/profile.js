/**
 * pages/profile/profile.js
 * 我的页面逻辑
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      nickname: '请设置昵称',
      avatar: '/images/defaultAvatar.png'
    },
    // 身份信息
    userRole: '', // 'student' 学员, 'coach' 教练
    roleNames: {
      student: '学员',
      coach: '教练'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserInfo();
    this.loadUserRole();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return;
    }
    
    // 检查是否需要刷新用户信息（从编辑页面返回时）
    const userInfoUpdated = wx.getStorageSync('userInfoUpdated');
    if (userInfoUpdated) {
      wx.removeStorageSync('userInfoUpdated');
      this.loadUserInfo();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 加载用户信息
   */
  async loadUserInfo() {
    try {
      // 先从缓存获取
      const storedUserInfo = wx.getStorageSync('userInfo');
      if (storedUserInfo && (storedUserInfo.nickName || storedUserInfo.nickname)) {
        this.setData({
          userInfo: {
            nickname: storedUserInfo.nickName || storedUserInfo.nickname || '请设置昵称',
            avatar: storedUserInfo.avatarUrl || storedUserInfo.avatar_url || '/images/defaultAvatar.png'
          }
        });
      }

      // 从API获取最新的用户信息
      const result = await api.user.getProfile();
      if (result && result.data) {
        const user = result.data;
        this.setData({
          userInfo: {
            nickname: user.nickname || '请设置昵称',
            avatar: user.avatar_url || '/images/defaultAvatar.png'
          }
        });
        
        // 更新本地缓存
        wx.setStorageSync('userInfo', user);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // API调用失败时使用缓存数据
      const storedUserInfo = wx.getStorageSync('userInfo');
      if (storedUserInfo && (storedUserInfo.nickName || storedUserInfo.nickname)) {
        this.setData({
          userInfo: {
            nickname: storedUserInfo.nickName || storedUserInfo.nickname || '请设置昵称',
            avatar: storedUserInfo.avatarUrl || storedUserInfo.avatar_url || '/images/defaultAvatar.png'
          }
        });
      } else {
        // 确保有默认值
        this.setData({
          userInfo: {
            nickname: '请设置昵称',
            avatar: '/images/defaultAvatar.png'
          }
        });
      }
    }
  },

  /**
   * 加载用户身份
   */
  loadUserRole(callback) {
    try {
      const userRole = wx.getStorageSync('userRole');
      const userInfo = wx.getStorageSync('userInfo');
      
      if (userRole && userInfo) {
        this.setData({
          userRole: userRole,
          userInfo: userInfo
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
      console.error('加载用户角色失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 编辑个人资料
   */
  onEditProfile() {
    wx.navigateTo({
      url: '/pages/editProfile/editProfile'
    })
  },

  /**
   * 我的教练/我的学员
   */
  onMyCoachesOrStudents() {
    const { userRole } = this.data;
    
    if (userRole === 'student') {
      // 学员身份：进入我的教练
      wx.navigateTo({
        url: '/pages/coachList/coachList'
      });
    } else {
      // 教练身份：进入我的学员
      wx.navigateTo({
        url: '/pages/studentList/studentList'
      });
    }
  },

  /**
   * 我的课程
   */
  onMyCourses() {
    wx.navigateTo({
      url: '/pages/courseList/courseList'
    })
  },

  /**
   * 时间模板（教练专用）
   */
  onMyTimeTemplate() {
    wx.navigateTo({
      url: '/pages/timeTemplate/timeTemplate'
    });
  },

  /**
   * 我的时间（教练专用）
   */
  onMySchedule() {
    wx.navigateTo({
      url: '/pages/mySchedule/mySchedule'
    });
  },

  /**
   * 常用地址
   */
  onMyAddresses() {
    wx.navigateTo({
      url: '/pages/addressList/addressList'
    });
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    if (!isLoggedIn) {
      // 未登录，跳转到登录页
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return false;
    }
    return true;
  },

  /**
   * 退出登录
   */
  async onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 调用API登出
            await api.auth.logout();
          } catch (error) {
            console.error('API登出失败:', error);
            // 即使API调用失败，也要清除本地信息
          }
          
          // 清除登录信息
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('isLoggedIn');
          wx.removeStorageSync('loginType');
          wx.removeStorageSync('userRole');
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 2000
          });

          // 跳转到登录页
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/login'
            });
          }, 2000);
        }
      }
    });
  }
})