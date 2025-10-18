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
    // 日历式课表数据
    calendarData: [],
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
    // 总是重新加载用户信息（确保登录状态变化后能及时更新）
    this.loadUserInfo();
    
    // 重新加载用户角色（从登录页面返回时需要更新）
    this.loadUserRole(() => {
      // 用户角色更新后，重新加载课程数据
      this.loadCalendarData();
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
      avatar_url: '/images/defaultAvatar.png',
      loginType: 'guest'
    };

    wx.setStorageSync('userInfo', guestUserInfo);
    wx.setStorageSync('isLoggedIn', true); // 设置为已登录状态，但是游客模式
    wx.setStorageSync('loginType', 'guest');
    wx.setStorageSync('userRole', 'student'); // 默认设置为学员角色
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
            avatar: (storedUserInfo && storedUserInfo.avatar_url) || '/images/defaultAvatar.png'
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
            name: user.nickname || '用户',
            avatar: user.avatar_url || '/images/defaultAvatar.png',
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
   * 加载最近一次课程数据
   */
  async loadCalendarData() {
    try {
      const { userRole } = this.data;
      
      // 检查登录类型，游客模式不调用API
      const loginType = wx.getStorageSync('loginType');
      if (loginType === 'guest') {
        this.setData({
          calendarData: [],
          hasNextCourse: false
        });
        return;
      }
      
      wx.showLoading({
        title: '加载中...'
      });

      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo.id) {
        throw new Error('用户信息未找到');
      }

      const today = new Date();
      const startDate = this.formatDateTime(today);
      
      // 构建请求参数
      const baseParams = {
        page: 1,
        limit: 50,
        start_date: startDate,
        [userRole === 'coach' ? 'coach_id' : 'student_id']: userInfo.id
      };
      
      const pendingParams = { ...baseParams, status: 1 };
      const confirmedParams = { ...baseParams, status: 2 };
      
      // 分别获取待确认和已确认的课程
      const [pendingResult, confirmedResult] = await Promise.all([
        // 获取待确认课程 (status = 1)
        api.course.getList(pendingParams),
        // 获取已确认课程 (status = 2)
        api.course.getList(confirmedParams)
      ]);
      
      wx.hideLoading();
      
      // 合并所有课程数据
      const allCourses = [];
      if (pendingResult && pendingResult.data && pendingResult.data.list) {
        allCourses.push(...pendingResult.data.list);
      }
      
      if (confirmedResult && confirmedResult.data && confirmedResult.data.list) {
        allCourses.push(...confirmedResult.data.list);
      }
      
      if (allCourses.length > 0) {
        // 查找最近的一次课程
        const nextCourse = this.findNextCourse(allCourses);
        
        const finalData = {
          calendarData: nextCourse ? [nextCourse] : [],
          hasNextCourse: !!nextCourse
        };
        
        this.setData(finalData);
      } else {
        // 没有数据时显示空状态
        this.setData({
          calendarData: [],
          hasNextCourse: false
        });
      }
      
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
      4: 'cancelled',     // 已取消
      5: 'cancelled'     // 超时已取消
    };
    return statusMap[apiStatus] || 'pending';
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
   * 我的课程点击事件
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

  /**
   * 查找最近的一次课程
   */
  findNextCourse(courses) {
    if (!courses || courses.length === 0) {
      return null;
    }
    
    const now = new Date();
    const { userRole } = this.data;
    
    // 过滤出未来的课程，并按时间排序
    const futureCourses = courses
      .filter(course => {
        // 构建课程日期时间，使用兼容iOS的格式
        const dateTimeStr = `${course.course_date}T${course.start_time}`;
        const courseDateTime = new Date(dateTimeStr);
        
        const isFuture = courseDateTime > now;
        const timeDiff = courseDateTime.getTime() - now.getTime();
        
        return isFuture;
      })
      .sort((a, b) => {
        const aDateTimeStr = `${a.course_date}T${a.start_time}`;
        const bDateTimeStr = `${b.course_date}T${b.start_time}`;
        const aDateTime = new Date(aDateTimeStr);
        const bDateTime = new Date(bDateTimeStr);
        const diff = aDateTime - bDateTime;
        return diff;
      });
    
    if (futureCourses.length === 0) {
      return null;
    }
    
    const nextCourse = futureCourses[0];
    
    const courseDate = new Date(`${nextCourse.course_date}T00:00:00`);
    
    // 判断当前用户是否为课程创建人
    const isCreatedByCurrentUser = nextCourse.created_by && nextCourse.created_by == this.data.currentUserId;
    const nextCourse_start_time = `${nextCourse.start_time.split(':')[0]}:${nextCourse.start_time.split(':')[1]}`;
    const nextCourse_end_time = `${nextCourse.end_time.split(':')[0]}:${nextCourse.end_time.split(':')[1]}`;
    const result = {
      date: nextCourse.course_date,
      dayTitle: this.formatDate(courseDate),
      timeSlots: [{
        id: nextCourse.id,
        startTime: nextCourse_start_time,
        endTime: nextCourse_end_time,
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
        courseId: nextCourse.id,
        isCreatedByCurrentUser: isCreatedByCurrentUser
      }]
    };
    
    return result;
  },

  /**
   * 课程点击事件 - 跳转到课程详情
   */
  onCourseClick(e) {
    // 检查是否需要登录
    if (!this.checkLoginRequired()) {
      return;
    }
    
    const { courseid } = e.currentTarget.dataset;
    
    if (courseid) {
      wx.navigateTo({
        url: `/pages/courseDetail/courseDetail?id=${courseid}`
      });
    }
  }
})
