/**
 * pages/donationList/donationList.js
 * 赞助墙页面
 */

const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    list: [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: true,
    loading: false,
    isEmpty: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadList();
  },

  /**
   * 加载赞助列表
   */
  async loadList(isRefresh = false) {
    if (this.data.loading) {
      return;
    }

    // 如果是刷新，重置页码
    if (isRefresh) {
      this.setData({
        page: 1,
        list: [],
        hasMore: true
      });
    }

    // 没有更多数据
    if (!this.data.hasMore && !isRefresh) {
      return;
    }

    this.setData({
      loading: true
    });

    try {
      const result = await api.donation.getPublicList({
        page: this.data.page,
        page_size: this.data.pageSize
      });

      if (!result || !result.data) {
        throw new Error('获取数据失败');
      }

      const newList = result.data.list || [];
      const total = result.data.total || 0;

      this.setData({
        list: isRefresh ? newList : [...this.data.list, ...newList],
        total: total,
        hasMore: newList.length >= this.data.pageSize,
        isEmpty: (isRefresh ? newList : [...this.data.list, ...newList]).length === 0,
        loading: false
      });

    } catch (error) {
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
      this.setData({
        loading: false,
        isEmpty: true
      });
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadList(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) {
      return;
    }
    this.setData({
      page: this.data.page + 1
    });
    this.loadList();
  }
});

