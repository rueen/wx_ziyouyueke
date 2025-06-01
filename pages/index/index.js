/**
 * index.js
 * 首页逻辑
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      name: 'rueen',
      avatar: '/images/defaultAvatar.png'
    },
    stats: {
      points: 0,
      energy: 0,
      coupons: 1
    },
    // 近期课程
    recentCourses: [],
    // 用户身份
    userRole: 'student' // 'student' 学员, 'coach' 教练
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查登录状态
    this.checkLoginStatus();
    
    this.loadUserInfo();
    this.loadUserRole();
    this.loadRecentCourses();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 检查登录状态
    this.checkLoginStatus();
    
    this.loadUserInfo();
    this.loadUserRole();
    this.loadRecentCourses();
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
   * 加载用户信息
   */
  loadUserInfo() {
    const storedUserInfo = wx.getStorageSync('userInfo');
    if (storedUserInfo && storedUserInfo.nickName) {
      this.setData({
        userInfo: {
          name: storedUserInfo.nickName,
          avatar: storedUserInfo.avatarUrl || '/images/defaultAvatar.png'
        }
      });
    } else {
      // 确保有默认值
      this.setData({
        userInfo: {
          name: 'rueen',
          avatar: '/images/defaultAvatar.png'
        }
      });
    }
  },

  /**
   * 加载用户身份
   */
  loadUserRole() {
    const storedRole = wx.getStorageSync('userRole') || 'student';
    this.setData({
      userRole: storedRole
    });
  },

  /**
   * 加载近期课程
   */
  loadRecentCourses() {
    const { userRole } = this.data;
    
    // 根据身份加载不同的课程数据
    let recentCourses = [];
    
    if (userRole === 'student') {
      // 学员身份：显示已确认的课程（教练信息）
      recentCourses = [
        {
          id: 2,
          coachId: 2,
          coachName: '王教练',
          coachAvatar: '/images/defaultAvatar.png',
          time: '2024年1月12日 15:00-18:00',
          location: '中心广场健身房',
          remark: '力量训练课程，请穿运动鞋',
          status: 'confirmed'
        },
        {
          id: 6,
          coachId: 1,
          coachName: '李教练',
          coachAvatar: '/images/defaultAvatar.png',
          time: '2024年1月16日 09:00-12:00',
          location: '万达广场健身房',
          remark: '瑜伽课程',
          status: 'confirmed'
        },
        {
          id: 7,
          coachId: 3,
          coachName: '张教练',
          coachAvatar: '/images/defaultAvatar.png',
          time: '2024年1月18日 19:00-21:00',
          location: '舞蹈工作室',
          remark: '体态矫正',
          status: 'confirmed'
        }
      ];
    } else {
      // 教练身份：显示已确认的课程（学员信息）
      recentCourses = [
        {
          id: 2,
          studentId: 1,
          studentName: '小李',
          studentAvatar: '/images/defaultAvatar.png',
          time: '2024年1月12日 15:00-18:00',
          location: '中心广场健身房',
          remark: '力量训练课程',
          status: 'confirmed'
        },
        {
          id: 6,
          studentId: 2,
          studentName: '小王',
          studentAvatar: '/images/defaultAvatar.png',
          time: '2024年1月16日 09:00-12:00',
          location: '万达广场健身房',
          remark: '瑜伽课程',
          status: 'confirmed'
        },
        {
          id: 7,
          studentId: 3,
          studentName: '小张',
          studentAvatar: '/images/defaultAvatar.png',
          time: '2024年1月18日 19:00-21:00',
          location: '舞蹈工作室',
          remark: '体态矫正',
          status: 'confirmed'
        }
      ];
    }
    
    this.setData({
      recentCourses
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    
  },

  /**
   * 约课按钮点击事件
   */
  onBookCourse: function() {
    const { userRole } = this.data;
    
    if (userRole === 'student') {
      // 学员身份：约教练
      wx.navigateTo({
        url: '/pages/bookCoach/bookCoach?from=home'
      });
    } else {
      // 教练身份：约学员
      wx.navigateTo({
        url: '/pages/bookStudent/bookStudent?from=home'
      });
    }
  },

  /**
   * 我的教练/我的学员点击事件
   */
  onMyCoachOrStudentClick: function() {
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
   * 待确认课程点击事件
   */
  onPendingCoursesClick: function() {
    wx.navigateTo({
      url: '/pages/courseList/courseList?tab=0'
    });
  },

  /**
   * 查看更多课程
   */
  onViewMoreCourses: function() {
    wx.navigateTo({
      url: '/pages/courseList/courseList?tab=1'
    });
  },

  /**
   * 统计项点击事件
   */
  onStatClick: function(e) {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  }
})
