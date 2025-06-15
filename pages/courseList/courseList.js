/**
 * pages/courseList/courseList.js
 * 课程列表页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // tab相关
    currentTab: 0,
    tabs: [
      { id: 0, name: '待确认', status: 'pending', apiStatus: 1 },
      { id: 1, name: '已确认', status: 'confirmed', apiStatus: 2 },
      { id: 2, name: '已完成', status: 'completed', apiStatus: 3 },
      { id: 3, name: '已取消', status: 'cancelled', apiStatus: 4 }
    ],
    
    // 用户身份
    userRole: '', // 'student' 学员, 'coach' 教练
    currentUserId: null, // 当前用户ID
    
    // 课程数据
    courses: [],
    
    // 分页相关
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    isRefreshing: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 从URL参数获取初始tab
    if (options.tab) {
      const tabIndex = parseInt(options.tab);
      if (tabIndex >= 0 && tabIndex < this.data.tabs.length) {
        this.setData({
          currentTab: tabIndex
        });
      }
    }
    
    // 加载用户身份和用户ID，完成后再加载课程数据
    this.loadUserInfo(() => {
      this.loadCourses(true);
    });
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
    // 只有在有userRole的情况下才重新加载数据
    if (this.data.userRole) {
      this.loadCourses(true);
    }
  },

  /**
   * 加载课程数据
   * @param {boolean} isRefresh 是否是刷新操作
   */
  async loadCourses(isRefresh = false) {
    if (this.data.isLoading) return;
    
    try {
      this.setData({ isLoading: true });
      
      if (isRefresh) {
        this.setData({ 
          currentPage: 1,
          hasMore: true,
          isRefreshing: true
        });
      }

      if (!isRefresh && !this.data.hasMore) {
        this.setData({ isLoading: false });
        return;
      }

      // 构建请求参数
      const { currentTab, tabs, userRole, currentUserId, currentPage, pageSize } = this.data;
      const currentTabData = tabs[currentTab];
      
      const params = {
        page: currentPage,
        limit: pageSize,
        status: currentTabData.apiStatus
      };

      // 根据用户角色添加对应的用户ID
      if (userRole === 'coach' && currentUserId) {
        params.coach_id = currentUserId;
      } else if (userRole === 'student' && currentUserId) {
        params.student_id = currentUserId;
      }

      console.log('加载课程数据，请求参数:', params);

      const result = await api.course.getList(params);
      
      console.log('API返回的原始数据:', result);
      
      if (result && result.data && result.data.courses) {
        console.log('课程原始数据:', result.data.courses);
        
        // 格式化API数据为前端需要的格式
        const newCourses = result.data.courses.map((course, index) => {
          console.log(`处理第${index + 1}条课程数据:`, course);
          
          // 根据用户角色决定显示的头像和昵称
          let displayName, displayAvatar;
          if (userRole === 'coach') {
            // 教练视角：显示学员信息
            displayName = course.student ? course.student.nickname : '未知学员';
            displayAvatar = course.student ? (course.student.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png';
          } else {
            // 学员视角：显示教练信息
            displayName = course.coach ? course.coach.nickname : '未知教练';
            displayAvatar = course.coach ? (course.coach.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png';
          }

          const mappedCourse = {
            id: course.id,
            coachId: course.coach ? course.coach.id : 0,
            coachName: course.coach ? course.coach.nickname : '未知教练',
            coachAvatar: course.coach ? (course.coach.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
            studentName: course.student ? course.student.nickname : '未知学员',
            studentAvatar: course.student ? (course.student.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
            // 根据角色动态显示的信息
            displayName: displayName,
            displayAvatar: displayAvatar,
            displayRole: userRole === 'coach' ? '学员' : '教练',
            time: `${course.course_date} ${course.start_time}-${course.end_time}`,
            location: course.address ? (course.address.name || course.address.address || '未指定地点') : '未指定地点',
            remark: course.student_remark || course.coach_remark || '',
            status: this.getStatusFromApi(course.booking_status),
            createTime: course.created_at || '',
            cancelReason: course.cancel_reason || ''
          };
          
          console.log(`映射后的课程数据:`, mappedCourse);
          return mappedCourse;
        });

        // 处理分页数据
        const { pagination } = result.data;
        const hasMore = pagination ? pagination.current_page < pagination.total_pages : false;
        
        let courses;
        if (isRefresh || currentPage === 1) {
          courses = newCourses;
        } else {
          courses = [...this.data.courses, ...newCourses];
        }

        this.setData({
          courses,
          currentPage: currentPage + 1,
          hasMore,
          isLoading: false,
          isRefreshing: false
        });

        console.log('API加载课程数据成功:', {
          newCoursesCount: newCourses.length,
          totalCoursesCount: courses.length,
          hasMore,
          currentPage: currentPage + 1,
          finalCourses: courses
        });
        
        console.log('当前页面数据状态:', this.data);
        
      } else {
        // 没有课程数据
        console.log('API返回了数据但没有courses字段，设置空数组');
        this.setData({
          courses: isRefresh ? [] : this.data.courses,
          hasMore: false,
          isLoading: false,
          isRefreshing: false
        });
      }
    } catch (error) {
      console.error('加载课程数据失败:', error);
      
      this.setData({
        isLoading: false,
        isRefreshing: false
      });
      
      // 如果是首次加载失败，使用静态数据
      if (isRefresh || this.data.courses.length === 0) {
        console.log('使用静态数据作为后备');
        this.loadStaticCourses();
      }
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
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
    const mappedStatus = statusMap[apiStatus] || 'pending';
    console.log(`状态映射: API状态码 ${apiStatus} -> 前端状态 ${mappedStatus}`);
    return mappedStatus;
  },

  /**
   * 加载静态课程数据（后备方案）
   */
  loadStaticCourses() {
    const courses = [
      {
        id: 1,
        coachId: 1,
        coachName: '李教练',
        coachAvatar: '/images/defaultAvatar.png',
        displayName: '李教练',
        displayAvatar: '/images/defaultAvatar.png',
        displayRole: '教练',
        time: '2024年1月15日 09:00-12:00',
        location: '万达广场健身房',
        remark: '第一次瑜伽课，请提前10分钟到达',
        status: 'pending',
        createTime: '2024-01-10 14:30:00'
      },
      {
        id: 2,
        coachId: 2,
        coachName: '王教练',
        coachAvatar: '/images/defaultAvatar.png',
        displayName: '王教练',
        displayAvatar: '/images/defaultAvatar.png',
        displayRole: '教练',
        time: '2024年1月12日 15:00-18:00',
        location: '中心广场健身房',
        remark: '力量训练课程，请穿运动鞋',
        status: 'confirmed',
        createTime: '2024-01-08 10:20:00'
      }
    ];
    
    this.setData({
      courses
    });
  },

  /**
   * 切换tab
   */
  onTabChange(e) {
    const tabIndex = e.currentTarget.dataset.index;
    if (tabIndex === this.data.currentTab) return;
    
    this.setData({
      currentTab: tabIndex,
      courses: [], // 清空当前数据
      currentPage: 1,
      hasMore: true
    });
    
    // 重新加载对应状态的课程数据
    this.loadCourses(true);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    console.log('下拉刷新触发');
    this.loadCourses(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    console.log('上拉加载更多触发');
    if (!this.data.isLoading && this.data.hasMore) {
      this.loadCourses(false);
    }
  },

  /**
   * 点击课程项跳转到详情页
   */
  onCourseItemTap(e) {
    const courseId = e.currentTarget.dataset.id;
    console.log('点击课程项，ID：', courseId);
    
    if (courseId) {
      wx.navigateTo({
        url: `/pages/courseDetail/courseDetail?id=${courseId}`
      });
    }
  },

  /**
   * 加载用户信息
   */
  loadUserInfo(callback) {
    try {
      const userRole = wx.getStorageSync('userRole');
      const userInfo = wx.getStorageSync('userInfo');
      
      console.log('加载用户角色:', userRole);
      console.log('加载用户信息:', userInfo);
      
      if (userRole && userInfo) {
        this.setData({
          userRole: userRole,
          currentUserId: userInfo.id || null
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
      console.error('加载用户信息失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
}); 