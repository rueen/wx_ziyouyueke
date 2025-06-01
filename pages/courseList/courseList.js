/**
 * pages/courseList/courseList.js
 * 课程列表页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // tab相关
    currentTab: 0,
    tabs: [
      { id: 0, name: '待确认', status: 'pending' },
      { id: 1, name: '已确认', status: 'confirmed' },
      { id: 2, name: '已完成', status: 'completed' },
      { id: 3, name: '已取消', status: 'cancelled' }
    ],
    
    // 课程数据
    courses: [],
    filteredCourses: [], // 当前tab显示的课程
    
    // 操作状态
    operatingCourseId: null,
    
    // 取消原因模态框
    showCancelModal: false,
    cancellingCourseId: null,
    cancelReason: ''
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
    
    this.loadCourses();
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
    this.loadCourses();
  },

  /**
   * 加载课程数据
   */
  loadCourses() {
    // 这里应该从后端API获取，目前使用静态数据
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
    
    // 过滤当前tab的课程
    this.filterCourses();
  },

  /**
   * 切换tab
   */
  onTabChange(e) {
    const tabIndex = e.currentTarget.dataset.index;
    this.setData({
      currentTab: tabIndex
    });
    this.filterCourses();
  },

  /**
   * 过滤课程数据
   */
  filterCourses() {
    const { currentTab, tabs, courses } = this.data;
    const currentStatus = tabs[currentTab].status;
    
    const filteredCourses = courses.filter(course => course.status === currentStatus);
    
    this.setData({
      filteredCourses
    });
  },

  /**
   * 确认课程
   */
  onConfirmCourse(e) {
    const courseId = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认课程',
      content: '确定要确认这节课程吗？',
      success: (res) => {
        if (res.confirm) {
          this.updateCourseStatus(courseId, 'confirmed');
          wx.showToast({
            title: '课程已确认',
            icon: 'success'
          });
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
  onConfirmCancel() {
    const { cancellingCourseId, cancelReason } = this.data;
    
    if (!cancelReason.trim()) {
      wx.showToast({
        title: '请填写取消原因',
        icon: 'none'
      });
      return;
    }

    // 更新课程状态并保存取消原因
    this.updateCourseStatus(cancellingCourseId, 'cancelled', cancelReason.trim());
    
    // 隐藏模态框
    this.onHideCancelModal();
    
    wx.showToast({
      title: '课程已取消',
      icon: 'none'
    });
  },

  /**
   * 更新课程状态
   */
  updateCourseStatus(courseId, newStatus, cancelReason = '') {
    const { courses } = this.data;
    const updatedCourses = courses.map(course => {
      if (course.id === courseId) {
        const updatedCourse = { ...course, status: newStatus };
        if (newStatus === 'cancelled' && cancelReason) {
          updatedCourse.cancelReason = cancelReason;
        }
        return updatedCourse;
      }
      return course;
    });
    
    this.setData({
      courses: updatedCourses
    });
    
    // 重新过滤课程
    this.filterCourses();
  }
}) 