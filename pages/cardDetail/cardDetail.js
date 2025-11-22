/**
 * pages/cardDetail/cardDetail.js
 * 卡片详情页面
 */

const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    cardId: null,
    cardDetail: null, // 卡片详情
    usageRecords: [], // 使用记录
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.cardId) {
      this.setData({
        cardId: parseInt(options.cardId)
      }, () => {
        this.loadCardDetail();
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 加载卡片详情
   */
  async loadCardDetail() {
    const { cardId } = this.data;
    
    try {
      this.setData({ loading: true });
      
      const result = await api.card.getCardDetail(cardId);
      
      if (result && result.data) {
        let usageRecords = result.data.usage_records || [];
        usageRecords = usageRecords.map(item => ({
          ...item,
          start_time: `${item.start_time.split(':')[0]}:${item.start_time.split(':')[1]}`,
          end_time: `${item.end_time.split(':')[0]}:${item.end_time.split(':')[1]}`,
        }))
        this.setData({
          cardDetail: result.data,
          usageRecords: usageRecords
        });
      }
    } catch (error) {
      console.error('加载卡片详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 查看课程详情
   */
  onViewCourse(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/courseDetail/courseDetail?id=${id}`
    });
  },
});
