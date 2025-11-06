// pages/groupCourses/groupCourses.js
const api = require('../../utils/api.js');
const posterUtil = require('../../utils/poster.js');
const { navigateToLoginWithRedirect, parseSceneParams, formatDate, getWeekday, formatTimeRange, getCoursePriceText } = require('../../utils/util.js');

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
    shareOptions: [
      { id: 'friend', name: '发送好友', icon: 'icon-wechat' },
      { id: 'qrcode', name: '生成二维码', icon: 'icon-qrcode' },
      // { id: 'link', name: '复制链接', icon: 'icon-link' }
    ],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 解析场景值参数
    options = parseSceneParams(options);
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
    const phoneVerify = this.selectComponent('#phoneVerify');
    if (phoneVerify) {
      phoneVerify.onShow();
    }
    if(this.data.coachId){
      this.loadUserInfo()
      this.loadCoachInfo();
      this.loadGroupCourses(true)
    }
  },

  onNeedLogin() {
    navigateToLoginWithRedirect();
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
      title: coachData.nickname ? `${coachData.nickname}的活动` : '自由约课 - 活动列表',
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
   * 加载活动数据
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
      // 调用API获取活动列表
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
          isCanCancel: item.status === 1 && !item.registrations.filter(reg => reg.check_in_status ===1).length,
          registrations: item.registrations.filter(reg => reg.registration_status === 1).splice(0,6)
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
  getTime(item) {
    return formatTimeRange(item);
  },

  /**
   * 获取课程价格显示（使用工具方法）
   */
  getCoursePrice(course) {
    return getCoursePriceText(course);
  },

  /**
   * 点击课程卡片
   */
  onCourseTap(e) {
    const { course } = e.currentTarget.dataset
    
    // 跳转到活动详情页
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
   * 取消活动 - 显示取消原因输入框
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
   * 确认取消活动
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
      content: '确定删除活动吗？',
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
   * 点击新增活动按钮
   */
  onAddCourseTap() {
    // 跳转到新增活动页面
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