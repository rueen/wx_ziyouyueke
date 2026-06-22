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
    ranking: [],
    students: [],
    studentPickerRange: [{ student_id: null, name: '全部学员' }],
    studentPickerIndex: 0,
    selectedStudentId: null,
    selectedStudentName: '全部学员'
  },

  /**
   * @param {Object} options 页面参数
   */
  onLoad(options) {
    const presetStudentId = options.studentId ? Number(options.studentId) : null;
    const presetStudentName = options.studentName ? decodeURIComponent(options.studentName) : '';
    const range = getDateRangeByKey('thisMonth');
    this.setData({
      startDate: range.startDate,
      endDate: range.endDate,
      presetStudentId,
      presetStudentName
    }, () => {
      this.loadStudents().then(() => {
        if (presetStudentId) {
          this.applyPresetStudent(presetStudentId, presetStudentName);
        }
        this.loadStats();
      });
    });
  },

  onPullDownRefresh() {
    this.loadStats().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载学员列表
   * @returns {Promise<void>}
   */
  async loadStudents() {
    try {
      const result = await api.relation.getMyStudents({ page: 1, limit: 100 });
      const list = (result && result.data && result.data.list) ? result.data.list : [];
      const students = list
        .filter(item => item.student_id)
        .map(item => ({
          student_id: item.student_id,
          name: item.student_name || (item.student && item.student.nickname) || '未命名学员'
        }));
      this.setData({
        students,
        studentPickerRange: [{ student_id: null, name: '全部学员' }, ...students]
      });
    } catch (error) {
      console.warn('加载学员列表失败:', error);
    }
  },

  /**
   * 应用预设学员筛选
   * @param {number} studentId 学员ID
   * @param {string} studentName 学员姓名
   */
  applyPresetStudent(studentId, studentName) {
    let { studentPickerRange } = this.data;
    let index = studentPickerRange.findIndex(item => item.student_id === studentId);

    if (index === -1) {
      studentPickerRange = [
        ...studentPickerRange,
        { student_id: studentId, name: studentName || '当前学员' }
      ];
      index = studentPickerRange.length - 1;
    }

    const selected = studentPickerRange[index];
    this.setData({
      studentPickerRange,
      studentPickerIndex: index,
      selectedStudentId: studentId,
      selectedStudentName: selected.name
    });
  },

  /**
   * 学员筛选变更
   * @param {Object} e 事件对象
   */
  onStudentPickerChange(e) {
    const index = Number(e.detail.value);
    const selected = this.data.studentPickerRange[index] || { student_id: null, name: '全部学员' };
    this.setData({
      studentPickerIndex: index,
      selectedStudentId: selected.student_id,
      selectedStudentName: selected.name
    }, () => {
      this.loadStats();
    });
  },

  /**
   * 构建查询参数
   * @returns {Object}
   */
  buildQueryParams() {
    const { startDate, endDate, selectedStudentId } = this.data;
    const params = {};
    if (startDate) {
      params.start_date = startDate;
    }
    if (endDate) {
      params.end_date = endDate;
    }
    if (selectedStudentId) {
      params.student_ids = String(selectedStudentId);
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
      const [overviewRes, rankingRes] = await Promise.all([
        api.stats.getOverview(params),
        api.stats.getCompletionRanking({ ...params, limit: 20 })
      ]);
      wx.hideLoading();

      const overview = (overviewRes && overviewRes.data) ? overviewRes.data : {};
      const ranking = (rankingRes && rankingRes.data && rankingRes.data.list) ? rankingRes.data.list : [];

      this.setData({
        overview: {
          completed_lessons: overview.completed_lessons || 0,
          completed_revenue: overview.completed_revenue || 0,
          remaining_lessons: overview.remaining_lessons || 0,
          remaining_revenue: overview.remaining_revenue || 0
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
