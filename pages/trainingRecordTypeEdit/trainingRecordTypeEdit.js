/**
 * pages/trainingRecordTypeEdit/trainingRecordTypeEdit.js
 * 新增/编辑训练记录类型（含自定义字段）
 */
const api = require('../../utils/api.js');

Page({
  data: {
    typeId: null,
    typeName: '',
    /** @type {string[]} 自定义字段名称列表 */
    fields: [],
    isSaving: false
  },

  onLoad(options) {
    if (options.typeId) {
      let fields = [];
      try {
        fields = options.fields ? JSON.parse(decodeURIComponent(options.fields)) : [];
      } catch (e) {}
      this.setData({
        typeId: parseInt(options.typeId),
        typeName: options.typeName ? decodeURIComponent(options.typeName) : '',
        fields: Array.isArray(fields) ? fields : []
      });
    }
  },

  onNameInput(e) {
    this.setData({ typeName: e.detail.value });
  },

  /** 字段名称输入 */
  onFieldInput(e) {
    const index = e.currentTarget.dataset.index;
    const fields = [...this.data.fields];
    fields[index] = e.detail.value;
    this.setData({ fields });
  },

  /** 添加一个空字段 */
  onAddField() {
    const fields = [...this.data.fields, ''];
    this.setData({ fields });
  },

  /** 删除指定字段 */
  onDeleteField(e) {
    const index = e.currentTarget.dataset.index;
    const fields = [...this.data.fields];
    fields.splice(index, 1);
    this.setData({ fields });
  },

  async onSave() {
    const { typeId, typeName, fields, isSaving } = this.data;
    if (isSaving) return;
    const name = typeName.trim();
    if (!name) {
      wx.showToast({ title: '请输入类型名称', icon: 'none' });
      return;
    }
    // 过滤掉空字段名
    const cleanFields = fields.map(f => f.trim()).filter(f => f.length > 0);
    try {
      this.setData({ isSaving: true });
      wx.showLoading({ title: '保存中...' });
      const params = { name, fields: cleanFields };
      if (typeId) {
        await api.trainingRecordType.update(typeId, params);
      } else {
        await api.trainingRecordType.create(params);
      }
      wx.hideLoading();
      wx.showToast({ title: typeId ? '修改成功' : '添加成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSaving: false });
    }
  }
});
