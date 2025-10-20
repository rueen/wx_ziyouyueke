// pages/groupCourseDetail/groupCourseDetail.js
const api = require('../../utils/api.js')
const { navigateToLoginWithRedirect } = require('../../utils/util.js')
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
      { id: 'link', name: '复制链接', icon: 'icon-link' }
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('团课详情页面参数:', options)
    
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
   * 生命周期函数--监听页面显示
   */
  onShow() {
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

  /**
   * 加载团课详情
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
        console.error('加载团课详情失败:', err)
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  // 打开团课
  onGroupCourses() {
    const { coachId } = this.data;
    wx.navigateTo({
      url: `/pages/groupCourses/groupCourses?coachId=${coachId}`
    })
  },
  
  /**
   * 报名团课
   */
  onRegisterTap() {
    const { courseDetail, loginType } = this.data

    // 检查登录状态
    if (loginType === 'guest') {
      navigateToLoginWithRedirect({
        message: '请先登录后再报名',
        redirectParams: {
          isFixedRole: true,
          selectedRole: 'student',
          courseId: this.data.courseId
        }
      });
      return
    }
    
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
      name: name || courseDetail.title || '团课地址',
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
   * 格式化日期
   */
  formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${month}.${day}`
  },

  /**
   * 获取星期几
   */
  getWeekday(dateStr) {
    if (!dateStr) return ''
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const date = new Date(dateStr)
    return weekdays[date.getDay()]
  },

  getTime(courseDetail) {
    const start_time = `${courseDetail.start_time.split(':')[0]}:${courseDetail.start_time.split(':')[1]}`;
    const end_time = `${courseDetail.end_time.split(':')[0]}:${courseDetail.end_time.split(':')[1]}`;
    return `${start_time} - ${end_time}`
  },

  getshowTime(courseDetail) {
    return `${this.formatDate(courseDetail.course_date)} ${this.getWeekday(courseDetail.course_date)} ${this.getTime(courseDetail)}`
  },

  /**
   * 获取价格显示文本
   */
  getPriceText(course) {
    switch (course.price_type) {
      case 1:
        return `${course.lesson_cost}课时`
      case 2:
        return `¥${course.price_amount}`
      case 3:
        return '免费'
      default:
        return '免费'
    }
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
              // 返回团课列表页
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
      title: courseDetail ? courseDetail.title : '团课详情',
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

      // 4. 绘制团课详情页海报
      await this.drawCourseDetailPoster(canvas, ctx, width, height, {
        title: courseDetail.title || '团课详情',
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
   * 绘制团课详情页海报
   */
  async drawCourseDetailPoster(canvas, ctx, width, height, data) {
    const { title, subtitle, coverImage, qrcodeBase64 } = data;

    // 布局参数（参考示例样式：宽高比约1:1.6）
    const coverAreaHeight = Math.floor(height * 0.65); // 顶部大图区域高度，增加比例
    const contentPadding = 40; // 左右内边距
    const titleFontSize = 44; // 增大标题字体
    const infoFontSize = 32; // 增大信息字体
    const priceFontSize = 44; // 价格字体与标题一样大

    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 1) 绘制封面图（保持纵横比，短边完全显示，长边裁切）
    try {
      if (coverImage) {
        const img = await posterUtil.loadImageFromUrl(canvas, coverImage);
        
        // 计算缩放比例，确保短边完全显示
        const scaleX = width / img.width;
        const scaleY = coverAreaHeight / img.height;
        const scale = Math.min(scaleX, scaleY); // 取较小值，确保短边完全显示
        
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        
        // 计算居中位置
        const x = (width - drawW) / 2;
        const y = (coverAreaHeight - drawH) / 2;
        
        ctx.drawImage(img, x, y, drawW, drawH);
      } else {
        this.drawDefaultBackground(ctx, width, coverAreaHeight);
      }
    } catch (e) {
      console.error('封面图绘制失败:', e);
      this.drawDefaultBackground(ctx, width, coverAreaHeight);
    }

    // 2) 绘制右下角圆形小程序码（覆盖在大图上）
    try {
      const qr = await posterUtil.loadImageFromBase64(canvas, qrcodeBase64);
      const qrOuter = Math.floor(width * 0.375); // 扩大到1.5倍 (0.25 * 1.5 = 0.375)
      const qrInnerPadding = 20;
      const qrX = width - contentPadding - qrOuter;
      const qrY = coverAreaHeight - Math.floor(qrOuter * 0.15) - qrOuter*0.75; // 调整位置

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

    // 3) 下方白色内容区域
    const contentTop = coverAreaHeight + 68; // 增加标题与顶部的距离
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, coverAreaHeight + 20, width, height - coverAreaHeight);

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

  // 获取课程价格文本
  getCoursePriceText() {
    const { courseDetail } = this.data;
    if (!courseDetail) return '';
    
    switch (courseDetail.price_type) {
      case 1: // 扣课时
        return `${courseDetail.lesson_cost}课时`;
      case 2: // 金额展示
        return `¥${courseDetail.price_amount}`;
      case 3: // 免费
        return '免费';
      default:
        return '';
    }
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
  }
})
