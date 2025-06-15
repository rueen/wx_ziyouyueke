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
    userRole: 'student', // 'student' 学员, 'coach' 教练
    currentUserId: null, // 当前用户ID
    
    // 课程数据
    courses: [],
    
    // 分页相关
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    isRefreshing: false,
    
    // 操作状态
    operatingCourseId: null,
    
    // 取消原因模态框
    showCancelModal: false,
    cancellingCourseId: null,
    cancelReason: '',
    
    // 课程码弹窗
    showCourseCodeModal: false,
    currentCourseCode: '',
    currentCourseInfo: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 加载用户身份和用户ID
    this.loadUserInfo();
    
    // 从URL参数获取初始tab
    if (options.tab) {
      const tabIndex = parseInt(options.tab);
      if (tabIndex >= 0 && tabIndex < this.data.tabs.length) {
        this.setData({
          currentTab: tabIndex
        });
      }
    }
    
    this.loadCourses(true);
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
    this.loadCourses(true);
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
          
          const mappedCourse = {
            id: course.id,
            coachId: course.coach ? course.coach.id : 0,
            coachName: course.coach ? course.coach.nickname : '未知教练',
            coachAvatar: course.coach ? (course.coach.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
            studentName: course.student ? course.student.nickname : '未知学员',
            studentAvatar: course.student ? (course.student.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
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
        time: '2024年1月12日 15:00-18:00',
        location: '中心广场健身房',
        remark: '力量训练课程，请穿运动鞋',
        status: 'confirmed',
        createTime: '2024-01-08 10:20:00'
      },
      {
        id: 3,
        coachId: 1,
        coachName: '李教练',
        coachAvatar: '/images/defaultAvatar.png',
        time: '2024年1月08日 10:00-15:00',
        location: '社区健身房',
        remark: '',
        status: 'completed',
        createTime: '2024-01-05 16:45:00'
      },
      {
        id: 4,
        coachId: 3,
        coachName: '张教练',
        coachAvatar: '/images/defaultAvatar.png',
        time: '2024年1月14日 19:00-21:00',
        location: '舞蹈工作室',
        remark: '体态矫正课程',
        status: 'pending',
        createTime: '2024-01-09 11:15:00'
      },
      {
        id: 5,
        coachId: 2,
        coachName: '王教练',
        coachAvatar: '/images/defaultAvatar.png',
        time: '2024年1月06日 08:00-12:00',
        location: '健身中心',
        remark: '减脂训练',
        status: 'cancelled',
        cancelReason: '临时有事无法参加',
        createTime: '2024-01-03 09:30:00'
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
   * 确认课程
   */
  async onConfirmCourse(e) {
    const courseId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认课程',
      content: '确定要确认这节课程吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '确认中...'
            });

            await api.course.confirm(courseId);
            
            wx.hideLoading();
            wx.showToast({
              title: '课程已确认',
              icon: 'success'
            });

            // 重新加载课程列表
            this.loadCourses(true);
          } catch (error) {
            wx.hideLoading();
            console.error('确认课程失败:', error);
            
            wx.showToast({
              title: '确认失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 显示取消原因模态框
   */
  onShowCancelModal(e) {
    const courseId = e.currentTarget.dataset.id;
    this.setData({
      showCancelModal: true,
      cancellingCourseId: courseId,
      cancelReason: ''
    });
  },

  /**
   * 隐藏取消原因模态框
   */
  onHideCancelModal() {
    this.setData({
      showCancelModal: false,
      cancellingCourseId: null,
      cancelReason: ''
    });
  },

  /**
   * 输入取消原因
   */
  onCancelReasonInput(e) {
    this.setData({
      cancelReason: e.detail.value
    });
  },

  /**
   * 确认取消课程
   */
  async onConfirmCancel() {
    const { cancellingCourseId, cancelReason } = this.data;
    
    if (!cancelReason.trim()) {
      wx.showToast({
        title: '请填写取消原因',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '取消中...'
      });

      await api.course.cancel(cancellingCourseId, {
        cancel_reason: cancelReason.trim()
      });
      
      wx.hideLoading();
      
      // 隐藏模态框
      this.onHideCancelModal();
      
      wx.showToast({
        title: '课程已取消',
        icon: 'none'
      });

      // 重新加载课程列表
      this.loadCourses(true);
    } catch (error) {
      wx.hideLoading();
      console.error('取消课程失败:', error);
      
      wx.showToast({
        title: '取消失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 更新课程状态（本地更新，已废弃，现在直接重新加载数据）
   */
  updateCourseStatus(courseId, newStatus, cancelReason = '') {
    console.log('更新课程状态:', { courseId, newStatus, cancelReason });
    // 该方法已废弃，现在直接通过重新加载数据来更新状态
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const storedRole = wx.getStorageSync('userRole') || 'student';
    const userInfo = wx.getStorageSync('userInfo') || {};
    const currentUserId = userInfo.id || null;
    
    console.log('加载用户信息:', {
      userRole: storedRole,
      currentUserId,
      userInfo
    });
    
    this.setData({
      userRole: storedRole,
      currentUserId
    });
  },

  /**
   * 学员：查看课程码
   */
  onViewCourseCode(e) {
    const courseId = e.currentTarget.dataset.id;
    const { courses } = this.data;
    const course = courses.find(c => c.id === courseId);
    
    if (!course) {
      wx.showToast({
        title: '课程信息不存在',
        icon: 'none'
      });
      return;
    }

    // 生成课程码（实际应用中应该从后端获取）
    const courseCode = `COURSE_${courseId}_${Date.now()}`;
    
    this.setData({
      showCourseCodeModal: true,
      currentCourseCode: courseCode,
      currentCourseInfo: course
    });
  },

  /**
   * 隐藏课程码弹窗
   */
  onHideCourseCodeModal() {
    this.setData({
      showCourseCodeModal: false,
      currentCourseCode: '',
      currentCourseInfo: null
    });
  },

  /**
   * 教练：扫码核销
   */
  onScanVerify() {
    wx.scanCode({
      success: (res) => {
        console.log('扫码结果:', res);
        const scannedCode = res.result;
        
        // 这里应该调用后端API验证课程码
        this.verifyCourseCode(scannedCode);
      },
      fail: (err) => {
        console.error('扫码失败:', err);
        wx.showToast({
          title: '扫码失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 验证课程码
   */
  verifyCourseCode(courseCode) {
    // 模拟验证过程
    console.log('验证课程码:', courseCode);
    
    // 这里应该调用后端API验证
    // 模拟验证成功
    if (courseCode.startsWith('COURSE_')) {
      wx.showModal({
        title: '核销成功',
        content: '课程已完成核销，状态已更新为已完成',
        showCancel: false,
        confirmText: '确定',
        success: () => {
          // 更新课程状态为已完成
          const courseId = this.extractCourseIdFromCode(courseCode);
          if (courseId) {
            this.updateCourseStatus(courseId, 'completed');
            // 重新加载数据
            this.loadCourses(true);
          }
        }
      });
    } else {
      wx.showToast({
        title: '无效的课程码',
        icon: 'none'
      });
    }
  },

  /**
   * 从课程码中提取课程ID
   */
  extractCourseIdFromCode(courseCode) {
    try {
      const parts = courseCode.split('_');
      if (parts.length >= 2) {
        return parseInt(parts[1]);
      }
    } catch (error) {
      console.error('解析课程码失败:', error);
    }
    return null;
  }
}) 