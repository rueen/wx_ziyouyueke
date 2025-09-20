// pages/categoriesDetail/categoriesDetail.js
const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    type: 'add',
    id: null,
    category: {},
    name: '',
    desc: '',
    studentLessons: [],
    isFirstLoad: true, // 标记是否首次加载
    isLoading: false, // 加载状态
    isEditing: false,    // 是否处于编辑状态
    isSaving: false,     // 是否正在保存
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if(options.type === 'add') {
      this.setData({
        isEditing: true
      })
    }
    this.setData({
      isFirstLoad: false,
      type: options.type,
      id: options.id
    }, () => {
      if(this.data.type === 'edit'){
        this.getDetail()
      }
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 只有非首次加载时才刷新数据（从其他页面返回时）
    if (!this.data.isFirstLoad) {
      if(this.data.type === 'edit'){
        this.getDetail()
      }
    }
  },

  async getDetail(){
    if (this.data.isLoading) return;
    try {
      this.setData({ isLoading: true });

      const result = await api.categories.getDetail(this.data.id);
      
      if (result && result.data) {
        const category = result.data.category || {};
        const studentLessons = result.data.studentLessons || [];
        this.setData({
          category: category,
          name: category.name,
          desc: category.desc,
          studentLessons: studentLessons.filter(item => item.remainingLessons > 0)
        });
      }
    } catch (error) {
      this.setData({
        isLoading: false
      });
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },
  /**
   * 开始编辑
   */
  onStartEdit() {
    this.setData({
      isEditing: true
    });
  },
  handleDel() {
    const { studentLessons } = this.data;
    if(studentLessons.length > 0){
      wx.showModal({
        title: '无法删除',
        content: `该分类下有相关学员存在剩余课时，请先消耗完课时或将课时数修改为0后再删除。`,
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#007aff'
      });
    } else {
      wx.showModal({
        title: '',
        content: '确定删除吗？',
        complete: (res) => {
          if (res.confirm) {
            this.onDel()
          }
        }
      })
    }
  },
  /**
   * 取消编辑
   */
  onCancelEdit() {
    const { category } = this.data;
    this.setData({
      isEditing: false,
      name: category.name,
      desc: category.desc
    });
  },
  onNameInput(e){
    this.setData({
      name: e.detail.value
    });
  },
  onDescInput(e){
    this.setData({
      desc: e.detail.value
    });
  },
  async onDel() {
    const { id, isSaving } = this.data;

    if (isSaving) {
      return; // 防止重复提交
    }

    try {
      this.setData({
        isSaving: true
      });

      wx.showLoading({
        title: '删除中...'
      });

      const result = await api.categories.delete(id);

      if (result && result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 1500,
        });
        setTimeout(() => {
          wx.hideLoading();
          wx.navigateBack();
        }, 1500)
      } else {
        throw new Error(result.message || '删除失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      
      this.setData({
        isSaving: false
      });

      const errorMessage = error.message || '删除失败，请重试';
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    }
  },
  async onAdd() {
    const { name, desc, isSaving } = this.data;

    if (isSaving) {
      return; // 防止重复提交
    }

    try {
      this.setData({
        isSaving: true
      });

      wx.showLoading({
        title: '保存中...'
      });

      const result = await api.categories.add({
        name: name,
        desc: desc
      });
      
      if (result && result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        });
        setTimeout(() => {
          wx.hideLoading();
          wx.navigateBack();
        }, 1500)
      } else {
        throw new Error(result.message || '保存失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      
      this.setData({
        isSaving: false
      });

      const errorMessage = error.message || '保存失败，请重试';
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    }
  },
  async onEdit() {
    const { name, desc, isSaving, id } = this.data;

    if (isSaving) {
      return; // 防止重复提交
    }

    try {
      this.setData({
        isSaving: true
      });

      wx.showLoading({
        title: '保存中...'
      });

      const result = await api.categories.edit(id, {
        name: name,
        desc: desc
      });
      
      wx.hideLoading();

      if (result && result.success) {
        this.setData({
          isEditing: false,
          isSaving: false,
          isLoading: false
        });
        this.getDetail()
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        });
      } else {
        throw new Error(result.message || '保存失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      
      this.setData({
        isSaving: false
      });

      const errorMessage = error.message || '保存失败，请重试';
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    }
  },
  async onSave(){
    if(this.data.type === 'add') {
      this.onAdd()
    } else {
      this.onEdit()
    }
  }
  
})