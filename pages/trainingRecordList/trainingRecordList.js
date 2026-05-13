/**
 * pages/trainingRecordList/trainingRecordList.js
 * 训练记录列表页
 */
const api = require('../../utils/api.js');

/** 根据时间key计算开始/结束日期字符串 YYYY-MM-DD（使用本地时间，避免UTC偏差） */
function getDateRange(key) {
  /**
   * 格式化为本地日期字符串 YYYY-MM-DD
   * @param {Date} d
   */
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const today = new Date();
  if (key === 'last3days') {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return { start: fmt(d), end: fmt(today) };
  }
  if (key === 'today') {
    return { start: fmt(today), end: fmt(today) };
  }
  if (key === 'yesterday') {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return { start: fmt(d), end: fmt(d) };
  }
  if (key === 'thisWeek') {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return { start: fmt(d), end: fmt(today) };
  }
  if (key === 'lastWeek') {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() - 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: fmt(start), end: fmt(end) };
  }
  if (key === 'thisMonth') {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: fmt(d), end: fmt(today) };
  }
  if (key === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: fmt(start), end: fmt(end) };
  }
  return {};
}

Page({
  data: {
    loading: true,
    isStudent: false,
    studentId: null,
    /** 固定教练ID（从coachDetail/studentDetail跳转时传入，为null时表示全部教练） */
    coachId: null,
    studentName: '',
    records: [],
    types: [],
    /** 教练列表（学员从profile入口时可筛选） */
    coaches: [],
    /** 当前选中的教练筛选（null=全部） */
    selectedCoachId: null,
    selectedCoachName: '全部',
    /** 是否展示教练筛选栏（学员从profile入口且coachId为null时展示） */
    showCoachFilter: false,
    /** 教练 selector picker：range 为 { id, name }，id 为 null 表示全部 */
    coachPickerRange: [{ id: null, name: '全部' }],
    coachPickerIndex: 0,
    /** 类型 selector picker */
    typePickerRange: [{ id: null, name: '全部' }],
    typePickerIndex: 0,
    selectedTypeId: null,
    selectedTypeName: '全部',
    selectedTimeKey: 'all',
    selectedTimeLabel: '全部',
    customStart: '',
    customEnd: '',
    showTimeModal: false
  },

  onLoad(options) {
    const isStudent = options.isStudent === 'true';
    const studentId = options.studentId ? parseInt(options.studentId) : null;
    // coachId 为空字符串时视为 null（学员从profile入口不传coachId）
    const coachId = (options.coachId && options.coachId !== '') ? parseInt(options.coachId) : null;
    const studentName = options.studentName ? decodeURIComponent(options.studentName) : '';
    const showCoachFilter = isStudent && !coachId;
    this.setData({ isStudent, studentId, coachId, studentName, showCoachFilter });
    this.loadTypes();
    if (showCoachFilter) this.loadCoaches();
    this.loadRecords();
  },

  /** 加载类型列表（按角色分支） */
  async loadTypes() {
    const { isStudent, studentId, coachId, selectedCoachId } = this.data;
    try {
      let types = [];
      if (isStudent) {
        // 学员视角：获取该学员记录中出现的类型（去重），教练与列表筛选一致
        const effectiveCoachId = selectedCoachId || coachId;
        const result = await api.trainingRecord.getTypesByStudent(studentId, effectiveCoachId || undefined);
        const d = result && result.data;
        types = Array.isArray(d) ? d : (d && Array.isArray(d.list) ? d.list : []);
      } else {
        // 教练视角：获取自己维护的类型列表
        const result = await api.trainingRecordType.getList();
        const d = result && result.data;
        types = Array.isArray(d) ? d : (d && Array.isArray(d.list) ? d.list : []);
      }
      this.setData({ types });
      this.refreshTypePickerRange();
    } catch (e) {}
  },

  /**
   * 教练展示名（my-coaches 关系对象）
   * @param {Object} c
   * @returns {string}
   */
  _coachDisplayName(c) {
    const id = this._coachUserId(c);
    return (c.coach && c.coach.nickname) || c.nickname || c.name || `教练${id}`;
  },

  /**
   * 教练用户 id
   * @param {Object} c
   * @returns {number|string}
   */
  _coachUserId(c) {
    return (c.coach && c.coach.id) || c.coach_id || c.id;
  },

  /** 根据当前 coaches、selectedCoachId 刷新教练 picker 的 range 与 index */
  refreshCoachPickerRange() {
    const { coaches, selectedCoachId } = this.data;
    const coachPickerRange = [{ id: null, name: '全部' }, ...coaches.map(c => ({
      id: this._coachUserId(c),
      name: this._coachDisplayName(c)
    }))];
    let coachPickerIndex = 0;
    if (selectedCoachId != null && selectedCoachId !== '') {
      const found = coachPickerRange.findIndex((row) => String(row.id) === String(selectedCoachId));
      coachPickerIndex = found >= 0 ? found : 0;
    }
    this.setData({ coachPickerRange, coachPickerIndex });
  },

  /** 根据当前 types、selectedTypeId 刷新类型 picker */
  refreshTypePickerRange() {
    const { types, selectedTypeId } = this.data;
    const typePickerRange = [{ id: null, name: '全部' }, ...types.map(t => ({ id: t.id, name: t.name }))];
    let typePickerIndex = 0;
    if (selectedTypeId != null && selectedTypeId !== '') {
      const found = typePickerRange.findIndex((row) => String(row.id) === String(selectedTypeId));
      typePickerIndex = found >= 0 ? found : 0;
    }
    this.setData({ typePickerRange, typePickerIndex });
  },

  /** 加载学员的教练列表（用于教练筛选） */
  async loadCoaches() {
    try {
      const result = await api.relation.getMyCoachList();
      const d = result && result.data;
      // 兼容 data 直接为数组 或 data.list 结构
      const coaches = Array.isArray(d) ? d : (d && Array.isArray(d.list) ? d.list : []);
      this.setData({ coaches });
      this.refreshCoachPickerRange();
    } catch (e) {}
  },

  async loadRecords() {
    const { studentId, coachId, selectedCoachId, selectedTypeId, selectedTimeKey, customStart, customEnd } = this.data;
    this.setData({ loading: true });
    try {
      const params = { student_id: studentId };
      // 优先使用教练筛选选中值，其次使用固定coachId
      const effectiveCoachId = selectedCoachId || coachId;
      if (effectiveCoachId) params.coach_id = effectiveCoachId;
      if (selectedTypeId) params.type_id = selectedTypeId;
      if (selectedTimeKey !== 'all' && selectedTimeKey !== 'custom') {
        const range = getDateRange(selectedTimeKey);
        if (range.start) params.start_date = range.start;
        if (range.end) params.end_date = range.end;
      } else if (selectedTimeKey === 'custom') {
        if (customStart) params.start_date = customStart;
        if (customEnd) params.end_date = customEnd;
      }
      const result = await api.trainingRecord.getList(params);
      const list = (result && result.data && result.data.list) ? result.data.list : [];
      // 规范化：统一类型字段名，将 type_values 转为数组
      const records = list.map(item => {
        const typeObj = item.trainingType || item.type || null;
        const fv = item.type_values || item.type_values || {};
        const fieldValueList = (fv && typeof fv === 'object')
          ? Object.keys(fv).map(k => ({ label: k, value: fv[k] }))
          : [];
        return { ...item, typeObj, fieldValueList };
      });
      this.setData({ records, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onManageTypes() {
    wx.navigateTo({ url: '/pages/trainingRecordTypeManagement/trainingRecordTypeManagement' });
  },

  /**
   * 教练 picker 变更（mode=selector）
   * @param {{ detail: { value: string } }} e
   */
  onCoachPickerChange(e) {
    const idx = Number(e.detail.value);
    const row = this.data.coachPickerRange[idx];
    if (!row) return;
    this.setData({
      selectedCoachId: row.id,
      selectedCoachName: row.name,
      coachPickerIndex: idx
    });
    this.loadTypes();
    this.loadRecords();
  },

  /**
   * 类型 picker 变更
   * @param {{ detail: { value: string } }} e
   */
  onTypePickerChange(e) {
    const idx = Number(e.detail.value);
    const row = this.data.typePickerRange[idx];
    if (!row) return;
    this.setData({
      selectedTypeId: row.id,
      selectedTypeName: row.name,
      typePickerIndex: idx
    });
    this.loadRecords();
  },

  onFilterTime() { this.setData({ showTimeModal: true }); },
  onCloseTimeModal() { this.setData({ showTimeModal: false }); },

  /** 点击时间选项：仅高亮，不关闭弹窗，统一由确认按钮触发 */
  onSelectTime(e) {
    const { key, label } = e.currentTarget.dataset;
    // 切换预设时清空自定义日期
    if (key !== 'custom') {
      this.setData({ selectedTimeKey: key, selectedTimeLabel: label, customStart: '', customEnd: '' });
    } else {
      this.setData({ selectedTimeKey: key, selectedTimeLabel: label });
    }
  },

  /** "确认"按钮：关闭弹窗并刷新列表 */
  onConfirmTime() {
    const { selectedTimeKey, customStart, customEnd } = this.data;
    if (selectedTimeKey === 'custom') {
      if (!customStart || !customEnd) {
        wx.showToast({ title: '请选择开始和结束日期', icon: 'none' }); return;
      }
      this.setData({
        selectedTimeLabel: customStart + ' ~ ' + customEnd,
        showTimeModal: false
      });
    } else {
      this.setData({ showTimeModal: false });
    }
    this.loadRecords();
  },

  onCustomStartChange(e) { this.setData({ customStart: e.detail.value }); },
  onCustomEndChange(e) { this.setData({ customEnd: e.detail.value }); },


  onMoreAction(e) {
    const record = e.currentTarget.dataset.record;
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) this.onEditRecord(record);
        else this.onDeleteRecord(record);
      }
    });
  },

  onEditRecord(record) {
    const { studentId, coachId, selectedCoachId } = this.data;
    wx.navigateTo({
      url: `/pages/trainingRecordAdd/trainingRecordAdd?recordId=${record.id}&studentId=${studentId}&coachId=${coachId || selectedCoachId || ''}&recordData=${encodeURIComponent(JSON.stringify(record))}`
    });
  },

  onDeleteRecord(record) {
    wx.showModal({
      title: '删除记录', content: '确定要删除这条训练记录吗？',
      confirmText: '删除', confirmColor: '#ff3b30',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '删除中...' });
          await api.trainingRecord.delete(record.id);
          wx.hideLoading();
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadRecords();
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
      }
    });
  },

  onAddRecord() {
    const { studentId, coachId, selectedCoachId } = this.data;
    wx.navigateTo({
      url: `/pages/trainingRecordAdd/trainingRecordAdd?studentId=${studentId}&coachId=${coachId || selectedCoachId || ''}`
    });
  },

  onPreviewImage(e) {
    const { images, index } = e.currentTarget.dataset;
    wx.previewImage({ current: images[index], urls: images });
  },

  onShow() {
    if (!this.data.loading) this.loadRecords();
  }
});
