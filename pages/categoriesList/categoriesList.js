// pages/categoriesList/categoriesList.js
// 引入API工具类
const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    list: [],
    isFirstLoad: true, // 标记是否首次加载
    isLoading: false, // 加载状态
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.getList()
    this.setData({
      isFirstLoad: false
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 只有非首次加载时才刷新数据（从其他页面返回时）
    if (!this.data.isFirstLoad) {
      this.getList();
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.getList().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async getList() {
    if (this.data.isLoading) return;
    
    try {
      this.setData({ isLoading: true });

      // 调用API获取我的学员列表
      const result = await api.categories.getList();
      
      if (result && result.data) {
        // 格式化API数据为前端需要的格式
        const newList = result.data.map(item => ({
          ...item,
        }));

        this.setData({
          list: newList,
          isLoading: false
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

  openDetail(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: `/pages/categoriesDetail/categoriesDetail?type=edit&id=${item.id}`
    });
  },

  handleAdd() {
    wx.navigateTo({
      url: `/pages/categoriesDetail/categoriesDetail?type=add`
    });
  }
})