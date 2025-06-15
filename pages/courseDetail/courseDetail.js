/**
 * pages/courseDetail/courseDetail.js
 * 课程详情页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    courseId: null,
    courseInfo: null,
    userRole: '',
    loading: true,
    
    // 取消课程相关
    showCancelModal: false,
    cancelReason: '',
    
    // 课程码相关
    showCourseCodeModal: false,
    currentCourseCode: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log('课程详情页面加载，参数：', options);
    
    if (options.id) {
      this.setData({
        courseId: options.id
      });
      
      // 获取用户角色，完成后再加载课程详情
      this.getUserRole(() => {
        this.loadCourseDetail();
      });
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 获取用户角色
   */
  getUserRole(callback) {
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
      console.error('获取用户角色失败:', error);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'error'
      });
    }
  },

  /**
   * 加载课程详情
   */
  async loadCourseDetail() {
    try {
      this.setData({ loading: true });

      const result = await api.course.getDetail(this.data.courseId);
      
      if (result && result.data) {
        const course = result.data;
        
        // 根据用户角色决定显示的头像和昵称
        let displayName, displayAvatar;
        if (this.data.userRole === 'coach') {
          // 教练视角：显示学员信息
          displayName = course.student ? course.student.nickname : '未知学员';
          displayAvatar = course.student ? (course.student.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png';
        } else {
          // 学员视角：显示教练信息
          displayName = course.coach ? course.coach.nickname : '未知教练';
          displayAvatar = course.coach ? (course.coach.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png';
        }

        const courseInfo = {
          id: course.id,
          coachId: course.coach ? course.coach.id : 0,
          coachName: course.coach ? course.coach.nickname : '未知教练',
          coachAvatar: course.coach ? (course.coach.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
          studentName: course.student ? course.student.nickname : '未知学员',
          studentAvatar: course.student ? (course.student.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
          displayName: displayName,
          displayAvatar: displayAvatar,
          displayRole: this.data.userRole === 'coach' ? '学员' : '教练',
          time: `${course.course_date} ${course.start_time}-${course.end_time}`,
          date: course.course_date,
          startTime: course.start_time,
          endTime: course.end_time,
          location: course.address ? (course.address.name || course.address.address || '未指定地点') : '未指定地点',
          remark: course.student_remark || course.coach_remark || '',
          status: this.getStatusFromApi(course.booking_status),
          createTime: course.created_at || '',
          cancelReason: course.cancel_reason || ''
        };

        this.setData({
          courseInfo: courseInfo,
          loading: false
        });
      } else {
        throw new Error(result.message || '获取课程详情失败');
      }
    } catch (error) {
      console.error('加载课程详情失败：', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * API状态码转换为中文状态
   */
  getStatusFromApi(status) {
    const statusMap = {
      1: 'pending',    // 待确认
      2: 'confirmed',  // 已确认
      3: 'completed',  // 已完成
      4: 'cancelled'   // 已取消
    };
    return statusMap[status] || 'unknown';
  },

  /**
   * 确认课程
   */
  async onConfirmCourse(e) {
    const courseId = e.currentTarget.dataset.id || this.data.courseId;
    
    try {
      wx.showLoading({ title: '确认中...' });
      
      const result = await api.course.confirm(courseId);

      wx.hideLoading();

      if (result) {
        wx.showToast({
          title: '确认成功',
          icon: 'success'
        });
        
        // 重新加载课程详情
        this.loadCourseDetail();
      } else {
        throw new Error(result.message || '确认失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('确认课程失败：', error);
      wx.showToast({
        title: error.message || '确认失败',
        icon: 'error'
      });
    }
  },

  /**
   * 显示取消模态框
   */
  onShowCancelModal(e) {
    this.setData({
      showCancelModal: true,
      cancelReason: ''
    });
  },

  /**
   * 隐藏取消模态框
   */
  onHideCancelModal() {
    this.setData({
      showCancelModal: false,
      cancelReason: ''
    });
  },

  /**
   * 取消原因输入
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
    if (!this.data.cancelReason.trim()) {
      wx.showToast({
        title: '请输入取消原因',
        icon: 'error'
      });
      return;
    }

    try {
      wx.showLoading({ title: '取消中...' });
      
      const result = await api.course.cancel(this.data.courseId, {
        cancel_reason: this.data.cancelReason.trim()
      });

      wx.hideLoading();

      if (result) {
        wx.showToast({
          title: '取消成功',
          icon: 'success'
        });
        
        this.setData({
          showCancelModal: false,
          cancelReason: ''
        });
        
        // 重新加载课程详情
        this.loadCourseDetail();
      } else {
        throw new Error(result.message || '取消失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('取消课程失败：', error);
      wx.showToast({
        title: error.message || '取消失败',
        icon: 'error'
      });
    }
  },

  /**
   * 查看课程码
   */
  onViewCourseCode(e) {
    const courseId = e.currentTarget.dataset.id || this.data.courseId;
    
    // 生成课程码（这里用简单的ID+时间戳，实际项目中应该用更安全的方式）
    const courseCode = `C${courseId}${Date.now().toString().slice(-6)}`;
    
    this.setData({
      showCourseCodeModal: true,
      currentCourseCode: courseCode
    });
  },

  /**
   * 隐藏课程码模态框
   */
  onHideCourseCodeModal() {
    this.setData({
      showCourseCodeModal: false,
      currentCourseCode: ''
    });
  },

  /**
   * 扫码核销
   */
  onScanVerify() {
    wx.scanCode({
      success: (res) => {
        console.log('扫码结果：', res);
        // 这里处理扫码核销逻辑
        wx.showToast({
          title: '核销成功',
          icon: 'success'
        });
        
        // 重新加载课程详情
        this.loadCourseDetail();
      },
      fail: (error) => {
        console.error('扫码失败：', error);
        wx.showToast({
          title: '扫码失败',
          icon: 'error'
        });
      }
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

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
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.loadCourseDetail();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
}); 