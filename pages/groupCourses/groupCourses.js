// pages/groupCourses/groupCourses.js
const api = require('../../utils/api.js');

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
    
    // 筛选后的课程列表
    courses: [],
    isLoading: false, // 加载状态
    hasMore: true, // 是否还有更多数据
    currentPage: 1, // 当前页码
    pageSize: 10, // 每页数量
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
    const { coachId } = this.data;
    return {
      title: '自由约课 - 团课列表',
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
    const { status } = e.currentTarget.dataset
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

  onCancelCourse(e) {
    const { course } = e.currentTarget.dataset;

    wx.showModal({
      title: '',
      content: '确定取消团课吗？',
      complete: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '取消中...'
            });
            const res = await api.groupCourse.cancel(course.id)
            if(res.success) {
              wx.hideLoading();
            
              wx.showToast({
                title: '取消成功',
                icon: 'success'
              });
              this.loadGroupCourses(true)
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: '取消失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    })
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
      url: `/pages/addGroupCourse/addGroupCourse?type=add`
    });
  },

})