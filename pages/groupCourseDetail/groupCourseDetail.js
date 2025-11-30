// pages/groupCourseDetail/groupCourseDetail.js
const api = require('../../utils/api.js')
const { navigateToLoginWithRedirect, parseSceneParams, formatDate, getWeekday, formatTimeRange, getCoursePriceText } = require('../../utils/util.js')
const posterUtil = require('../../utils/poster.js')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    courseId: null,
    coachId: null,
    courseDetail: null,
    registeredInfo: {}, // 本人报名信息
    loginType: 'guest',
    mode: 'view', // view-查看，preview-预览
    isOwner: false, // 是否为课程创建者
    canEdit: false, // 是否可以编辑
    canPublish: false, // 是否可以发布
    showRegistrationModal: false, // 是否显示报名人员弹窗

    // 分享相关
    showShareModal: false,
    shareOptions: [
      { id: 'friend', name: '发送好友', icon: 'icon-wechat' },
      { id: 'poster', name: '生成海报', icon: 'icon-image' },
      { id: 'qrcode', name: '生成二维码', icon: 'icon-qrcode' },
      // { id: 'link', name: '复制链接', icon: 'icon-link' }
    ],

    // 课程内容相关
    courseContent: null, // 课程内容数据
    showContentModal: false // 显示课程内容编辑弹窗
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('活动详情页面参数:', options)
    
    // 解析场景值参数
    options = parseSceneParams(options);
    if (options.courseId) {
      this.setData({
        courseId: parseInt(options.courseId),
        mode: options.mode || 'view'
      })
      this.loadCourseDetail()
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  /**
   * 初始化录音管理器
   */
  initRecorderManager() {
    const recorderManager = wx.getRecorderManager();
    
    // 录音开始事件
    recorderManager.onStart(() => {
      console.log('录音开始');
      this.setData({
        isRecording: true,
        recordingDuration: 0
      });
      
      // 开始计时
      this.startRecordTimer();
    });
    
    // 录音结束事件
    recorderManager.onStop((res) => {
      console.log('录音结束', res);
      this.stopRecordTimer();
      this.setData({
        isRecording: false,
        currentRecordPath: res.tempFilePath,
        showRecordPreview: true
      });
    });
    
    // 录音错误事件
    recorderManager.onError((err) => {
      console.error('录音错误:', err);
      this.stopRecordTimer();
      this.setData({
        isRecording: false
      });
      
      wx.showToast({
        title: '录音失败，请重试',
        icon: 'none'
      });
    });
    
    this.setData({
      recorderManager: recorderManager
    });
  },

  /**
   * 开始录音计时
   */
  startRecordTimer() {
    const timer = setInterval(() => {
      const duration = this.data.recordingDuration + 1;
      this.setData({
        recordingDuration: duration
      });
      
      // 录音最长60秒，自动停止
      if (duration >= 60) {
        this.onStopRecord();
      }
    }, 1000);
    
    this.setData({
      recordTimer: timer
    });
  },

  /**
   * 停止录音计时
   */
  stopRecordTimer() {
    if (this.data.recordTimer) {
      clearInterval(this.data.recordTimer);
      this.setData({
        recordTimer: null,
        recordingDuration: 0
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    const phoneVerify = this.selectComponent('#phoneVerify');
    if (phoneVerify) {
      phoneVerify.onShow();
    }
    // 获取用户角色和登录状态
    this.loadUserInfo()
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const loginType = wx.getStorageSync('loginType') || 'guest'

    this.setData({
      loginType: loginType,
    })
  },

  onNeedLogin() {
    navigateToLoginWithRedirect({
      message: '请先登录后再报名',
      redirectParams: {
        isFixedRole: true,
        selectedRole: 'student',
        courseId: this.data.courseId
      }
    });
  },

  /**
   * 加载活动详情
   */
  loadCourseDetail() {
    const { courseId } = this.data
    
    wx.showLoading({
      title: '加载中...'
    })

    api.groupCourse.getDetail(courseId)
      .then(res => {
        if (res.success && res.data) {
          const course = {
            ...res.data,
            showTime: this.getshowTime(res.data)
          };
          
          // 加载课程内容（如果有）
          if (course.course_content) {
            this.setData({
              courseContent: course.course_content
            });
          }
          
          // 检查是否已报名
          let registeredInfo = {}
          if (course.registrations && course.registrations.length > 0) {
            const userInfo = wx.getStorageSync('userInfo')
            if (userInfo && userInfo.id) {
              registeredInfo = course.registrations.find(reg => 
                reg.student && reg.student.id === userInfo.id
              )
            }
          }

          // 检查权限
          const userInfo = wx.getStorageSync('userInfo')
          const isOwner = userInfo && userInfo.id === course.coach_id
          const canEdit = isOwner && this.canEditCourse(course)
          const canPublish = isOwner && !course.status
          
          this.setData({
            courseDetail: course,
            registeredInfo: registeredInfo,
            isOwner: isOwner,
            canEdit: canEdit,
            canPublish: canPublish,
            coachId: course.coach_id
          })
        }
      })
      .catch(err => {
        console.error('加载活动详情失败:', err)
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  // 打开活动
  onGroupCourses() {
    const { coachId } = this.data;
    wx.navigateTo({
      url: `/pages/groupCourses/groupCourses?coachId=${coachId}`
    })
  },
  
  /**
   * 报名活动
   */
  onRegisterTap() {
    const { courseDetail } = this.data;
    // 检查报名条件
    if (courseDetail.current_participants >= courseDetail.max_participants) {
      wx.showToast({
        title: '课程已满员',
        icon: 'error'
      })
      return
    }
    
    wx.showModal({
      title: '确认报名',
      content: `确定要报名"${courseDetail.title}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '报名中...'
            });
            const { courseId } = this.data
            const res = await api.groupCourse.register(courseId);
            if(res.success) {
              wx.hideLoading();
              wx.showToast({
                title: '报名成功',
                icon: 'success'
              })
              setTimeout(() => {
                // 重新加载详情
                this.loadCourseDetail()
              }, 1500)
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '报名失败',
              icon: 'none',
              duration: 3000
            })
          }
        }
      }
    })
  },

  /**
   * 取消报名
   */
  onUnregisterTap() {
    wx.showModal({
      title: '取消报名',
      content: '确定要取消报名吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '取消中...'
            });
            const { courseId } = this.data
            const res = await api.groupCourse.unregister(courseId);
            if(res.success) {
              wx.hideLoading();
              wx.showToast({
                title: '取消成功',
                icon: 'success'
              })
              setTimeout(() => {
                // 重新加载详情
                this.loadCourseDetail()
              }, 1500)
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '取消失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  /**
   * 显示报名人员弹窗
   */
  onShowRegistrationModal() {
    this.setData({
      showRegistrationModal: true
    })
  },

  /**
   * 隐藏报名人员弹窗
   */
  onHideRegistrationModal() {
    this.setData({
      showRegistrationModal: false
    })
  },

  /**
   * 查看地址详情 - 打开微信地图
   */
  onAddressTap() {
    const { courseDetail } = this.data;

    if (!courseDetail || !courseDetail.address) {
      wx.showToast({
        title: '地址信息不完整',
        icon: 'none'
      })
      return
    }

    const { latitude, longitude, name, address } = courseDetail.address

    // 检查坐标是否有效
    if (!latitude || !longitude) {
      wx.showToast({
        title: '地址坐标无效',
        icon: 'none'
      })
      return
    }

    // 打开微信地图
    wx.openLocation({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      name: name || courseDetail.title || '活动地址',
      address: address || '',
      scale: 18, // 地图缩放级别，18为街道级别
      success: () => {
        console.log('打开地图成功')
      },
      fail: (err) => {
        console.error('打开地图失败:', err)
        wx.showToast({
          title: '打开地图失败',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 格式化日期（使用工具方法）
   */
  formatDate,

  /**
   * 获取星期几（使用工具方法）
   */
  getWeekday,

  /**
   * 格式化时间范围（使用工具方法）
   */
  getTime(courseDetail) {
    return formatTimeRange(courseDetail);
  },

  /**
   * 获取完整的课程时间显示
   */
  getshowTime(courseDetail) {
    return `${formatDate(courseDetail.course_date)} ${getWeekday(courseDetail.course_date)} ${formatTimeRange(courseDetail)}`
  },

  /**
   * 获取价格显示文本（使用工具方法）
   */
  getPriceText(course) {
    return getCoursePriceText(course);
  },

  /**
   * 格式化报名时间
   */
  formatRegistrationTime(dateStr) {
    if (!dateStr) return ''
    
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    
    // 小于1分钟
    if (diff < 60 * 1000) {
      return '刚刚'
    }
    
    // 小于1小时
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000))
      return `${minutes}分钟前`
    }
    
    // 小于1天
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours}小时前`
    }
    
    // 小于7天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))
      return `${days}天前`
    }
    
    // 超过7天显示具体日期
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${month}-${day}`
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { current, urls } = e.currentTarget.dataset
    
    wx.previewImage({
      current: current,
      urls: urls
    })
  },

  /**
   * 判断是否可以编辑课程
   */
  canEditCourse(course) {
    // 已取消或人数不足取消的课程不能编辑
    if (course.status === 4 || course.status === 5) {
      return false
    }
    
    // 已开始的课程不能编辑开始时间
    if (course.status === 2 || course.status === 3) {
      return false
    }
    
    // 课程开始时间已过不能编辑
    const now = new Date()
    const courseStart = new Date(`${course.course_date}T${course.start_time}`)
    if (courseStart <= now) {
      return false
    }
    
    return true
  },

  // 查看报名列表
  viewRegistrations(e) {
    const { courseId, courseDetail } = this.data

    wx.navigateTo({
      url: `/pages/groupCoursesRegistrations/groupCoursesRegistrations?courseId=${courseId}&price_type=${courseDetail.price_type}&status=${courseDetail.status}`
    })
  },

  /**
   * 编辑课程
   */
  onEditCourse() {
    const { courseId } = this.data
    
    wx.navigateTo({
      url: `/pages/groupCourseAdd/groupCourseAdd?id=${courseId}&mode=edit`
    })
  },

  /**
   * 发布课程
   */
  onPublishCourse() {
    wx.showModal({
      title: '确认发布',
      content: '发布后课程将对所有用户可见，确定要发布吗？',
      success: async (res) => {
        if (res.confirm) {
          const { courseId } = this.data;
          try {
            wx.showLoading({
              title: '发布中...'
            });
            const res = await api.groupCourse.publish(courseId)
            if(res.success) {
              wx.hideLoading();
            
              wx.showToast({
                title: '发布成功',
                icon: 'success'
              });
              // 返回活动列表页
              setTimeout(() => {
                wx.navigateBack({
                  delta: 2
                })
              }, 1500)
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: '发布失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    })
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { courseDetail } = this.data
    
    return {
      title: courseDetail ? courseDetail.title : '活动详情',
      imageUrl: courseDetail.cover_images[0] || courseDetail.images[0],
      path: `/pages/groupCourseDetail/groupCourseDetail?courseId=${this.data.courseId}`
    }
  },

  /**
   * 点击分享按钮
   */
  onShareTap() {
    this.setData({
      showShareModal: true
    });
  },

  /**
   * 关闭分享弹窗
   */
  onCloseShareModal() {
    this.setData({
      showShareModal: false
    });
  },

  /**
   * 选择分享方式
   */
  onSelectShareType(e) {
    const { type } = e.detail;

    this.onCloseShareModal();

    switch (type) {
      case 'poster':
        // 生成海报
        this.generatePoster();
        break;
      case 'qrcode':
        // 生成二维码
        this.generateQRCode();
        break;
      case 'link':
        // 复制链接
        this.copyLink();
        break;
    }
  },

  /**
   * 生成海报
   */
  async generatePoster() {
    const { courseId, courseDetail } = this.data;
    
    try {
      wx.showLoading({ title: '生成中...' });

      // 1. 生成小程序码
      const qrcodeBase64 = await posterUtil.generateQRCode({
        scene: `courseId=${courseId}`,
        page: 'pages/groupCourseDetail/groupCourseDetail',
        width: 280
      });

      // 2. 初始化Canvas（参考示例样式比例：750x1200，宽高比约1:1.6）
      const { canvas, ctx, width, height } = await posterUtil.initCanvas(this, '#posterCanvas', 750, 1200);

      // 3. 准备海报数据
      const addressName = courseDetail.address && courseDetail.address.name ? courseDetail.address.name : '';
      const coverImage = (courseDetail.cover_images && courseDetail.cover_images[0]) || 
                         (courseDetail.images && courseDetail.images[0]) || '';

      // 4. 绘制活动详情页海报
      await this.drawCourseDetailPoster(canvas, ctx, width, height, {
        title: courseDetail.title || '活动详情',
        subtitle: `${courseDetail.showTime} | ${addressName}`,
        coverImage,
        qrcodeBase64
      });

      // 5. 导出为临时文件
      const posterPath = await posterUtil.canvasToTempFile(canvas);

      wx.hideLoading();

      // 6. 显示分享菜单
      const result = await posterUtil.showShareImageMenu(posterPath);
      
      // 如果用户取消，不显示错误提示
      if (result && result.cancelled) {
        console.log('用户取消了分享');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('生成海报失败:', error);
      wx.showToast({
        title: error.message || '生成失败',
        icon: 'none'
      });
    }
  },

  /**
   * 绘制活动详情页海报
   */
  async drawCourseDetailPoster(canvas, ctx, width, height, data) {
    const { title, subtitle, coverImage, qrcodeBase64 } = data;

    // 布局参数（封面图为正方形1:1）
    const coverAreaSize = width; // 封面图区域为正方形（width x width）
    const contentPadding = 40; // 左右内边距
    const titleFontSize = 44; // 标题字体
    const infoFontSize = 32; // 信息字体
    const priceFontSize = 44; // 价格字体

    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 1) 绘制封面图（正方形1:1，填充整个区域）
    try {
      if (coverImage) {
        const img = await posterUtil.loadImageFromUrl(canvas, coverImage);
        
        // 计算缩放比例，填充整个正方形区域（可能会裁切）
        const scaleX = coverAreaSize / img.width;
        const scaleY = coverAreaSize / img.height;
        const scale = Math.max(scaleX, scaleY); // 取较大值，确保填满正方形
        
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        
        // 计算居中位置
        const x = (coverAreaSize - drawW) / 2;
        const y = (coverAreaSize - drawH) / 2;
        
        ctx.drawImage(img, x, y, drawW, drawH);
      } else {
        this.drawDefaultBackground(ctx, coverAreaSize, coverAreaSize);
      }
    } catch (e) {
      console.error('封面图绘制失败:', e);
      this.drawDefaultBackground(ctx, coverAreaSize, coverAreaSize);
    }

    // 2) 下方白色内容区域
    const contentTop = coverAreaSize + 80; // 内容区域起始位置
    const remainingHeight = height - coverAreaSize;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, coverAreaSize, width, remainingHeight);

    // 标题（固定两行，超出显示省略号）
    ctx.fillStyle = '#1d1d1f';
    ctx.font = `bold ${titleFontSize}px sans-serif`;
    ctx.textAlign = 'left';
    this.drawTitleWithEllipsis(ctx, title, contentPadding, contentTop, width - contentPadding * 2, titleFontSize);

    // 信息行起始位置
    const infoStartY = contentTop + titleFontSize * 2 + 20;

    // 时间行
    this.drawInfoRow(ctx, contentPadding, infoStartY, infoFontSize, '#86868b', 'time', subtitle.split('|')[0] || subtitle, width);

    // 地址行
    const addressText = subtitle.includes('|') ? subtitle.split('|')[1].trim() : subtitle;
    this.drawInfoRow(ctx, contentPadding, infoStartY + infoFontSize + 32, infoFontSize, '#86868b', 'location', addressText, width);

    // 价格行
    const priceText = this.getCoursePriceText();
    if (priceText) {
      this.drawPriceRow(ctx, contentPadding, infoStartY + infoFontSize * 2 + 80, priceFontSize, '#ff6b35', priceText, width);
    }

    // 3) 最后绘制右下角圆形小程序码（放在整张海报的右下角，确保在最上层）
    try {
      const qr = await posterUtil.loadImageFromBase64(canvas, qrcodeBase64);
      const qrOuter = Math.floor(width * 0.25); // 二维码外圈大小
      const qrInnerPadding = 0;
      const qrX = width - contentPadding - qrOuter;
      const qrY = height - contentPadding - qrOuter; // 整张海报的右下角位置

      // 外层白色圆底
      ctx.save();
      ctx.beginPath();
      ctx.arc(qrX + qrOuter / 2, qrY + qrOuter / 2, qrOuter / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.closePath();
      ctx.restore();

      // 圆形裁剪绘制二维码
      const qrSize = qrOuter - qrInnerPadding * 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(qrX + qrOuter / 2, qrY + qrOuter / 2, qrSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(qr, qrX + qrInnerPadding, qrY + qrInnerPadding, qrSize, qrSize);
      ctx.restore();
    } catch (e) {
      console.error('小程序码绘制失败:', e);
    }
  },

  // 绘制标题（固定两行，超出显示省略号）
  drawTitleWithEllipsis(ctx, text, x, y, maxWidth, fontSize) {
    const lineHeight = fontSize * 1.2;
    const lines = [];
    let currentLine = '';
    
    // 按字符分割文本
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = char;
        
        // 如果已经有两行，停止处理
        if (lines.length >= 2) {
          break;
        }
      } else {
        currentLine = testLine;
      }
    }
    
    // 添加最后一行
    if (currentLine && lines.length < 2) {
      lines.push(currentLine);
    }
    
    // 绘制文本
    lines.forEach((line, index) => {
      let displayText = line;
      
      // 如果是第二行且文本被截断，添加省略号
      if (index === 1 && lines.length === 2 && currentLine !== line) {
        const ellipsis = '...';
        const ellipsisWidth = ctx.measureText(ellipsis).width;
        
        // 确保省略号能放下
        while (ctx.measureText(displayText + ellipsis).width > maxWidth && displayText.length > 0) {
          displayText = displayText.slice(0, -1);
        }
        
        displayText += ellipsis;
      }
      
      ctx.fillText(displayText, x, y + index * lineHeight);
    });
  },

  /**
   * 获取课程价格文本（使用工具方法）
   */
  getCoursePriceText() {
    const { courseDetail } = this.data;
    if (!courseDetail) return '';
    return getCoursePriceText(courseDetail);
  },

  // 绘制价格行
  drawPriceRow(ctx, x, y, fontSize, color, text, width) {
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px sans-serif`; // 与标题字体大小一致
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
  },

  // 绘制信息行（带icon-time和location图标）
  drawInfoRow(ctx, x, y, fontSize, color, type, text, width) {
    const iconSize = fontSize;
    ctx.save();
    ctx.translate(x, y - iconSize + 2);

    // 绘制 icon
    if (type === 'time') {
      // icon-time 样式：圆形表盘
      ctx.beginPath();
      ctx.arc(iconSize / 2, iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#d1d1d6';
      ctx.fill();
      ctx.closePath();
      
      // // 表盘边框
      // ctx.beginPath();
      // ctx.arc(iconSize / 2, iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      // ctx.strokeStyle = '#c7c7cc';
      // ctx.lineWidth = 1;
      // ctx.stroke();
      
      // 指针
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      // 时针
      ctx.beginPath();
      ctx.moveTo(iconSize / 2, iconSize / 2);
      ctx.lineTo(iconSize / 2, iconSize / 2 - iconSize * 0.25);
      ctx.stroke();
      // 分针
      ctx.beginPath();
      ctx.moveTo(iconSize / 2, iconSize / 2);
      ctx.lineTo(iconSize / 2 + iconSize * 0.22, iconSize / 2);
      ctx.stroke();
      // 中心点
      ctx.beginPath();
      ctx.arc(iconSize / 2, iconSize / 2, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else if (type === 'location') {
      // location 样式：定位图钉
      ctx.beginPath();
      ctx.arc(iconSize / 2, iconSize / 2 - 2, iconSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#d1d1d6';
      ctx.fill();
      ctx.closePath();
      
      // // 外边框
      // ctx.beginPath();
      // ctx.arc(iconSize / 2, iconSize / 2 - 2, iconSize / 2, 0, Math.PI * 2);
      // ctx.strokeStyle = '#c7c7cc';
      // ctx.lineWidth = 1;
      // ctx.stroke();
      
      // 内圈
      ctx.beginPath();
      ctx.arc(iconSize / 2, iconSize / 2 - 2, iconSize * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      
      // 底部尖角
      ctx.beginPath();
      ctx.moveTo(iconSize / 2 - 5, iconSize - 2);
      ctx.lineTo(iconSize / 2 + 5, iconSize - 2);
      ctx.lineTo(iconSize / 2, iconSize + 5);
      ctx.fillStyle = '#d1d1d6';
      ctx.fill();
    }

    ctx.restore();

    // 文本
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'left';
    const textX = x + iconSize + 12;
    posterUtil.drawText(ctx, text, textX, y, width - textX - 40, fontSize, 2);
  },

  /**
   * 绘制默认背景
   */
  drawDefaultBackground(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#007aff');
    gradient.addColorStop(1, '#0051d5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  },

  /**
   * 生成二维码
   */
  async generateQRCode() {
    const { courseId } = this.data;
    
    await posterUtil.generateAndShareQRCode({
      scene: `courseId=${courseId}`,
      page: 'pages/groupCourseDetail/groupCourseDetail'
    });
  },

  /**
   * 复制链接
   */
  copyLink() {
    const { courseId } = this.data;
    const link = `/pages/groupCourseDetail/groupCourseDetail?courseId=${courseId}`;
    
    wx.setClipboardData({
      data: link,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 显示课程内容编辑弹窗
   */
  onShowContentModal() {
    this.setData({
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
    this.loadCourseDetail()
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
  onPreviewFormImage(e) {
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
        course_type: 2, // 团课
        group_course_id: this.data.courseId,
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
  }
})
