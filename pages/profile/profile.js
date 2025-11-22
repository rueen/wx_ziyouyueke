/**
 * pages/profile/profile.js
 * 我的页面逻辑
 */

// 引入API工具类
const api = require('../../utils/api.js');
const { navigateToLoginWithRedirect } = require('../../utils/util.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      nickname: '请设置昵称',
      avatar: 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png'
    },
    // 身份信息
    userRole: '', // 'student' 学员, 'coach' 教练
    roleNames: {
      student: '学员',
      coach: '教练'
    },
    loginType: '' // 登录类型
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 页面加载时只做基础初始化，用户信息加载移到onShow中
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
    // 总是重新加载用户信息（确保登录状态变化后能及时更新）
    this.loadUserInfo();
    
    // 重新加载登录类型和用户角色（从登录页面返回时需要更新）
    this.loadLoginType();
    this.loadUserRole();
    
    // 检查是否需要刷新用户信息（从编辑页面返回时）
    const userInfoUpdated = wx.getStorageSync('userInfoUpdated');
    if (userInfoUpdated) {
      wx.removeStorageSync('userInfoUpdated');
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
      // 检查登录类型，游客模式不调用API
      const loginType = wx.getStorageSync('loginType');
      const storedUserInfo = wx.getStorageSync('userInfo');

      // 先从缓存获取
      if (storedUserInfo && (storedUserInfo.nickName || storedUserInfo.nickname)) {
        this.setData({
          userInfo: {
            id: storedUserInfo.id,
            nickname: storedUserInfo.nickName || storedUserInfo.nickname || '请设置昵称',
            avatar: storedUserInfo.avatarUrl || storedUserInfo.avatar_url || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png'
          }
        });
      }

      if (loginType === 'guest') {
        // 游客模式，跳过API调用，只使用本地缓存
        return;
      }

      // 正常用户，从API获取最新的用户信息
      const result = await api.user.getProfile();
      if (result && result.data) {
        const user = result.data;
        this.setData({
          userInfo: {
            id: user.id,
            nickname: user.nickname || '请设置昵称',
            avatar: user.avatar_url || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
            intro: user.intro || ''
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
            id: storedUserInfo.id,
            nickname: storedUserInfo.nickName || storedUserInfo.nickname || '请设置昵称',
            avatar: storedUserInfo.avatarUrl || storedUserInfo.avatar_url || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png'
          }
        });
      } else {
        // 确保有默认值
        this.setData({
          userInfo: {
            nickname: '请设置昵称',
            avatar: 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png'
          }
        });
      }
    }
  },

  /**
   * 加载登录类型
   */
  loadLoginType() {
    const loginType = wx.getStorageSync('loginType') || 'guest';
    this.setData({
      loginType: loginType
    });
  },

  /**
   * 加载用户身份
   */
  loadUserRole(callback) {
    try {
      const userRole = wx.getStorageSync('userRole');
      const userInfo = wx.getStorageSync('userInfo');
      const loginType = wx.getStorageSync('loginType');
      
      // 如果是游客模式，设置默认角色
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
        console.error('未找到用户角色或用户信息，但不跳转登录页');
        // 设置默认角色，不跳转登录页
        this.setData({
          userRole: 'student'
        });
        
        if (callback && typeof callback === 'function') {
          callback();
        }
      }
    } catch (error) {
      console.error('加载用户角色失败:', error);
      // 出错时设置默认角色
      this.setData({
        userRole: 'student'
      });
      
      if (callback && typeof callback === 'function') {
        callback();
      }
    }
  },

  /**
   * 编辑个人资料
   */
  onEditProfile() {
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }
    
    wx.navigateTo({
      url: '/pages/editProfile/editProfile'
    })
  },

  // 消息订阅
  openSubscribeMessage() {
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

  /**
   * 上课记录
   */
  onMyCourses() {
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }
    
    wx.navigateTo({
      url: '/pages/courseList/courseList'
    })
  },

  /**
   * 我的教练/我的学员
   */
  onMyCoachesOrStudents() {
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }
    
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

  // 课程设置
  onCoursesCategories(){
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }

    wx.navigateTo({
      url: '/pages/categoriesList/categoriesList'
    })
  },

  // 打开活动
  onGroupCourses() {
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }
    
    const { userInfo, userRole } = this.data;
    if(userRole === 'coach'){
      wx.navigateTo({
        url: `/pages/groupCourses/groupCourses?coachId=${userInfo.id}`
      })
    } else {
      // 学员视角
      wx.navigateTo({
        url: `/pages/groupCourseStudent/groupCourseStudent`
      })
    }
  },

  /**
   * 时间模板（教练专用）
   */
  onMyTimeTemplate() {
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }
    
    wx.navigateTo({
      url: '/pages/timeTemplate/timeTemplate'
    });
  },

  /**
   * 常用地址
   */
  onMyAddresses() {
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }
    
    wx.navigateTo({
      url: '/pages/addressList/addressList'
    });
  },

  /**
   * 检查是否需要登录（用于需要登录的功能）
   */
  checkLoginRequired() {
    const loginType = wx.getStorageSync('loginType');
    if (loginType === 'guest') {
      // 游客模式，需要引导登录
      navigateToLoginWithRedirect();
      return false;
    }
    return true;
  },

  /**
   * 登录/退出登录
   */
  async onLogout() {
    const loginType = wx.getStorageSync('loginType');
    
    if (loginType === 'guest') {
      // 游客模式，跳转到登录页
      wx.navigateTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    // 正常用户，显示退出登录确认
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
          
          // 清除登录信息，重新设置为游客模式
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('isLoggedIn');
          wx.removeStorageSync('loginType');
          wx.removeStorageSync('userRole');
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 1500
          });

          // 重新初始化为游客模式
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }, 1500);
        }
      }
    });
  }
})