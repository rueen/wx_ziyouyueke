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
    qrCodeImagePath: '', // 二维码图片路径
    pollingTimer: null, // 轮询定时器
    
    // 扫码核销确认相关
    showVerifyConfirmModal: false,
    scannedCourseId: ''
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
        const course_start_time = `${course.start_time.split(':')[0]}:${course.start_time.split(':')[1]}`;
        const course_end_time = `${course.end_time.split(':')[0]}:${course.end_time.split(':')[1]}`;
        const courseInfo = {
          ...course,
          id: course.id,
          coachId: course.coach ? course.coach.id : 0,
          coachName: course.coach ? course.coach.nickname : '未知教练',
          coachAvatar: course.coach ? (course.coach.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
          studentName: course.student ? course.student.nickname : '未知学员',
          studentAvatar: course.student ? (course.student.avatar_url || '/images/defaultAvatar.png') : '/images/defaultAvatar.png',
          displayName: displayName,
          displayAvatar: displayAvatar,
          displayRole: this.data.userRole === 'coach' ? '学员' : '教练',
          time: `${course.course_date} ${course_start_time}-${course_end_time}`,
          date: course.course_date,
          startTime: course.start_time,
          endTime: course.end_time,
          location: course.address ? (course.address.name || course.address.address || '未指定地点') : '未指定地点',
          status: this.getStatusFromApi(course.booking_status),
          createTime: course.createdAt || '',
          cancelReason: course.cancel_reason || '',
          createdBy: course.created_by,
          isCreatedByCurrentUser: isCreatedByCurrentUser,
          categoryName: course.coach.course_categories.find(i => i.id === course.category_id).name
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
      4: 'cancelled',     // 已取消
      5: 'cancelled'     // 超时已取消
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
    
    // 如果是学员查看课程码，启动轮询检查课程状态
    if (this.data.userRole === 'student') {
      this.startPollingCourseStatus();
    }
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
   * 启动轮询检查课程状态
   */
  startPollingCourseStatus() {
    // 清除之前的定时器
    if (this.data.pollingTimer) {
      clearInterval(this.data.pollingTimer);
    }
    
    // 每3秒检查一次课程状态
    const timer = setInterval(() => {
      this.checkCourseStatus();
    }, 3000);
    
    this.setData({
      pollingTimer: timer
    });
  },

  /**
   * 停止轮询
   */
  stopPollingCourseStatus() {
    if (this.data.pollingTimer) {
      clearInterval(this.data.pollingTimer);
      this.setData({
        pollingTimer: null
      });
    }
  },

  /**
   * 检查课程状态
   */
  async checkCourseStatus() {
    try {
      const result = await api.course.getDetail(this.data.courseId);
      
      if (result && result.data) {
        const currentStatus = this.getStatusFromApi(result.data.booking_status);
        const originalStatus = this.data.courseInfo.status;
        
        // 如果状态发生变化（特别是变为已完成），停止轮询并更新页面
        if (currentStatus !== originalStatus) {
          this.stopPollingCourseStatus();
          
          // 隐藏课程码弹窗
          this.setData({
            showCourseCodeModal: false,
            currentCourseCode: '',
            qrCodeImagePath: ''
          });
          
          // 显示状态变化提示
          if (currentStatus === 'completed') {
            wx.showToast({
              title: '课程已完成',
              icon: 'success'
            });
          }
          
          // 重新加载课程详情
          this.loadCourseDetail();
        }
      }
    } catch (error) {
      console.error('检查课程状态失败:', error);
      // 轮询失败不影响主要功能，只记录错误
    }
  },

  /**
   * 隐藏课程码模态框
   */
  onHideCourseCodeModal() {
    // 停止轮询
    this.stopPollingCourseStatus();
    
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
          // 显示二次确认弹窗
          this.setData({
            showVerifyConfirmModal: true,
            scannedCourseId: scannedCourseId
          });
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
   * 隐藏核销确认弹窗
   */
  onHideVerifyConfirmModal() {
    this.setData({
      showVerifyConfirmModal: false,
      scannedCourseId: ''
    });
  },

  /**
   * 确认核销课程
   */
  onConfirmVerify() {
    // 隐藏确认弹窗
    this.setData({
      showVerifyConfirmModal: false
    });
    
    // 调用完成课程接口
    this.completeCourse(this.data.scannedCourseId);
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

  // 删除课程
  handleDel: function() {
    const { courseInfo } = this.data;
    wx.showModal({
      title: '',
      content: '删除后不可恢复，确认删除吗？',
      success: async (res) => {
        if (res.confirm) {
          const courseId = courseInfo.id;
          try {
            const result = await api.course.delete(courseId);
            if (result) {
              wx.showModal({
                title: '',
                content: '删除成功',
                showCancel: false,
                confirmText: '确定',
                success: () => {
                  wx.navigateBack({
                    delta: 1 // 返回的页面数，1 表示上一页
                  })
                }
              });
            } else {
              throw new Error(result.message || '删除失败');
            }
          } catch (error) {
            wx.showModal({
              title: '删除失败',
              content: error.message,
              showCancel: false,
              confirmText: '确定'
            });
          }
        }
      }
    })
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
    // 页面卸载时清理定时器
    this.stopPollingCourseStatus();
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