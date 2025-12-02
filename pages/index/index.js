/**
 * index.js
 * 首页逻辑
 */

// 引入API工具类
const api = require('../../utils/api.js');
const { navigateToLoginWithRedirect } = require('../../utils/util.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentUserId: null,
    userInfo: {},
    // 用户身份
    userRole: '' // 'student' 学员, 'coach' 教练
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 初始化用户状态（默认游客模式）
    this.initializeUserState();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    const phoneVerify = this.selectComponent('#phoneVerify');
    if (phoneVerify) {
      phoneVerify.onShow();
    }
    // 总是重新加载用户信息（确保登录状态变化后能及时更新）
    this.loadUserInfo();
    
    // 重新加载用户角色（从登录页面返回时需要更新）
    this.loadUserRole(() => {
      // 用户角色更新后，重新加载课表
      const timeSelector = this.selectComponent('#timeSelector');
      if (timeSelector) {
        timeSelector.refresh();
      }
      
      // 刷新学员日程组件
      const studentSchedule = this.selectComponent('#studentSchedule');
      if (studentSchedule) {
        studentSchedule.refresh();
      }
    });
    
    // 检查是否需要刷新用户信息（从个人信息编辑页面返回时）
    const userInfoUpdated = wx.getStorageSync('userInfoUpdated');
    if (userInfoUpdated) {
      wx.removeStorageSync('userInfoUpdated');
    }
  },

  /**
   * 初始化用户状态
   */
  initializeUserState() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    
    if (!isLoggedIn) {
      // 未登录，设置为游客模式
      this.setGuestMode();
    }
  },

  /**
   * 设置游客模式
   */
  setGuestMode() {
    const guestUserInfo = {
      id: null,
      nickname: '游客用户',
      avatar_url: 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
      loginType: 'guest'
    };

    wx.setStorageSync('userInfo', guestUserInfo);
    wx.setStorageSync('isLoggedIn', true); // 设置为已登录状态，但是游客模式
    wx.setStorageSync('loginType', 'guest');
    wx.setStorageSync('userRole', 'student'); // 默认设置为学员角色
  },

  onNeedLogin() {
    navigateToLoginWithRedirect({
      message: '游客用户名下没有已绑定的教练/学员，不能完成预约，是否前往登录？'
    });
  },

  /**
   * 检查是否需要登录（用于需要登录的功能）
   */
  checkLoginRequired() {
    const loginType = wx.getStorageSync('loginType');
    if (loginType === 'guest') {
      // 游客模式，需要引导登录
      navigateToLoginWithRedirect({
        message: '游客用户名下没有已绑定的教练/学员，不能完成预约，是否前往登录？'
      });
      return false;
    }
    return true;
  },

  /**
   * 加载用户信息
   */
  async loadUserInfo() {
    try {
      // 检查登录类型，游客模式不调用API
      const loginType = wx.getStorageSync('loginType');
      const storedUserInfo = wx.getStorageSync('userInfo');
      
      if (loginType === 'guest') {
        // 游客模式，直接使用本地缓存的用户信息
        this.setData({
          userInfo: {
            name: (storedUserInfo && storedUserInfo.nickname) || '游客用户',
            avatar: (storedUserInfo && storedUserInfo.avatar_url) || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png'
          }
        });
        return;
      }

      // 正常用户，从API获取用户信息
      const [profileResult] = await Promise.all([
        api.user.getProfile(),
      ]);

      // 更新用户基本信息
      if (profileResult && profileResult.data) {
        const user = profileResult.data;
        this.setData({
          userInfo: {
            ...user,
            name: user.nickname || '用户',
            avatar: user.avatar_url || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
            gender: user.gender
          },
          currentUserId: user.id
        });
        
        // 更新本地缓存
        wx.setStorageSync('userInfo', user);
      }

    } catch (error) {
      console.error('加载用户信息失败:', error);
      // API调用失败时使用本地缓存
      const storedUserInfo = wx.getStorageSync('userInfo');
      if (storedUserInfo && (storedUserInfo.nickName || storedUserInfo.nickname)) {
        this.setData({
          userInfo: {
            name: storedUserInfo.nickName || storedUserInfo.nickname || '用户',
            avatar: storedUserInfo.avatarUrl || storedUserInfo.avatar_url || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png'
          }
        });
      } else {
        // 确保有默认值
        this.setData({
          userInfo: {
            name: '用户',
            avatar: 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png'
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
      const loginType = wx.getStorageSync('loginType');
      
      // 如果是游客模式，确保有默认值
      if (loginType === 'guest') {
        this.setData({
          userRole: userRole || 'student'
        });
        
        if (callback && typeof callback === 'function') {
          callback();
        }
        return;
      }
      
      // 正常登录用户的处理
      if (userRole && userInfo) {
        this.setData({
          userRole: userRole
        });
        
        // 执行回调函数
        if (callback && typeof callback === 'function') {
          callback();
        }
      } else {
        console.error('未找到用户角色或用户信息，重新初始化为游客模式');
        
        // 重新设置为游客模式
        this.setGuestMode();
        this.setData({
          userRole: 'student'
        });
        
        if (callback && typeof callback === 'function') {
          callback();
        }
      }
    } catch (error) {
      console.error('加载用户角色失败:', error);
      
      // 出错时也设置为游客模式
      this.setGuestMode();
      this.setData({
        userRole: 'student'
      });
      
      if (callback && typeof callback === 'function') {
        callback();
      }
    }
  },

  /**
   * 约课按钮点击事件
   */
  onBookCourse: function() {
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }
    
    const { userRole } = this.data;

    if (userRole === 'student') {
      // 学员身份：约教练
      wx.navigateTo({
        url: '/pages/bookCourse/bookCourse?type=student-book-coach&from=home'
      });
    } else {
      // 教练身份：约学员
      wx.navigateTo({
        url: '/pages/bookCourse/bookCourse?type=coach-book-student&from=home'
      });
    }
  },

  /**
   * 我的教练/我的学员点击事件
   */
  onMyCoachOrStudentClick: function() {
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }
    
    const { userRole } = this.data;
    
    if (userRole === 'student') {
      // 学员身份：我的教练
      wx.navigateTo({
        url: '/pages/coachList/coachList'
      });
    } else {
      // 教练身份：我的学员
      wx.navigateTo({
        url: '/pages/studentList/studentList'
      });
    }
  },

  /**
   * 上课记录点击事件
   */
  onPendingCoursesClick: function() {
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }
    
    wx.navigateTo({
      url: '/pages/courseList/courseList?tab=0'
    });
  },

  // 消息订阅
  openSubscribeMessage() {
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }
    
    wx.navigateTo({
      url: '/pages/subscribeMessage/subscribeMessage'
    });
  },
  // 教练大厅
  handleOpenAllCoachList() {
    wx.navigateTo({
      url: '/pages/allCoachList/allCoachList'
    });
  },
  // 活动大厅
  handleOpenAllGroupCourses() {
    wx.navigateTo({
      url: '/pages/allGroupCourses/allGroupCourses'
    });
  },
  // 工具-bmi
  handleOpenToolsBmi() {
    wx.navigateTo({
      url: '/pages/tools-bmi/bmi'
    });
  }
  
})
