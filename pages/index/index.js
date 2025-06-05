/**
 * index.js
 * 首页逻辑
 */

// 引入API工具类
const api = require('../../utils/api.js');

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
    // 日历式课表数据
    calendarData: [],
    // 用户身份
    userRole: 'student' // 'student' 学员, 'coach' 教练
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return;
    }
    
    this.loadUserInfo();
    this.loadUserRole();
    this.loadCalendarData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 检查登录状态
    if (!this.checkLoginStatus()) {
      return;
    }
    
    // 检查是否需要刷新用户信息（从个人信息编辑页面返回时）
    const userInfoUpdated = wx.getStorageSync('userInfoUpdated');
    if (userInfoUpdated) {
      wx.removeStorageSync('userInfoUpdated');
      this.loadUserInfo();
    }
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
  async loadUserInfo() {
    try {
      // 从API获取用户信息和统计数据
      const [profileResult, statsResult] = await Promise.all([
        api.user.getProfile(),
        api.user.getStats()
      ]);

      // 更新用户基本信息
      if (profileResult && profileResult.data) {
        const user = profileResult.data;
        this.setData({
          userInfo: {
            name: user.nickname || '用户',
            avatar: user.avatar_url || '/images/defaultAvatar.png'
          }
        });
        
        // 更新本地缓存
        wx.setStorageSync('userInfo', user);
      }

      // 更新统计信息
      if (statsResult && statsResult.data) {
        const stats = statsResult.data;
        // 根据用户角色设置不同的统计数据
        let displayStats = {
          points: 0,
          energy: 0,
          coupons: 0
        };

        if (stats.roles && stats.roles.isCoach && stats.coachStats) {
          displayStats = {
            points: stats.coachStats.totalStudents || 0,
            energy: stats.coachStats.totalCourses || 0,
            coupons: stats.coachStats.completedCourses || 0
          };
        } else if (stats.roles && stats.roles.isStudent && stats.studentStats) {
          displayStats = {
            points: stats.studentStats.remainingLessons || 0,
            energy: stats.studentStats.totalCourses || 0,
            coupons: stats.studentStats.completedCourses || 0
          };
        }

        this.setData({
          stats: displayStats
        });
      }

    } catch (error) {
      console.error('加载用户信息失败:', error);
      // API调用失败时使用本地缓存
      const storedUserInfo = wx.getStorageSync('userInfo');
      if (storedUserInfo && (storedUserInfo.nickName || storedUserInfo.nickname)) {
        this.setData({
          userInfo: {
            name: storedUserInfo.nickName || storedUserInfo.nickname || '用户',
            avatar: storedUserInfo.avatarUrl || storedUserInfo.avatar_url || '/images/defaultAvatar.png'
          }
        });
      } else {
        // 确保有默认值
        this.setData({
          userInfo: {
            name: '用户',
            avatar: '/images/defaultAvatar.png'
          }
        });
      }
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
   * 加载日历式课表数据
   */
  loadCalendarData() {
    const { userRole } = this.data;
    
    // 获取近三天的日期
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
    
    if (userRole === 'student') {
      // 学员视角：只显示已预约的课程，不显示空闲时间
      const bookedCourses = [
        {
          date: this.formatDateKey(today),
          startTime: '09:00',
          endTime: '12:00',
          coachName: '李教练',
          coachAvatar: '/images/defaultAvatar.png',
          location: '万达广场健身房',
          remark: '瑜伽课程，请提前10分钟到达',
          status: 'confirmed'
        },
        {
          date: this.formatDateKey(tomorrow),
          startTime: '14:00',
          endTime: '17:00',
          coachName: '王教练',
          coachAvatar: '/images/defaultAvatar.png',
          location: '中心广场健身房',
          remark: '力量训练课程，请穿运动鞋',
          status: 'pending'
        },
        {
          date: this.formatDateKey(dayAfterTomorrow),
          startTime: '19:00',
          endTime: '21:00',
          coachName: '张教练',
          coachAvatar: '/images/defaultAvatar.png',
          location: '舞蹈工作室',
          remark: '体态矫正课程',
          status: 'confirmed'
        }
      ];
      
      // 生成学员的日历数据（只显示已预约课程）
      const calendarData = this.generateStudentCalendarData([today, tomorrow, dayAfterTomorrow], bookedCourses);
      
      this.setData({
        calendarData
      });
      
    } else {
      // 教练视角：显示时间模板中的所有时间段
      const timeTemplate = [
        { id: 1, startTime: '09:00', endTime: '12:00' },
        { id: 2, startTime: '14:00', endTime: '17:00' },
        { id: 3, startTime: '19:00', endTime: '21:00' }
      ];
      
      const bookedCourses = [
        {
          date: this.formatDateKey(today),
          timeSlotId: 1,
          studentName: '小李',
          studentAvatar: '/images/defaultAvatar.png',
          location: '万达广场健身房',
          remark: '瑜伽课程',
          status: 'confirmed'
        },
        {
          date: this.formatDateKey(tomorrow),
          timeSlotId: 2,
          studentName: '小王',
          studentAvatar: '/images/defaultAvatar.png',
          location: '中心广场健身房',
          remark: '力量训练课程',
          status: 'pending'
        }
      ];
      
      // 生成教练的日历数据（显示所有时间段）
      const calendarData = [
        {
          date: this.formatDateKey(today),
          dayTitle: '今天',
          dateStr: this.formatDate(today),
          timeSlots: this.generateDayTimeSlots(today, timeTemplate, bookedCourses)
        },
        {
          date: this.formatDateKey(tomorrow),
          dayTitle: '明天',
          dateStr: this.formatDate(tomorrow),
          timeSlots: this.generateDayTimeSlots(tomorrow, timeTemplate, bookedCourses)
        },
        {
          date: this.formatDateKey(dayAfterTomorrow),
          dayTitle: '后天',
          dateStr: this.formatDate(dayAfterTomorrow),
          timeSlots: this.generateDayTimeSlots(dayAfterTomorrow, timeTemplate, bookedCourses)
        }
      ];
      
      this.setData({
        calendarData
      });
    }
  },

  /**
   * 生成学员的日历数据（只显示已预约课程）
   */
  generateStudentCalendarData(dates, bookedCourses) {
    return dates.map(date => {
      const dateKey = this.formatDateKey(date);
      const dayTitle = this.getDayTitle(date);
      
      // 过滤出该日期的预约课程
      const dayBookings = bookedCourses
        .filter(course => course.date === dateKey)
        .map(course => ({
          id: `${course.date}_${course.startTime}`,
          startTime: course.startTime,
          endTime: course.endTime,
          isBooked: true,
          coachName: course.coachName,
          coachAvatar: course.coachAvatar,
          location: course.location,
          remark: course.remark,
          status: course.status,
          statusText: this.getStatusText(course.status),
          statusClass: course.status
        }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)); // 按时间排序
      
      return {
        date: dateKey,
        dayTitle: dayTitle,
        dateStr: this.formatDate(date),
        timeSlots: dayBookings
      };
    }).filter(day => day.timeSlots.length > 0); // 只保留有课程的日期
  },

  /**
   * 获取日期标题
   */
  getDayTitle(date) {
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '明天';
    if (diffDays === 2) return '后天';
    return this.formatDate(date);
  },

  /**
   * 生成某一天的时间段数据
   */
  generateDayTimeSlots(date, timeTemplate, bookedCourses) {
    const dateKey = this.formatDateKey(date);
    
    return timeTemplate.map(slot => {
      // 查找该时间段是否有预约
      const booking = bookedCourses.find(course => 
        course.date === dateKey && course.timeSlotId === slot.id
      );
      
      if (booking) {
        // 有预约，返回预约信息
        return {
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked: true,
          ...booking,
          statusText: this.getStatusText(booking.status),
          statusClass: booking.status
        };
      } else {
        // 无预约，返回空闲时间段
        return {
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked: false
        };
      }
    });
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      'pending': '待确认',
      'confirmed': '已确认',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || '未知';
  },

  /**
   * 格式化日期为键值（YYYY-MM-DD）
   */
  formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
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
   * 我的课程点击事件
   */
  onPendingCoursesClick: function() {
    wx.navigateTo({
      url: '/pages/courseList/courseList?tab=0'
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
