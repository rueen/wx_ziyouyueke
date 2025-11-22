/**
 * pages/cardDetail/cardDetail.js
 * 卡片详情页面
 */

const api = require('../../utils/api.js');
const { formatDate } = require('../../utils/util.js');

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
        this.setData({
          cardDetail: result.data,
          usageRecords: result.data.usage_records || []
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

  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    return formatDate(new Date(dateStr));
  },

  /**
   * 获取预约状态文本
   */
  getStatusText(status) {
    const statusMap = {
      1: '待确认',
      2: '已确认',
      3: '已完成',
      4: '已取消'
    };
    return statusMap[status] || '未知状态';
  },

  /**
   * 获取预约状态类名
   */
  getStatusClass(status) {
    const classMap = {
      1: 'pending',
      2: 'confirmed',
      3: 'completed',
      4: 'cancelled'
    };
    return classMap[status] || '';
  }
});
