/**
 * pages/dataStats/dataStats.js
 * 数据统计页面（教练专用）
 */
const api = require('../../utils/api.js');

/**
 * 格式化日期 YYYY-MM-DD
 * @param {Date} date 日期对象
 * @returns {string}
 */
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 获取快捷时间范围
 * @param {string} key 范围 key
 * @returns {{startDate: string, endDate: string}}
 */
function getDateRangeByKey(key) {
  const today = new Date();
  const endDate = formatDate(today);

  if (key === 'today') {
    return { startDate: endDate, endDate };
  }
  if (key === 'thisMonth') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: formatDate(start), endDate };
  }
  if (key === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { startDate: formatDate(start), endDate: formatDate(end) };
  }
  return { startDate: '', endDate: '' };
}

Page({
  data: {
    loading: false,
    startDate: '',
    endDate: '',
    selectedRangeKey: 'thisMonth',
    rangeOptions: [
      { key: 'today', label: '今天' },
      { key: 'thisMonth', label: '本月' },
      { key: 'lastMonth', label: '上月' },
      { key: 'all', label: '全部' },
      { key: 'custom', label: '自定义' }
    ],
    overview: {
      completed_lessons: 0,
      completed_revenue: 0,
      remaining_lessons: 0,
      remaining_revenue: 0
    },
    growth: {
      new_students: 0,
      new_card_lessons: 0,
      new_regular_lessons: 0,
    },
    ranking: []
  },

  onLoad() {
    const range = getDateRangeByKey('thisMonth');
    this.setData({
      startDate: range.startDate,
      endDate: range.endDate
    }, () => {
      this.loadStats();
    });
  },

  onPullDownRefresh() {
    this.loadStats().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 构建查询参数
   * @returns {Object}
   */
  buildQueryParams() {
    const { startDate, endDate } = this.data;
    const params = {};
    if (startDate) {
      params.start_date = startDate;
    }
    if (endDate) {
      params.end_date = endDate;
    }
    return params;
  },

  /**
   * 加载统计数据
   */
  async loadStats() {
    const params = this.buildQueryParams();
    this.setData({ loading: true });

    try {
      wx.showLoading({ title: '加载中...' });
      const [overviewRes, growthRes, rankingRes] = await Promise.all([
        api.stats.getOverview(params),
        api.stats.getGrowth(params),
        api.stats.getCompletionRanking({ ...params, limit: 20 })
      ]);
      wx.hideLoading();

      const overview = (overviewRes && overviewRes.data) ? overviewRes.data : {};
      const growth = (growthRes && growthRes.data) ? growthRes.data : {};
      const ranking = (rankingRes && rankingRes.data && rankingRes.data.list) ? rankingRes.data.list : [];

      this.setData({
        overview: {
          completed_lessons: overview.completed_lessons || 0,
          completed_revenue: overview.completed_revenue || 0,
          remaining_lessons: overview.remaining_lessons || 0,
          remaining_revenue: overview.remaining_revenue || 0
        },
        growth: {
          new_students: growth.new_students || 0,
          new_card_lessons: growth.new_card_lessons || 0,
          new_regular_lessons: growth.new_regular_lessons || 0,
        },
        ranking,
        loading: false
      });
    } catch (error) {
      wx.hideLoading();
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 开始日期变更
   * @param {Object} e 事件对象
   */
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value,
      selectedRangeKey: 'custom'
    });
  },

  /**
   * 结束日期变更
   * @param {Object} e 事件对象
   */
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value,
      selectedRangeKey: 'custom'
    });
  },

  /**
   * 选择快捷时间范围
   * @param {Object} e 事件对象
   */
  onSelectRange(e) {
    const { key } = e.currentTarget.dataset;

    if (key === 'custom') {
      this.setData({ selectedRangeKey: 'custom' });
      return;
    }

    const range = getDateRangeByKey(key);
    this.setData({
      selectedRangeKey: key,
      startDate: range.startDate,
      endDate: range.endDate
    }, () => {
      this.loadStats();
    });
  },

  /**
   * 清除日期筛选
   */
  onClearDate() {
    this.setData({
      startDate: '',
      endDate: '',
      selectedRangeKey: 'custom'
    });
  },

  /**
   * 应用筛选
   */
  onApplyFilter() {
    this.setData({ selectedRangeKey: 'custom' }, () => {
      this.loadStats();
    });
  }
});
