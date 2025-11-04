// pages/allGroupCourses/allGroupCourses.js
const api = require('../../utils/api.js');
const { formatDate, getWeekday, formatTimeRange, getCoursePriceText } = require('../../utils/util.js');
Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 当前选中的标签
    activeTab: 1,
    tabs: [
      { status: 1, name: '报名中' },
      { status: 2, name: '已结束' }
    ],
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

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadGroupCourses(true)
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

      const { currentPage, pageSize, activeTab } = this.data;
      const params = {
        page: currentPage,
        limit: pageSize,
        status: activeTab,
        is_show: 1
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
    
    // 跳转到团课详情页
    wx.navigateTo({
      url: `/pages/groupCourseDetail/groupCourseDetail?courseId=${course.id}`
    })
  },

})