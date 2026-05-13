/**
 * pages/trainingRecordAdd/trainingRecordAdd.js
 * 新增/编辑训练记录
 */
const api = require('../../utils/api.js');

/**
 * 将字段名称数组转换为带值的字段对象数组
 * @param {string[]} fields - 字段名称列表，如 ['腰围', '臀围(cm)']
 * @param {Object} [savedValues={}] - 编辑时已保存的字段值
 * @returns {{ label: string, unit: string, value: string }[]}
 */
function buildTypeFields(fields, savedValues = {}) {
  return (fields || []).map(name => {
    // 尝试解析括号内的单位，如"腰围(cm)" -> label='腰围', unit='cm'
    const match = name.match(/^(.+?)[\(（](.+?)[\)）]$/);
    const label = match ? match[1].trim() : name;
    const unit = match ? match[2].trim() : '';
    return { label, unit, value: savedValues[label] || '' };
  });
}

Page({
  data: {
    recordId: null,
    studentId: null,
    coachId: null,
    types: [],
    selectedType: null,
    /** @type {{ label: string, unit: string, value: string }[]} 当前类型的字段列表 */
    typeFields: [],
    content: '',
    images: [],
    isSaving: false,
    isUploading: false
  },

  onLoad(options) {
    const studentId = options.studentId ? parseInt(options.studentId) : null;
    const coachId = options.coachId ? parseInt(options.coachId) : null;
    const recordId = options.recordId ? parseInt(options.recordId) : null;
    this.setData({ studentId, coachId, recordId });
    this.loadTypes().then(() => {
      // 编辑模式：加载完类型后回填记录数据
      if (recordId && options.recordData) {
        try {
          const record = JSON.parse(decodeURIComponent(options.recordData));
          const selectedType = record.trainingType || null;
          const typeFields = selectedType
            ? buildTypeFields(selectedType.fields, record.type_values || {})
            : [];
          this.setData({
            selectedType,
            typeFields,
            content: record.content || '',
            images: record.images || []
          });
        } catch (e) {}
      }
    });
  },

  async loadTypes() {
    try {
      const result = await api.trainingRecordType.getList();
      this.setData({ types: (result && result.data) ? result.data : [] });
    } catch (e) {}
  },

  onPickType() {
    const { types } = this.data;
    if (!types.length) {
      wx.showToast({ title: '暂无类型', icon: 'none' });
      return;
    }
    const itemList = ['不选择', ...types.map(t => t.name)];
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex === 0) {
          this.setData({ selectedType: null, typeFields: [] });
        } else {
          const type = types[res.tapIndex - 1];
          const typeFields = buildTypeFields(type.fields);
          this.setData({ selectedType: type, typeFields });
        }
      }
    });
  },

  /** 字段值输入 */
  onFieldValueInput(e) {
    const index = e.currentTarget.dataset.index;
    const typeFields = [...this.data.typeFields];
    typeFields[index] = { ...typeFields[index], value: e.detail.value };
    this.setData({ typeFields });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  async onChooseImage() {
    const { images } = this.data;
    const remaining = 9 - images.length;
    if (remaining <= 0) return;
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const files = res.tempFiles;
        this.setData({ isUploading: true });
        wx.showLoading({ title: '上传中...' });
        try {
          const urls = [];
          for (const file of files) {
            const uploadResult = await api.upload.image(file.tempFilePath, 'training_records');
            if (uploadResult && uploadResult.data && uploadResult.data.url) {
              urls.push(uploadResult.data.url);
            }
          }
          this.setData({ images: [...this.data.images, ...urls] });
        } catch (e) {
          wx.showToast({ title: '上传失败', icon: 'none' });
        } finally {
          wx.hideLoading();
          this.setData({ isUploading: false });
        }
      }
    });
  },

  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  onPreviewImage(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    });
  },

  async onSave() {
    const { recordId, studentId, coachId, selectedType, typeFields, content, images, isSaving } = this.data;
    if (isSaving) return;
    try {
      this.setData({ isSaving: true });
      wx.showLoading({ title: '保存中...' });

      // 将字段数组转为 { 字段名: 值 } 对象提交
      const type_values = {};
      typeFields.forEach(f => {
        if (f.value !== '') type_values[f.label] = f.value;
      });

      const params = {
        student_id: studentId,
        content: content.trim(),
        images,
        type_values
      };
      if (selectedType) params.type_id = selectedType.id;

      if (recordId) {
        await api.trainingRecord.update(recordId, params);
      } else {
        await api.trainingRecord.create(params);
      }
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSaving: false });
    }
  }
});
