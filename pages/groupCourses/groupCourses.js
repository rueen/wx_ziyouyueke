// pages/groupCourses/groupCourses.js
const api = require('../../utils/api.js');
const posterUtil = require('../../utils/poster.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    coachId: null,
    isOwner: false, // 是否为课程创建者
    coachData: {},
    // 当前选中的标签
    activeTab: 1,
    
    // 标签列表
    tabs: [
      { status: 1, name: '报名中' },
      { status: 2, name: '已结束' }
    ],
    
    courses: [],
    isLoading: false, // 加载状态
    hasMore: true, // 是否还有更多数据
    currentPage: 1, // 当前页码
    pageSize: 10, // 每页数量

    // 取消课程相关
    showCancelModal: false,
    cancelReason: '',
    currentCancelCourse: null,

    // 分享相关
    showShareModal: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { coachId } = options;
    if(coachId == null){
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
      return;
    }
    this.setData({
      coachId: coachId - 0
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if(this.data.coachId){
      this.loadUserInfo()
      this.loadCoachInfo();
      this.loadGroupCourses(true)
    }
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    let isOwner = false;
    let _tabs = [...this.data.tabs];
    
    if(userInfo.id === this.data.coachId){
      isOwner = true;
      _tabs = [
        { status: 0, name: '未发布' },
        { status: 1, name: '报名中' },
        { status: 2, name: '已结束' }
      ]
    }
    this.setData({
      isOwner,
      tabs: _tabs
    })
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadGroupCourses(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (!this.data.isLoading && this.data.hasMore) {
      this.loadGroupCourses(false)
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { coachId, coachData } = this.data;
    return {
      title: coachData.nickname ? `${coachData.nickname}的团课` : '自由约课 - 团课列表',
      imageUrl: coachData.avatar_url || '',
      path: `/pages/groupCourses/groupCourses?coachId=${coachId}`
    }
  },

  /**
   * 加载教练信息
   */
  async loadCoachInfo() {
    try {
      const { coachId } = this.data;

      // 调用获取用户详情接口（无需认证）
      const result = await api.user.getDetail(coachId);
      
      if (result && result.success && result.data) {
        const coach = result.data;
        const coachData = {
          ...coach
        };

        this.setData({
          coachData,
        });
      } else {
        throw new Error(result.message || '获取教练信息失败');
      }
    } catch (error) {
      // 显示具体的错误信息
      const errorMsg = error.message || '获取教练信息失败';
      wx.showToast({
        title: errorMsg,
        icon: 'none'
      });
    }
  },
  /**
   * 加载团课数据
   */
  async loadGroupCourses(isRefresh = false) {
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

      const { currentPage, pageSize, activeTab, coachId } = this.data;
      const params = {
        page: currentPage,
        limit: pageSize,
        status: activeTab,
        coach_id: coachId
      }
      // 调用API获取团课列表
      const res = await api.groupCourse.getList(params)

      if(res.success && res.data && res.data.list){
        const courses = res.data.list.map(item => ({
          ...item,
          image: item.cover_images && item.cover_images.length > 0 
            ? item.cover_images[0] 
            : '',
          date: this.formatDate(item.course_date),
          weekday: this.getWeekday(item.course_date),
          time: this.getTime(item),
          price: this.getCoursePrice(item),
          isCanCancel: item.status === 1 && !item.registrations.filter(reg => reg.check_in_status ===1).length
        }))
        this.setData({
          courses: this.data.currentPage === 1 ? courses : [...this.data.courses, ...courses],
          isLoading: false,
          hasMore: res.data.page < res.data.totalPages
        });
      }
    } catch (error) {
      this.setData({
        isLoading: false
      });

      // 显示具体的错误信息
      const errorMsg = error.message || '加载失败，请重试';
      wx.showToast({
        title: errorMsg,
        icon: 'none'
      });
    }
  },

  onBindCoach() {
    const { coachId } = this.data;
    wx.navigateTo({
      url: `/pages/bindCoach/bindCoach?coachId=${coachId}`
    })
  },
  
  /**
   * 切换标签
   */
  onTabChange(e) {
    const { currentTarget: { dataset: { status } } } = e;

    this.setData({
      activeTab: status
    },  () => {
      this.loadGroupCourses(true)
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

  getTime(item) {
    const start_time = `${item.start_time.split(':')[0]}:${item.start_time.split(':')[1]}`;
    const end_time = `${item.end_time.split(':')[0]}:${item.end_time.split(':')[1]}`;
    return `${start_time} - ${end_time}`
  },

  /**
   * 获取课程价格显示
   */
  getCoursePrice(course) {
    switch (course.price_type) {
      case 1: // 扣课时
        return `${course.lesson_cost}课时`
      case 2: // 金额展示
        return `¥${course.price_amount}`
      case 3: // 免费
        return '免费'
      default:
        return '--'
    }
  },

  /**
   * 点击课程卡片
   */
  onCourseTap(e) {
    const { course } = e.currentTarget.dataset
    
    // 跳转到团课详情页
    wx.navigateTo({
      url: `/pages/groupCourseDetail/groupCourseDetail?courseId=${course.id}`
    })
  },

  // 查看报名列表
  viewRegistrations(e) {
    const { isOwner } = this.data;
    const { course } = e.currentTarget.dataset;
    if(!isOwner){
      return;
    }
    wx.navigateTo({
      url: `/pages/groupCoursesRegistrations/groupCoursesRegistrations?courseId=${course.id}&price_type=${course.price_type}&status=${course.status}`
    })
  },

  /**
   * 取消团课 - 显示取消原因输入框
   */
  onCancelCourse(e) {
    const { course } = e.currentTarget.dataset;
    this.setData({
      currentCancelCourse: course,
      showCancelModal: true,
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
   * 关闭取消模态框
   */
  onCloseCancelModal() {
    this.setData({
      showCancelModal: false,
      cancelReason: '',
      currentCancelCourse: null
    });
  },

  /**
   * 确认取消团课
   */
  async onConfirmCancel() {
    const { cancelReason, currentCancelCourse } = this.data;
    
    if (!cancelReason.trim()) {
      wx.showToast({
        title: '请输入取消原因',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '取消中...'
      });

      const res = await api.groupCourse.cancel(currentCancelCourse.id, {
        cancel_reason: cancelReason.trim()
      });

      if (res.success) {
        wx.hideLoading();
        wx.showToast({
          title: '取消成功',
          icon: 'success'
        });
        
        // 关闭模态框并刷新数据
        this.onCloseCancelModal();
        this.loadGroupCourses(true);
      } else {
        throw new Error(res.message || '取消失败');
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '取消失败，请重试',
        icon: 'none'
      });
    }
  },
  onDeleteCourse(e) {
    const { course } = e.currentTarget.dataset;

    wx.showModal({
      title: '',
      content: '确定删除团课吗？',
      complete: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '删除中...'
            });
            const res = await api.groupCourse.del(course.id)
            if(res.success) {
              wx.hideLoading();
            
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              this.loadGroupCourses(true)
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    })
  },

  /**
   * 点击新增团课按钮
   */
  onAddCourseTap() {
    // 跳转到新增团课页面
    wx.navigateTo({
      url: `/pages/groupCourseAdd/groupCourseAdd?type=add`
    });
  },

  /**
   * 点击分享按钮
   */
  onShare() {
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
        // this.copyLink();
        break;
    }
  },

  /**
   * 生成海报
   */
  async generatePoster() {
    const { coachId, coachData } = this.data;
    
    try {
      wx.showLoading({ title: '生成中...' });

      // 1. 生成小程序码
      const qrcodeBase64 = await posterUtil.generateQRCode({
        scene: `coachId=${coachId}`,
        page: 'pages/groupCourses/groupCourses',
        width: 280
      });

      // 2. 初始化Canvas
      const { canvas, ctx, width, height } = await posterUtil.initCanvas(this);

      // 3. 绘制团课列表页海报
      await this.drawGroupCoursesPoster(canvas, ctx, width, height, {
        title: coachData.nickname ? `${coachData.nickname}的团课` : '团课列表',
        subtitle: coachData.intro || '欢迎报名参加',
        coverImage: coachData.avatar_url || '',
        qrcodeBase64
      });

      // 4. 导出为临时文件
      const posterPath = await posterUtil.canvasToTempFile(canvas);

      wx.hideLoading();

      // 5. 显示分享菜单
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
   * 绘制团课列表页海报
   */
  async drawGroupCoursesPoster(canvas, ctx, width, height, data) {
    const { title, subtitle, coverImage, qrcodeBase64 } = data;

    // 绘制背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 1. 绘制封面图或默认背景
    if (coverImage) {
      try {
        const coverImg = await posterUtil.loadImageFromUrl(canvas, coverImage);
        ctx.drawImage(coverImg, 0, 0, width, 300);
      } catch (error) {
        console.error('加载封面图失败:', error);
        this.drawDefaultBackground(ctx, width);
      }
    } else {
      this.drawDefaultBackground(ctx, width);
    }

    // 2. 绘制白色内容区域
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 280, width, height - 280);

    // 3. 绘制标题
    ctx.fillStyle = '#1d1d1f';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    posterUtil.drawText(ctx, title, 24, 320, width - 48, 24, 2);

    // 4. 绘制副标题
    ctx.fillStyle = '#86868b';
    ctx.font = '16px sans-serif';
    posterUtil.drawText(ctx, subtitle, 24, 360, width - 48, 16, 2);

    // 5. 绘制小程序码
    const qrcodeImg = await posterUtil.loadImageFromBase64(canvas, qrcodeBase64);
    const qrcodeSize = 120;
    const qrcodeX = (width - qrcodeSize) / 2;
    const qrcodeY = height - qrcodeSize - 60;
    ctx.drawImage(qrcodeImg, qrcodeX, qrcodeY, qrcodeSize, qrcodeSize);

    // 6. 绘制提示文字
    ctx.fillStyle = '#86868b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('长按识别小程序码', width / 2, qrcodeY + qrcodeSize + 30);
  },

  /**
   * 绘制默认背景
   */
  drawDefaultBackground(ctx, width) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, '#007aff');
    gradient.addColorStop(1, '#0051d5');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, 300);
  },

  /**
   * 生成二维码
   */
  async generateQRCode() {
    const { coachId } = this.data;
    
    await posterUtil.generateAndShareQRCode({
      scene: `coachId=${coachId}`,
      page: 'pages/groupCourses/groupCourses'
    });
  },

  /**
   * 复制链接
   */
  copyLink() {
    const { coachId } = this.data;
    const link = `/pages/groupCourses/groupCourses?coachId=${coachId}`;
    
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