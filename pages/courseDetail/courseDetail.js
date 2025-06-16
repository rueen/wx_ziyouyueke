/**
 * pages/courseDetail/courseDetail.js
 * 课程详情页面
 */

// 引入API工具类
const api = require('../../utils/api.js');
// 引入二维码生成工具
const drawQrcode = require('../../utils/weapp-qrcode/weapp.qrcode.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    courseId: null,
    courseInfo: null,
    userRole: '',
    currentUserId: null,
    loading: true,
    
    // 取消课程相关
    showCancelModal: false,
    cancelReason: '',
    
    // 课程码相关
    showCourseCodeModal: false,
    currentCourseCode: '',
    qrCodeImagePath: '' // 二维码图片路径
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    
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
      
      if (userRole && userInfo) {
        this.setData({
          userRole: userRole,
          currentUserId: userInfo.id
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

        // 判断当前用户是否为课程创建人
        const isCreatedByCurrentUser = course.created_by && course.created_by == this.data.currentUserId;

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
          cancelReason: course.cancel_reason || '',
          createdBy: course.created_by,
          isCreatedByCurrentUser: isCreatedByCurrentUser
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
    
    // 显示模态框
    this.setData({
      showCourseCodeModal: true,
      currentCourseCode: courseId.toString()
    });

    // 生成二维码
    this.generateQRCode(courseId.toString());
  },

  /**
   * 生成二维码
   * @param {string} courseId 课程ID
   */
  generateQRCode(courseId) {
    try {
      // 使用weapp-qrcode生成二维码
      drawQrcode({
        width: 150, // 使用像素单位，300rpx约等于150px
        height: 150,
        canvasId: 'qrcode-canvas',
        text: courseId,
        typeNumber: -1,
        correctLevel: 1, // L级别纠错
        background: '#ffffff',
        foreground: '#000000',
        _this: this,
        callback: (res) => {
          // 延迟一下再转换图片，确保绘制完成
          setTimeout(() => {
            this.canvasToTempFilePath();
          }, 100);
        }
      });
    } catch (error) {
      console.error('生成二维码失败:', error);
      wx.showToast({
        title: '生成二维码失败',
        icon: 'error'
      });
    }
  },

  /**
   * 将canvas转换为临时图片文件
   */
  canvasToTempFilePath() {
    wx.canvasToTempFilePath({
      x: 0,
      y: 0,
      width: 150,
      height: 150,
      destWidth: 300,
      destHeight: 300,
      canvasId: 'qrcode-canvas',
      success: (res) => {
        this.setData({
          qrCodeImagePath: res.tempFilePath
        });
      },
      fail: (error) => {
        console.error('转换二维码图片失败:', error);
        console.error('错误详情:', error);
        wx.showToast({
          title: '生成二维码图片失败',
          icon: 'error'
        });
      }
    }, this);
  },

  /**
   * 隐藏课程码模态框
   */
  onHideCourseCodeModal() {
    this.setData({
      showCourseCodeModal: false,
      currentCourseCode: '',
      qrCodeImagePath: '' // 清除二维码图片路径
    });
  },

  /**
   * 扫码核销
   */
  onScanVerify() {
    wx.scanCode({
      success: (res) => {
        const scannedCourseId = res.result;
        
        // 验证扫描的课程ID是否与当前课程匹配
        if (scannedCourseId === this.data.courseId.toString()) {
          // 调用完成课程接口
          this.completeCourse(scannedCourseId);
        } else {
          wx.showModal({
            title: '扫码错误',
            content: '扫描的二维码与当前课程不匹配，请确认后重试',
            showCancel: false,
            confirmText: '确定'
          });
        }
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
   * 完成课程
   * @param {string} courseId 课程ID
   */
  async completeCourse(courseId) {
    try {
      wx.showLoading({ title: '核销中...' });
      
      const result = await api.course.complete(courseId);

      wx.hideLoading();

      if (result) {
        wx.showToast({
          title: '核销成功',
          icon: 'success'
        });
        
        // 重新加载课程详情
        this.loadCourseDetail();
      } else {
        throw new Error(result.message || '核销失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('完成课程失败：', error);
      
      let errorMessage = '核销失败';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 4004) {
        errorMessage = '课程状态不正确，无法核销';
      } else if (error.code === 4003) {
        errorMessage = '课程不存在';
      }
      
      wx.showModal({
        title: '核销失败',
        content: errorMessage,
        showCancel: false,
        confirmText: '确定'
      });
    }
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