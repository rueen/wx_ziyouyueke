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
   * 加载最近一次课程数据
   */
  async loadCalendarData() {
    try {
      const { userRole } = this.data;
      
      wx.showLoading({
        title: '加载中...'
      });

      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo.id) {
        throw new Error('用户信息未找到');
      }

      console.log('=== 首页加载课程数据开始 ===');
      console.log('用户角色:', userRole);
      console.log('用户信息:', userInfo);

      const today = new Date();
      const startDate = this.formatDateTime(today);
      
      console.log('当前时间:', today);
      console.log('查询开始时间:', startDate);
      
      // 构建请求参数
      const baseParams = {
        page: 1,
        limit: 50,
        start_date: startDate,
        [userRole === 'coach' ? 'coach_id' : 'student_id']: userInfo.id
      };
      
      const pendingParams = { ...baseParams, status: 1 };
      const confirmedParams = { ...baseParams, status: 2 };
      
      console.log('待确认课程请求参数:', pendingParams);
      console.log('已确认课程请求参数:', confirmedParams);
      
      // 分别获取待确认和已确认的课程
      const [pendingResult, confirmedResult] = await Promise.all([
        // 获取待确认课程 (status = 1)
        api.course.getList(pendingParams),
        // 获取已确认课程 (status = 2)
        api.course.getList(confirmedParams)
      ]);
      
      wx.hideLoading();
      
      console.log('待确认课程API响应:', pendingResult);
      console.log('已确认课程API响应:', confirmedResult);
      
      // 合并所有课程数据
      const allCourses = [];
      if (pendingResult && pendingResult.data && pendingResult.data.list) {
        console.log('待确认课程数据:', pendingResult.data.list);
        allCourses.push(...pendingResult.data.list);
      } else {
        console.log('待确认课程无数据');
      }
      
      if (confirmedResult && confirmedResult.data && confirmedResult.data.list) {
        console.log('已确认课程数据:', confirmedResult.data.list);
        allCourses.push(...confirmedResult.data.list);
      } else {
        console.log('已确认课程无数据');
      }
      
      console.log('合并后的所有课程数据:', allCourses);
      console.log('课程总数:', allCourses.length);
      
      if (allCourses.length > 0) {
        // 查找最近的一次课程
        const nextCourse = this.findNextCourse(allCourses);
        console.log('找到的最近课程:', nextCourse);
        
        const finalData = {
          calendarData: nextCourse ? [nextCourse] : [],
          hasNextCourse: !!nextCourse
        };
        
        console.log('准备设置的页面数据:', finalData);
        
        this.setData(finalData);
        
        console.log('页面数据设置完成，当前calendarData:', this.data.calendarData);
      } else {
        // 没有数据时显示空状态
        console.log('没有课程数据，设置空状态');
        this.setData({
          calendarData: [],
          hasNextCourse: false
        });
      }
      
      console.log('=== 首页加载课程数据结束 ===');
      
    } catch (error) {
      wx.hideLoading();
      console.error('=== 加载课程数据失败 ===');
      console.error('错误详情:', error);
      
      // 显示空状态
      this.setData({
        calendarData: [],
        hasNextCourse: false
      });
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
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
   * 安全解析时间字符串
   */
  safeParseDateTime(dateTimeStr) {
    try {
      if (!dateTimeStr) {
        return { date: '', time: '' };
      }
      
      const parts = dateTimeStr.split(' ');
      return {
        date: parts[0] || '',
        time: parts.length > 1 ? parts[1].substring(0, 5) : ''
      };
    } catch (error) {
      console.error('解析时间字符串失败:', error, dateTimeStr);
      return { date: '', time: '' };
    }
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
   * 格式化日期时间（YYYY-MM-DD HH:mm:ss）
   */
  formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
   * 查找最近的一次课程
   */
  findNextCourse(courses) {
    console.log('=== findNextCourse 开始 ===');
    console.log('输入课程数组:', courses);
    console.log('课程数量:', courses ? courses.length : 0);
    
    if (!courses || courses.length === 0) {
      console.log('课程数组为空，返回null');
      return null;
    }
    
    const now = new Date();
    const { userRole } = this.data;
    
    console.log('当前时间:', now);
    console.log('用户角色:', userRole);
    
    // 过滤出未来的课程，并按时间排序
    const futureCourses = courses
      .filter(course => {
        console.log(`\n--- 处理课程 ${course.id} ---`);
        console.log('课程详情:', course);
        console.log('课程日期:', course.course_date);
        console.log('课程开始时间:', course.start_time);
        
        // 构建课程日期时间
        const courseDateTime = new Date(`${course.course_date} ${course.start_time}`);
        console.log('构建的课程时间对象:', courseDateTime);
        console.log('课程时间是否有效:', !isNaN(courseDateTime.getTime()));
        
        const isFuture = courseDateTime > now;
        const timeDiff = courseDateTime.getTime() - now.getTime();
        
        console.log(`课程时间: ${courseDateTime}`);
        console.log(`当前时间: ${now}`);
        console.log(`时间差: ${timeDiff}ms (${Math.round(timeDiff / 1000 / 60)}分钟)`);
        console.log(`是否未来时间: ${isFuture}`);
        
        return isFuture;
      })
      .sort((a, b) => {
        const aDateTime = new Date(`${a.course_date} ${a.start_time}`);
        const bDateTime = new Date(`${b.course_date} ${b.start_time}`);
        const diff = aDateTime - bDateTime;
        console.log(`排序比较: ${aDateTime} vs ${bDateTime}, 差值: ${diff}`);
        return diff;
      });
    
    console.log('\n--- 筛选结果 ---');
    console.log('未来课程数量:', futureCourses.length);
    console.log('未来课程列表:', futureCourses);
    
    if (futureCourses.length === 0) {
      console.log('没有找到未来的课程，返回null');
      return null;
    }
    
    const nextCourse = futureCourses[0];
    console.log('\n--- 最近课程 ---');
    console.log('选中的最近课程:', nextCourse);
    
    const courseDate = new Date(`${nextCourse.course_date} 00:00:00`);
    console.log('课程日期对象:', courseDate);
    
    const result = {
      date: nextCourse.course_date,
      dayTitle: this.formatDate(courseDate),
      timeSlots: [{
        id: nextCourse.id,
        startTime: nextCourse.start_time,
        endTime: nextCourse.end_time,
        isBooked: true,
        // 根据用户角色显示对应信息
        coachName: nextCourse.coach ? nextCourse.coach.nickname : '未知教练',
        coachAvatar: nextCourse.coach ? (nextCourse.coach.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
        studentName: nextCourse.student ? nextCourse.student.nickname : '未知学员',
        studentAvatar: nextCourse.student ? (nextCourse.student.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
        // 根据角色显示地址信息
        location: nextCourse.address ? (nextCourse.address.name || nextCourse.address.address || '未指定地点') : '未指定地点',
        remark: nextCourse.student_remark || nextCourse.coach_remark || '',
        status: this.getStatusFromApi(nextCourse.booking_status),
        statusText: this.getStatusText(this.getStatusFromApi(nextCourse.booking_status)),
        statusClass: this.getStatusFromApi(nextCourse.booking_status),
        courseId: nextCourse.id
      }]
    };
    
    console.log('\n--- 构建的返回数据 ---');
    console.log('返回结果:', result);
    console.log('=== findNextCourse 结束 ===\n');
    
    return result;
  },

  /**
   * 课程点击事件 - 跳转到课程详情
   */
  onCourseClick(e) {
    const { courseid } = e.currentTarget.dataset;
    
    if (courseid) {
      wx.navigateTo({
        url: `/pages/courseDetail/courseDetail?id=${courseid}`
      });
    }
  }
})
