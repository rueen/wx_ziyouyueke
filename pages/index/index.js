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
    recentCourses: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadUserInfo();
    this.loadRecentCourses();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.loadUserInfo();
    this.loadRecentCourses();
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
   * 加载近期课程
   */
  loadRecentCourses() {
    // 这里应该从后端API获取已确认的课程，目前使用静态数据
    const recentCourses = [
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
    wx.navigateTo({
      url: '/pages/bookCoach/bookCoach?from=home'
    });
  },

  /**
   * 我的教练点击事件
   */
  onMyCoachClick: function() {
    wx.navigateTo({
      url: '/pages/coachList/coachList'
    });
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
