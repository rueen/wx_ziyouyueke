/**
 * pages/trainingRecordTypeManagement/trainingRecordTypeManagement.js
 * 训练记录类型管理页面
 */
const api = require('../../utils/api.js');

Page({
  data: {
    loading: true,
    types: []
  },

  onLoad() {
    this.loadTypes();
  },

  onShow() {
    this.loadTypes();
  },

  /** 加载类型列表 */
  async loadTypes() {
    try {
      this.setData({ loading: true });
      const result = await api.trainingRecordType.getList();
      this.setData({
        types: (result && result.data) ? result.data : [],
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /** 跳转到新增类型页 */
  onAddType() {
    wx.navigateTo({ url: '/pages/trainingRecordTypeEdit/trainingRecordTypeEdit' });
  },

  /** 跳转到编辑类型页，携带字段数据 */
  onEditType(e) {
    const type = e.currentTarget.dataset.type;
    const fields = Array.isArray(type.fields) ? type.fields : [];
    wx.navigateTo({
      url: `/pages/trainingRecordTypeEdit/trainingRecordTypeEdit?typeId=${type.id}&typeName=${encodeURIComponent(type.name)}&fields=${encodeURIComponent(JSON.stringify(fields))}`
    });
  },

  /** 删除类型（二次确认） */
  onDeleteType(e) {
    const type = e.currentTarget.dataset.type;
    wx.showModal({
      title: '删除类型',
      content: `确定要删除类型「${type.name}」吗？`,
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '删除中...' });
          await api.trainingRecordType.delete(type.id);
          wx.hideLoading();
          wx.showToast({ title: '删除成功', icon: 'success' });
          await this.loadTypes();
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
      }
    });
  }
});
