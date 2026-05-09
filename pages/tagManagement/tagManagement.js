/**
 * pages/tagManagement/tagManagement.js
 * 标签管理页面
 */
const api = require('../../utils/api.js');

Page({
  data: {
    loading: true,
    tags: [],
    showTagModal: false,
    editingTag: null,
    tagName: '',
    isSubmitting: false
  },

  onLoad() { this.loadTags(); },

  /** 加载标签列表 */
  async loadTags() {
    try {
      this.setData({ loading: true });
      const result = await api.tags.getList();
      this.setData({ tags: (result && result.data) ? result.data : [], loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onShowAddModal() {
    this.setData({ showTagModal: true, editingTag: null, tagName: '' });
  },

  onEditTag(e) {
    const tag = e.currentTarget.dataset.tag;
    this.setData({ showTagModal: true, editingTag: tag, tagName: tag.name });
  },

  onHideTagModal() {
    this.setData({ showTagModal: false, tagName: '', editingTag: null });
  },

  onTagNameInput(e) { this.setData({ tagName: e.detail.value }); },

  /** 确认新增/编辑 */
  async onConfirmTag() {
    const { tagName, editingTag, isSubmitting } = this.data;
    if (isSubmitting) return;
    const name = tagName.trim();
    if (!name) { wx.showToast({ title: '请输入标签名称', icon: 'none' }); return; }
    try {
      this.setData({ isSubmitting: true });
      wx.showLoading({ title: '保存中...' });
      if (editingTag) {
        await api.tags.update(editingTag.id, { name });
      } else {
        await api.tags.create({ name });
      }
      wx.hideLoading();
      wx.showToast({ title: editingTag ? '修改成功' : '添加成功', icon: 'success' });
      this.onHideTagModal();
      await this.loadTags();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  /** 删除标签（二次确认） */
  onDeleteTag(e) {
    const tag = e.currentTarget.dataset.tag;
    wx.showModal({
      title: '删除标签',
      content: `确定要删除标签「${tag.name}」吗？已打标签的学员将自动移除该标签。`,
      confirmText: '删除',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          wx.showLoading({ title: '删除中...' });
          await api.tags.delete(tag.id);
          wx.hideLoading();
          wx.showToast({ title: '删除成功', icon: 'success' });
          await this.loadTags();
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
      }
    });
  }
});
