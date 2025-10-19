// pages/groupCourseStudent/groupCourseStudent.js
const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeTab: '0',
    tabs: [
      { status: '0', name: '进行中' },
      { status: '1,2', name: '已结束' }
    ],
    list: [],
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
    this.loadData(true)
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadData(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (!this.data.isLoading && this.data.hasMore) {
      this.loadData(false)
    }
  },

  /**
   * 切换标签
   */
  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;

    this.setData({
      activeTab: tab.status
    },  () => {
      this.loadData(true)
    })
  },

  async loadData(isRefresh = false) {
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
        check_in_status: activeTab
      }
      // 调用API获取团课列表
      const res = await api.groupCourse.getMyRegistrations(params)
      if(res.success && res.data && res.data.list){
        const list = res.data.list.map(_item => {
          const item = _item.groupCourse || {};
          return {
            ...item,
            image: item.cover_images && item.cover_images.length > 0 
              ? item.cover_images[0] 
              : '',
            date: this.formatDate(item.course_date),
            weekday: this.getWeekday(item.course_date),
            time: this.getTime(item),
            price: this.getCoursePrice(item),
          }
        })
        this.setData({
          list: this.data.currentPage === 1 ? list : [...this.data.list, ...list],
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

})