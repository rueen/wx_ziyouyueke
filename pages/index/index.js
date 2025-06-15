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
    userInfo: {},
    // 日历式课表数据
    calendarData: [],
    // 用户身份
    userRole: '' // 'student' 学员, 'coach' 教练
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
    
    // 加载用户角色，完成后再加载日历数据
    this.loadUserRole(() => {
      this.loadCalendarData();
    });
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
      const [profileResult] = await Promise.all([
        api.user.getProfile(),
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
  loadUserRole(callback) {
    try {
      const userRole = wx.getStorageSync('userRole');
      const userInfo = wx.getStorageSync('userInfo');
      
      console.log('加载用户角色:', userRole);
      console.log('加载用户信息:', userInfo);
      
      if (userRole && userInfo) {
        this.setData({
          userRole: userRole
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
   * 加载日历式课表数据
   */
  async loadCalendarData() {
    try {
      const { userRole } = this.data;
      
      wx.showLoading({
        title: '加载中...'
      });

      // 获取近三天的日期
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const dayAfterTomorrow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
      
      const startDate = this.formatDateKey(today);
      const endDate = this.formatDateKey(dayAfterTomorrow);
      
      // 从API获取课程数据
      const result = await api.course.getList({
        role: userRole,
        start_date: startDate,
        end_date: endDate,
        page: 1,
        page_size: 50
      });
      
      wx.hideLoading();
      
      if (result && result.data && result.data.courses) {
        const courses = result.data.courses;
        
        if (userRole === 'student') {
          // 学员视角：只显示已预约的课程
          const calendarData = this.generateStudentCalendarData([today, tomorrow, dayAfterTomorrow], courses);
          this.setData({ calendarData });
        } else {
          // 教练视角：需要获取时间模板，然后显示所有时间段
          await this.loadCoachCalendarData([today, tomorrow, dayAfterTomorrow], courses);
        }
      } else {
        // 没有数据时显示空状态
        this.setData({
          calendarData: []
        });
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('加载日历数据失败:', error);
      
      // 显示空状态
      this.setData({
        calendarData: []
      });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 加载教练视角的日历数据
   */
  async loadCoachCalendarData(dates, bookedCourses) {
    try {
      // 获取时间模板
      const templateResult = await api.timeTemplate.getList();
      const timeTemplate = templateResult && templateResult.data ? templateResult.data : [];
      
      if (timeTemplate.length === 0) {
        // 没有时间模板，显示空状态
        this.setData({
          calendarData: []
        });
        return;
      }
      
      // 生成教练的日历数据（显示所有时间段）
      const calendarData = dates.map(date => ({
        date: this.formatDateKey(date),
        dayTitle: this.getDayTitle(date),
        dateStr: this.formatDate(date),
        timeSlots: this.generateDayTimeSlots(date, timeTemplate, bookedCourses)
      }));
      
      this.setData({
        calendarData
      });
      
    } catch (error) {
      console.error('加载教练日历数据失败:', error);
      this.setData({
        calendarData: []
      });
    }
  },

  /**
   * 生成学员的日历数据（只显示已预约课程）
   */
  generateStudentCalendarData(dates, courses) {
    return dates.map(date => {
      const dateKey = this.formatDateKey(date);
      const dayTitle = this.getDayTitle(date);
      
      // 过滤出该日期的预约课程
      const dayBookings = courses
        .filter(course => {
          const courseDate = course.start_time ? course.start_time.split(' ')[0] : '';
          return courseDate === dateKey;
        })
        .map(course => ({
          id: course.id,
          startTime: course.start_time ? course.start_time.split(' ')[1].substring(0, 5) : '',
          endTime: course.end_time ? course.end_time.split(' ')[1].substring(0, 5) : '',
          isBooked: true,
          coachName: course.coach ? course.coach.nickname : '未知教练',
          coachAvatar: course.coach ? (course.coach.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
          location: course.notes || '未指定地点',
          remark: course.notes || '',
          status: this.getStatusFromApi(course.booking_status),
          statusText: this.getStatusText(this.getStatusFromApi(course.booking_status)),
          statusClass: this.getStatusFromApi(course.booking_status),
          courseId: course.id
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
  generateDayTimeSlots(date, timeTemplate, courses) {
    const dateKey = this.formatDateKey(date);
    
    return timeTemplate.map(slot => {
      // 查找该时间段是否有预约
      const booking = courses.find(course => {
        const courseDate = course.start_time ? course.start_time.split(' ')[0] : '';
        const courseStartTime = course.start_time ? course.start_time.split(' ')[1].substring(0, 5) : '';
        const courseEndTime = course.end_time ? course.end_time.split(' ')[1].substring(0, 5) : '';
        
        return courseDate === dateKey && 
               courseStartTime === slot.start_time && 
               courseEndTime === slot.end_time;
      });
      
      if (booking) {
        // 有预约，返回预约信息
        return {
          id: slot.id,
          startTime: slot.start_time,
          endTime: slot.end_time,
          isBooked: true,
          studentName: booking.student ? booking.student.nickname : '未知学员',
          studentAvatar: booking.student ? (booking.student.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
          location: booking.notes || '未指定地点',
          remark: booking.notes || '',
          status: this.getStatusFromApi(booking.booking_status),
          statusText: this.getStatusText(this.getStatusFromApi(booking.booking_status)),
          statusClass: this.getStatusFromApi(booking.booking_status),
          courseId: booking.id
        };
      } else {
        // 无预约，返回空闲时间段
        return {
          id: slot.id,
          startTime: slot.start_time,
          endTime: slot.end_time,
          isBooked: false
        };
      }
    });
  },

  /**
   * 将API状态码转换为前端状态
   */
  getStatusFromApi(apiStatus) {
    const statusMap = {
      1: 'pending',      // 待确认
      2: 'confirmed',    // 已确认  
      3: 'completed',    // 已完成
      4: 'cancelled'     // 已取消
    };
    return statusMap[apiStatus] || 'pending';
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
