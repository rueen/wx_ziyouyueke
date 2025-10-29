// pages/allCoachList/allCoachList.js
const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    list: [],
    isLoading: false, // 加载状态
    hasMore: true, // 是否还有更多数据
    currentPage: 1, // 当前页码
    pageSize: 10, // 每页数量
    keyword: '', // 搜索关键词
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadList(true)
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadList(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (!this.data.isLoading && this.data.hasMore) {
      this.loadList(false)
    }
  },

  async loadList(isRefresh = false) {
    if (this.data.isLoading) return;

    try {
      this.setData({ isLoading: true });
      
      if (isRefresh) {
        this.setData({ 
          currentPage: 1,
          hasMore: true,
          isRefreshing: true
        });
      }

      if (!isRefresh && !this.data.hasMore) {
        this.setData({ isLoading: false });
        return;
      }

      const { currentPage, pageSize, keyword } = this.data;
      const params = {
        page: currentPage,
        limit: pageSize
      };
      
      // 如果有搜索关键词，添加到参数中
      if (keyword && keyword.trim()) {
        params.keyword = keyword.trim();
      }
      
      const res = await api.coaches.getList(params)
      if(res.success && res.data && res.data.list){
        const list = res.data.list.map(item => ({
          ...item
        }))
        this.setData({
          list: this.data.currentPage === 1 ? list : [...this.data.list, ...list],
          currentPage: currentPage + 1,
          isLoading: false,
          hasMore: res.data.page < res.data.totalPages
        });
      }
    } catch (error) {
      this.setData({
        isLoading: false
      });

      // 显示具体的错误信息
      const errorMsg = error.message || '加载失败，请重试';
      wx.showToast({
        title: errorMsg,
        icon: 'none'
      });
    }
  },

  /**
   * 搜索输入事件
   * @param {Object} e 事件对象
   */
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({
      keyword: keyword
    });
  },

  /**
   * 搜索确认事件（点击键盘搜索按钮）
   * @param {Object} e 事件对象
   */
  onSearchConfirm(e) {
    const keyword = e.detail.value || this.data.keyword;
    this.setData({
      keyword: keyword
    });
    this.loadList(true);
  },

  /**
   * 清空搜索
   */
  onClearSearch() {
    this.setData({
      keyword: ''
    });
    this.loadList(true);
  },

  /**
   * 点击教练卡片
   * @param {Object} e 事件对象
   */
  onCoachTap(e) {
    const { coach } = e.currentTarget.dataset;
    if (!coach || !coach.id) return;
    
    wx.navigateTo({
      url: `/pages/bindCoach/bindCoach?coachId=${coach.id}`
    });
  }

})