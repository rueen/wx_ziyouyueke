/**
 * pages/lessonChangeLogs/lessonChangeLogs.js
 * 课时变更明细页面
 */
const api = require('../../utils/api.js');
const { createCompatibleDate } = require('../../utils/util.js');
const { formatUnitPrice } = require('../../utils/unitPrice.js');

Page({
  data: {
    relationId: null,
    studentId: null,
    logs: [],
    categoryMap: {},
    loading: false,
    loadingMore: false,
    page: 1,
    pageSize: 20,
    hasMore: false
  },

  /**
   * @param {Object} options 页面参数
   */
  onLoad(options) {
    if (!options.relationId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    this.setData({
      relationId: Number(options.relationId),
      studentId: options.studentId ? Number(options.studentId) : null
    }, () => {
      this.initPage();
    });
  },

  /**
   * 初始化页面数据
   */
  async initPage() {
    await this.loadCategories();
    this.loadLogs(true);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadLogs(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore && !this.data.loading) {
      this.loadLogs(false);
    }
  },

  /**
   * 加载课程分类映射
   */
  async loadCategories() {
    try {
      const result = await api.categories.getList();
      const list = (result && result.data) ? result.data : [];
      const categoryMap = {};
      list.forEach(item => {
        categoryMap[item.id] = item.name;
      });
      this.setData({ categoryMap });
    } catch (error) {
      console.warn('加载课程分类失败:', error);
    }
  },

  /**
   * 格式化日志时间
   * @param {string} dateStr ISO 时间
   * @returns {string}
   */
  formatLogTime(dateStr) {
    const date = createCompatibleDate(dateStr);
    if (!date || Number.isNaN(date.getTime())) {
      return dateStr || '-';
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
  },

  /**
   * 加载课时变动日志
   * @param {boolean} refresh 是否刷新
   */
  async loadLogs(refresh = false) {
    const { relationId, studentId, pageSize, categoryMap } = this.data;
    const page = refresh ? 1 : this.data.page + 1;

    this.setData({
      loading: refresh,
      loadingMore: !refresh
    });

    try {
      const params = {
        relation_id: relationId,
        page,
        limit: pageSize
      };
      if (studentId) {
        params.student_id = studentId;
      }

      const result = await api.lessonChangeLog.getList(params);
      const list = (result && result.data && result.data.list) ? result.data.list : [];
      const pagination = (result && result.data && result.data.pagination) ? result.data.pagination : {};
      const formattedList = list.map(item => ({
        ...item,
        categoryName: categoryMap[item.category_id] || `分类#${item.category_id}`,
        displayTime: this.formatLogTime(item.created_at),
        unitPriceDisplay: formatUnitPrice(item.unit_price)
      }));

      this.setData({
        logs: refresh ? formattedList : this.data.logs.concat(formattedList),
        page,
        hasMore: page < (pagination.total_pages || 0),
        loading: false,
        loadingMore: false
      });
    } catch (error) {
      console.error('加载课时变更明细失败:', error);
      this.setData({ loading: false, loadingMore: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  }
});
