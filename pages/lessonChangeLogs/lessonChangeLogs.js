/**
 * pages/lessonChangeLogs/lessonChangeLogs.js
 * 课时变更明细页面
 */
const api = require('../../utils/api.js');
const { createCompatibleDate } = require('../../utils/util.js');
const { formatUnitPrice } = require('../../utils/unitPrice.js');

/**
 * 格式化今日日期为中文展示
 * @returns {string}
 */
function formatTodayDateText() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();
  return `${y}年${m}月${d}日`;
}

Page({
  data: {
    relationId: null,
    studentId: null,
    logStartDateText: formatTodayDateText(),
    logs: [],
    categoryMap: {},
    categoryPickerRange: [{ id: null, name: '全部分类' }],
    categoryPickerIndex: 0,
    selectedCategoryId: null,
    selectedCategoryName: '全部分类',
    changeTypeOptions: [
      { value: null, label: '全部类型' },
      { value: 1, label: '增加' },
      { value: 2, label: '减少' },
      { value: 3, label: '清零' }
    ],
    changeTypePickerIndex: 0,
    selectedChangeType: null,
    selectedChangeTypeName: '全部类型',
    filterStartDate: '',
    filterEndDate: '',
    showFilterPanel: false,
    hasActiveFilter: false,
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
   * 加载课程分类列表
   */
  async loadCategories() {
    try {
      const result = await api.categories.getList();
      const list = (result && result.data) ? result.data : [];
      const categoryMap = {};
      list.forEach(item => {
        categoryMap[item.id] = item.name;
      });
      this.setData({
        categoryMap,
        categoryPickerRange: [
          { id: null, name: '全部分类' },
          ...list.map(item => ({ id: item.id, name: item.name }))
        ]
      });
    } catch (error) {
      console.warn('加载课程分类失败:', error);
    }
  },

  /**
   * 更新筛选激活状态
   */
  updateFilterActiveState() {
    const { selectedCategoryId, selectedChangeType, filterStartDate, filterEndDate } = this.data;
    const hasActiveFilter = selectedCategoryId != null
      || selectedChangeType != null
      || !!filterStartDate
      || !!filterEndDate;
    this.setData({ hasActiveFilter });
  },

  /**
   * 展开/收起筛选面板
   */
  onToggleFilter() {
    this.setData({
      showFilterPanel: !this.data.showFilterPanel
    });
  },

  /**
   * 构建筛选查询参数
   * @returns {Object}
   */
  buildFilterParams() {
    const {
      relationId,
      studentId,
      selectedCategoryId,
      selectedChangeType,
      filterStartDate,
      filterEndDate
    } = this.data;

    const params = {
      relation_id: relationId
    };

    if (studentId) {
      params.student_id = studentId;
    }
    if (selectedCategoryId != null) {
      params.category_id = selectedCategoryId;
    }
    if (selectedChangeType != null) {
      params.change_type = selectedChangeType;
    }
    if (filterStartDate) {
      params.start_date = filterStartDate;
    }
    if (filterEndDate) {
      params.end_date = filterEndDate;
    }

    return params;
  },

  /**
   * 课程分类筛选变更
   * @param {Object} e 事件对象
   */
  onCategoryPickerChange(e) {
    const index = Number(e.detail.value);
    const selected = this.data.categoryPickerRange[index] || { id: null, name: '全部分类' };
    this.setData({
      categoryPickerIndex: index,
      selectedCategoryId: selected.id,
      selectedCategoryName: selected.name
    }, () => {
      this.updateFilterActiveState();
    });
  },

  /**
   * 变动类型筛选变更
   * @param {Object} e 事件对象
   */
  onChangeTypePickerChange(e) {
    const index = Number(e.detail.value);
    const selected = this.data.changeTypeOptions[index] || { value: null, label: '全部类型' };
    this.setData({
      changeTypePickerIndex: index,
      selectedChangeType: selected.value,
      selectedChangeTypeName: selected.label
    }, () => {
      this.updateFilterActiveState();
    });
  },

  /**
   * 开始日期筛选变更
   * @param {Object} e 事件对象
   */
  onFilterStartDateChange(e) {
    this.setData({
      filterStartDate: e.detail.value
    }, () => {
      this.updateFilterActiveState();
    });
  },

  /**
   * 结束日期筛选变更
   * @param {Object} e 事件对象
   */
  onFilterEndDateChange(e) {
    this.setData({
      filterEndDate: e.detail.value
    }, () => {
      this.updateFilterActiveState();
    });
  },

  /**
   * 清除筛选条件
   */
  onClearFilter() {
    this.setData({
      categoryPickerIndex: 0,
      selectedCategoryId: null,
      selectedCategoryName: '全部分类',
      changeTypePickerIndex: 0,
      selectedChangeType: null,
      selectedChangeTypeName: '全部类型',
      filterStartDate: '',
      filterEndDate: '',
      hasActiveFilter: false
    }, () => {
      this.loadLogs(true);
    });
  },

  /**
   * 应用筛选
   */
  onApplyFilter() {
    const { filterStartDate, filterEndDate } = this.data;
    if (filterStartDate && filterEndDate && filterStartDate > filterEndDate) {
      wx.showToast({
        title: '开始日期不能晚于结束日期',
        icon: 'none'
      });
      return;
    }
    this.loadLogs(true);
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
    const { pageSize, categoryMap } = this.data;
    const page = refresh ? 1 : this.data.page + 1;

    this.setData({
      loading: refresh,
      loadingMore: !refresh
    });

    try {
      const params = {
        ...this.buildFilterParams(),
        page,
        limit: pageSize
      };

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
