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
    scannedCourseId: '',
    
    // 课程内容相关
    courseContent: null, // 课程内容数据
    showContentModal: false, // 显示课程内容编辑弹窗
    
    // 课程类型/卡片选择相关
    showCategorieSelection: false, // 显示课程类型选择弹窗
    categoriesList: [], // 课程类型列表
    cardsList: [], // 卡片列表
    selectedCategorie: null, // 已选中的课程类型
    selectedCard: null, // 已选中的卡片
    
    // 地址选择相关
    showAddressSelection: false, // 显示地址选择弹窗
    selectedAddress: null, // 已选中的地址
    
    // 时间选择相关
    showTimeSelection: false, // 显示时间选择弹窗
    selectedDate: '', // 选中的日期
    selectedTimeSlot: null // 选中的时间段
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
        
        // 加载课程内容（如果有）
        if (course.course_content) {
          this.setData({
            courseContent: course.course_content
          });
        }
        
        // 根据用户角色决定显示的头像和昵称
        let displayName, displayAvatar;
        if (this.data.userRole === 'coach') {
          // 教练视角：显示学员信息
          displayName = course.relation.student_name || course.student.nickname || '未知学员';
          displayAvatar = course.student ? (course.student.avatar_url || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png') : 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png';
        } else {
          // 学员视角：显示教练信息
          displayName = course.coach ? course.coach.nickname : '未知教练';
          displayAvatar = course.coach ? (course.coach.avatar_url || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png') : 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png';
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
          coachAvatar: course.coach ? (course.coach.avatar_url || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png') : 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
          studentName: course.student ? course.student.nickname : '未知学员',
          studentAvatar: course.student ? (course.student.avatar_url || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png') : 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
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
   * 显示课程内容编辑弹窗
   */
  onShowContentModal() {
    this.setData({
      courseContent: this.data.courseInfo.course_content,
      showContentModal: true
    });
  },

  /**
   * 隐藏课程内容编辑弹窗
   */
  onHideContentModal() {
    this.setData({
      showContentModal: false
    });
  },

  /**
   * 课程内容保存成功
   */
  onContentSaveSuccess(e) {
    const { courseContent } = e.detail;
    
    // 更新课程内容
    this.setData({
      courseContent: courseContent
    });
    
    // 刷新课程详情
    this.loadCourseDetail();
  },

  /**
   * 文本内容输入
   */
  onContentTextInput(e) {
    this.setData({
      'contentForm.text_content': e.detail.value
    });
  },

  /**
   * 选择图片
   */
  onChooseImage() {
    const { images } = this.data.contentForm;
    const maxCount = 9 - images.length;
    
    if (maxCount <= 0) {
      wx.showToast({
        title: '最多上传9张图片',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        wx.showLoading({ title: '上传中...' });
        
        try {
          const uploadPromises = res.tempFilePaths.map(filePath => 
            api.upload.courseContent(filePath)
          );
          
          const results = await Promise.all(uploadPromises);
          const newImages = results.map(r => r.data.url);
          
          this.setData({
            'contentForm.images': [...images, ...newImages]
          });
          
          wx.hideLoading();
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          });
        } catch (error) {
          wx.hideLoading();
          wx.showToast({
            title: error.message || '上传失败',
            icon: 'error'
          });
        }
      }
    });
  },

  /**
   * 删除图片
   */
  onDeleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const { images } = this.data.contentForm;
    
    images.splice(index, 1);
    this.setData({
      'contentForm.images': images
    });
  },

  /**
   * 预览图片
   */
  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset;
    const { images } = this.data.contentForm;
    
    wx.previewImage({
      current: url,
      urls: images
    });
  },

  /**
   * 开始录音
   */
  onStartRecord() {
    const { audios } = this.data.contentForm;
    
    if (audios.length >= 3) {
      wx.showToast({
        title: '最多录制3个音频',
        icon: 'none'
      });
      return;
    }
    
    // 请求录音权限并开始录音
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.startRecording();
      },
      fail: () => {
        // 权限被拒绝，引导用户打开设置
        wx.showModal({
          title: '需要录音权限',
          content: '请在设置中开启录音权限',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },

  /**
   * 开始录音
   */
  startRecording() {
    const { recorderManager } = this.data;
    
    recorderManager.start({
      duration: 60000, // 最长录音时长60秒
      sampleRate: 16000, // 采样率
      numberOfChannels: 1, // 录音通道数
      encodeBitRate: 48000, // 编码码率
      format: 'mp3' // 音频格式
    });
  },

  /**
   * 停止录音
   */
  onStopRecord() {
    const { recorderManager, isRecording } = this.data;
    
    if (!isRecording) {
      return;
    }
    
    recorderManager.stop();
  },

  /**
   * 播放录音预览
   */
  onPlayRecordPreview() {
    const { currentRecordPath, playingAudioContext, isPlayingPreview } = this.data;
    
    // 如果正在播放，则停止
    if (isPlayingPreview && playingAudioContext) {
      playingAudioContext.stop();
      playingAudioContext.destroy();
      this.setData({
        playingAudioContext: null,
        isPlayingPreview: false
      });
      return;
    }
    
    // 开始播放
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = currentRecordPath;
    
    this.setData({
      playingAudioContext: innerAudioContext,
      isPlayingPreview: true
    });
    
    innerAudioContext.play();
    
    wx.showToast({
      title: '播放中...',
      icon: 'none',
      duration: 1000
    });
    
    // 播放结束
    innerAudioContext.onEnded(() => {
      innerAudioContext.destroy();
      this.setData({
        playingAudioContext: null,
        isPlayingPreview: false
      });
    });
    
    // 播放错误
    innerAudioContext.onError((err) => {
      console.error('音频播放失败:', err);
      innerAudioContext.destroy();
      this.setData({
        playingAudioContext: null,
        isPlayingPreview: false
      });
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      });
    });
  },

  /**
   * 重新录音
   */
  onReRecord() {
    // 停止正在播放的音频
    if (this.data.playingAudioContext) {
      this.data.playingAudioContext.stop();
      this.data.playingAudioContext.destroy();
    }
    
    this.setData({
      showRecordPreview: false,
      currentRecordPath: '',
      recordingDuration: 0,
      playingAudioContext: null,
      isPlayingPreview: false
    });
  },

  /**
   * 提交录音
   */
  async onSubmitRecord() {
    // 停止正在播放的音频
    if (this.data.playingAudioContext) {
      this.data.playingAudioContext.stop();
      this.data.playingAudioContext.destroy();
    }
    
    const { currentRecordPath, recordingDuration } = this.data;
    const { audios } = this.data.contentForm;
    
    // 录音时长需要至少1秒
    if (recordingDuration < 1) {
      wx.showToast({
        title: '录音时长太短',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '上传中...' });
    
    try {
      const result = await api.courseContent.uploadAudio(currentRecordPath);
      
      this.setData({
        'contentForm.audios': [...audios, {
          url: result.data.url,
          duration: recordingDuration
        }],
        showRecordPreview: false,
        currentRecordPath: '',
        recordingDuration: 0,
        playingAudioContext: null,
        isPlayingPreview: false
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '上传失败',
        icon: 'error'
      });
    }
  },

  /**
   * 播放已上传的音频
   */
  onPlayAudio(e) {
    const { url } = e.currentTarget.dataset;
    const { playingAudioContext } = this.data;
    
    // 如果有正在播放的音频，先停止
    if (playingAudioContext) {
      playingAudioContext.stop();
      playingAudioContext.destroy();
      
      // 如果点击的是同一个音频，则只停止不重新播放
      if (playingAudioContext.src === url) {
        this.setData({
          playingAudioContext: null
        });
        return;
      }
    }
    
    // 开始播放新的音频
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = url;
    
    this.setData({
      playingAudioContext: innerAudioContext
    });
    
    innerAudioContext.play();
    
    wx.showToast({
      title: '播放中...',
      icon: 'none',
      duration: 1000
    });
    
    // 播放结束
    innerAudioContext.onEnded(() => {
      innerAudioContext.destroy();
      this.setData({
        playingAudioContext: null
      });
    });
    
    // 播放错误
    innerAudioContext.onError((err) => {
      console.error('音频播放失败:', err);
      innerAudioContext.destroy();
      this.setData({
        playingAudioContext: null
      });
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      });
    });
  },

  /**
   * 删除音频
   */
  onDeleteAudio(e) {
    const { index } = e.currentTarget.dataset;
    const { audios } = this.data.contentForm;
    
    audios.splice(index, 1);
    this.setData({
      'contentForm.audios': audios
    });
  },

  /**
   * 选择视频
   */
  onChooseVideo() {
    console.log('点击了添加视频按钮');
    const { videos } = this.data.contentForm;
    
    if (videos.length >= 1) {
      wx.showToast({
        title: '最多上传1个视频',
        icon: 'none'
      });
      return;
    }
    
    // 先请求相机权限
    wx.authorize({
      scope: 'scope.camera',
      success: () => {
        console.log('相机权限已授权');
        this.chooseVideoFile();
      },
      fail: () => {
        console.log('相机权限被拒绝，尝试直接选择');
        // 即使相机权限被拒绝，用户仍然可以从相册选择
        this.chooseVideoFile();
      }
    });
  },

  /**
   * 选择视频文件
   */
  chooseVideoFile() {
    console.log('开始选择视频');
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60, // 微信小程序限制最长60秒
      camera: 'back',
      success: async (res) => {
        console.log('视频选择成功:', res);
        // 检查文件大小（100MB）
        if (res.size > 100 * 1024 * 1024) {
          wx.showToast({
            title: '视频文件不能超过100MB',
            icon: 'none'
          });
          return;
        }
        
        wx.showLoading({ title: '上传中...' });
        
        try {
          const result = await api.courseContent.uploadVideo(res.tempFilePath);
          
          const { videos } = this.data.contentForm;
          this.setData({
            'contentForm.videos': [...videos, {
              url: result.data.url,
              duration: Math.round(res.duration)
            }]
          });
          
          wx.hideLoading();
          wx.showToast({
            title: '上传成功',
            icon: 'success'
          });
        } catch (error) {
          console.error('视频上传失败:', error);
          wx.hideLoading();
          wx.showToast({
            title: error.message || '上传失败',
            icon: 'error'
          });
        }
      },
      fail: (error) => {
        console.error('选择视频失败:', error);
        if (error.errMsg && error.errMsg.includes('cancel')) {
          console.log('用户取消选择视频');
          return;
        }
        wx.showToast({
          title: '选择视频失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 删除视频
   */
  onDeleteVideo(e) {
    const { index } = e.currentTarget.dataset;
    const { videos } = this.data.contentForm;
    
    videos.splice(index, 1);
    this.setData({
      'contentForm.videos': videos
    });
  },

  /**
   * 保存课程内容
   */
  async onSaveCourseContent() {
    const { contentForm, courseContent } = this.data;
    
    // 验证至少有一项内容
    if (!contentForm.text_content && 
        contentForm.images.length === 0 && 
        contentForm.audios.length === 0 && 
        contentForm.videos.length === 0) {
      wx.showToast({
        title: '请至少添加一项内容',
        icon: 'none'
      });
      return;
    }
    
    try {
      wx.showLoading({ title: '保存中...' });
      
      const params = {
        course_type: 1, // 一对一课程
        booking_id: this.data.courseId,
        text_content: contentForm.text_content || null,
        images: contentForm.images.length > 0 ? contentForm.images : null,
        audios: contentForm.audios.length > 0 ? contentForm.audios : null,
        videos: contentForm.videos.length > 0 ? contentForm.videos : null
      };
      
      let result;
      if (courseContent && courseContent.id) {
        // 更新课程内容
        result = await api.courseContent.update(courseContent.id, params);
      } else {
        // 创建课程内容
        result = await api.courseContent.create(params);
      }
      
      wx.hideLoading();
      
      if (result && result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        this.setData({
          showContentModal: false,
          courseContent: result.data
        });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'error'
      });
    }
  },

  /**
   * 格式化时长（秒转分:秒）
   */
  formatDuration(seconds) {
    if (!seconds) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * 预览课程内容图片
   */
  onPreviewContentImage(e) {
    const { url } = e.currentTarget.dataset;
    const { courseContent } = this.data;
    
    wx.previewImage({
      current: url,
      urls: courseContent.images
    });
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
   * 进入学员详情
   */
  onStudentDetail(e) {
    const { courseInfo } = this.data;
    wx.navigateTo({
      url: `/pages/studentDetail/studentDetail?relationId=${courseInfo.relation_id}&studentId=${courseInfo.student_id}`
    });
  },

  /**
   * 查看上课记录
   */
  handleViewCourseList() {
    // 获取页面栈
    const pages = getCurrentPages();
    // 检查是否有上一页，且上一页是课程列表页面
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2];
      if (prevPage.route === 'pages/courseList/courseList') {
        // 如果是课程列表页面，直接返回
        wx.navigateBack();
        return;
      }
    }

    // 如果不是从课程列表页面来的，则正常跳转
    const { courseInfo } = this.data;

    const student = {
      student_id: courseInfo.student_id,
      nickname: courseInfo.relation.student_name
    }
    wx.navigateTo({
      url: `/pages/courseList/courseList?pageFrom=studentDetail&student=${JSON.stringify(student)}`
    });
  },

  /**
   * 查看上次上课内容
   */
  handleViewPrevCourse() {
    const { courseInfo } = this.data;
    wx.navigateTo({
      url: `/pages/courseDetail/courseDetail?id=${courseInfo.previous_course_id}`
    });
  },

  // 修改课程备注
  handleEditRemark(e) {
    const { currentTarget: { dataset: { type, title } } } = e;
    const { courseInfo } = this.data;

    wx.showModal({
      title: title,
      editable: true,
      content: courseInfo[type],
      placeholderText: `请输入${title}`,
      success: (res) => {
        if (res.confirm) {
          this.editCourse({
            [type]: res.content
          })
        }
      }
    })    
  },

  // 修改课程类型
  async handleEditBookingType() {
    const { courseInfo } = this.data;
    if (!courseInfo) return;

    try {
      wx.showLoading({ title: '加载中...' });

      // 加载课程类型列表和卡片列表
      await this.loadCategoriesAndCards(courseInfo.student_id, courseInfo.coach_id, courseInfo.relation_id);

      wx.hideLoading();

      // 设置当前选中的课程类型或卡片
      if (courseInfo.booking_type === 2 && courseInfo.card_instance_id) {
        // 卡片课程
        const currentCard = this.data.cardsList.find(c => c.id === courseInfo.card_instance_id);
        this.setData({
          selectedCard: currentCard || null,
          selectedCategorie: null
        });
      } else if (courseInfo.booking_type === 1 && courseInfo.category_id != null) {
        // 普通课程
        const currentCategorie = this.data.categoriesList.find(c => c.category.id === courseInfo.category_id);
        this.setData({
          selectedCategorie: currentCategorie || null,
          selectedCard: null
        });
      }

      // 显示选择弹窗
      this.setData({
        showCategorieSelection: true
      });
    } catch (error) {
      wx.hideLoading();
      console.error('加载课程类型列表失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 加载课程类型列表和卡片列表
   */
  async loadCategoriesAndCards(studentId, coachId, relationId) {
    try {
      // 并行加载课程类型和卡片数据
      const [relationResult, cardsResult] = await Promise.all([
        // 获取师生关系详情（包含课程类型列表）
        api.relation.getMyStudentsDetail(relationId),
        // 获取可用卡片列表
        api.card.getAvailableCards(studentId, coachId)
      ]);

      // 处理课程类型数据
      let categoriesList = [];
      if (relationResult && relationResult.data) {
        const categoryLessons = relationResult.data.category_lessons || [];
        // 过滤出剩余课时 > 0 的课程类型
        categoriesList = categoryLessons.filter(item => item.remaining_lessons > 0);
      }

      // 处理卡片数据
      let cardsList = [];
      if (cardsResult && cardsResult.data) {
        cardsList = cardsResult.data.list || [];
      }

      this.setData({
        categoriesList,
        cardsList
      });
    } catch (error) {
      console.error('加载课程类型和卡片失败:', error);
      throw error;
    }
  },

  /**
   * 隐藏课程类型选择弹窗
   */
  onHideCategorieSelection() {
    this.setData({
      showCategorieSelection: false
    });
  },

  /**
   * 选择课程类型
   */
  onSelectCategorie(e) {
    const item = e.detail.categorie;
    
    // 确认修改
    wx.showModal({
      title: '确认修改',
      content: `确定要将课程类型修改为"${item.category.name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          // 调用编辑课程接口
          await this.editCourse({
            category_id: item.category.id,
            booking_type: 1, // 普通课程
            card_instance_id: null // 清除卡片ID
          });
          
          this.setData({
            selectedCategorie: item,
            selectedCard: null,
            showCategorieSelection: false
          });
        }
      }
    });
  },

  /**
   * 选择卡片
   */
  onSelectCard(e) {
    const card = e.detail.card;
    
    // 确认修改
    wx.showModal({
      title: '确认修改',
      content: `确定要将课程卡片修改为"${card.card_name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          // 调用编辑课程接口
          await this.editCourse({
            card_instance_id: card.id,
            booking_type: 2, // 卡片课程
            // category_id: null // 清除课程类型ID
          });
          
          this.setData({
            selectedCard: card,
            selectedCategorie: null,
            showCategorieSelection: false
          });
        }
      }
    });
  },

  getTimeSlot(time) {
    return `${time.split(':')[0]}:${time.split(':')[1]}`
  },

  // 修改上课时间
  handleEditTime() {
    const { courseInfo } = this.data;
    if (!courseInfo) return;
    const start_time = this.getTimeSlot(courseInfo.start_time);
    const end_time = this.getTimeSlot(courseInfo.end_time);

    // 显示时间选择弹窗
    this.setData({
      showTimeSelection: true,
      selectedDate: courseInfo.course_date || '',
      selectedTimeSlot: {
        id: `${courseInfo.course_date}_${start_time}_${end_time}`,
        course_date: courseInfo.course_date,
        startTime: start_time,
        endTime: end_time
      }
    });
  },

  /**
   * 隐藏时间选择弹窗
   */
  onHideTimeSelection() {
    this.setData({
      showTimeSelection: false
    });
  },

  /**
   * 时间段被选择
   */
  onTimeSlotTap(e) {
    const { date, slot } = e.detail;
    this.setData({
      newDate: {
        date, slot
      }
    })
  },
  onConfirmEditTime() {
    const { date, slot } = this.data.newDate;

    if (slot.status === 'full') {
      wx.showToast({
        title: '该时段已满员',
        icon: 'none'
      });
      return;
    }

    // 确认修改
    const timeStr = `${date} ${slot.startTime}-${slot.endTime}`;
    wx.showModal({
      title: '确认修改',
      content: `确定要将上课时间修改为"${timeStr}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          // 调用编辑课程接口
          await this.editCourse({
            course_date: date,
            start_time: slot.startTime,
            end_time: slot.endTime
          });

          this.setData({
            selectedDate: date,
            selectedTimeSlot: slot,
            showTimeSelection: false
          });
        }
      }
    });
  },

  /**
   * 时间选择器错误处理
   */
  onTimeSelectorError(e) {
    const { message } = e.detail;
    console.error('时间选择器错误:', message);
    wx.showToast({
      title: message || '时间加载失败',
      icon: 'none'
    });
  },

  // 修改上课地点
  handleEditLocation() {
    const { courseInfo } = this.data;
    if (!courseInfo) return;

    // 设置当前选中的地址
    this.setData({
      selectedAddress: courseInfo.address || null,
      showAddressSelection: true
    });
  },

  /**
   * 隐藏地址选择弹窗
   */
  onHideAddressSelection() {
    this.setData({
      showAddressSelection: false
    });
  },

  /**
   * 选择地址
   */
  onSelectAddress(e) {
    const address = e.detail.address;
    
    // 确认修改
    wx.showModal({
      title: '确认修改',
      content: `确定要将上课地点修改为"${address.name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          // 调用编辑课程接口
          await this.editCourse({
            address_id: address.id
          });
          
          this.setData({
            selectedAddress: address,
            showAddressSelection: false
          });
        }
      }
    });
  },

  /**
   * 地址列表加载完成
   */
  onAddressLoaded(e) {
    console.log('地址列表加载完成:', e.detail.addresses);
  },

  /**
   * 地址列表加载失败
   */
  onAddressLoadError(e) {
    console.error('地址列表加载失败:', e.detail.error);
    wx.showToast({
      title: '加载地址失败',
      icon: 'none'
    });
  },

  // 修改课程
  async editCourse(params = {}) {
    try{
      wx.showLoading({ title: '保存中...' });
      const result = await api.course.edit(this.data.courseId, params);

      wx.hideLoading();
      if (result && result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        this.loadCourseDetail();
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'error'
      });
    }
  }
  
}); 