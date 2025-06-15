/**
 * pages/coachList/coachList.js
 * 我的教练列表页面 - 显示当前学员绑定的教练列表，包含课程统计信息
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    coaches: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadCoaches();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    
  },

  /**
   * 加载我的教练列表
   */
  async loadCoaches() {
    try {
      wx.showLoading({
        title: '加载中...'
      });

      const result = await api.relation.getMyCoaches();
      
      wx.hideLoading();
      
      if (result && result.data && result.data.list) {
        const coaches = result.data.list.map(relation => ({
          id: relation.id,
          coachId: relation.coach.id,
          coachName: relation.coach.nickname || '未知教练',
          coachAvatar: relation.coach.avatar_url || '/images/defaultAvatar.png',
          coachPhone: relation.coach.phone || '',
          totalSessions: relation.total_sessions || 0,
          remainingSessions: relation.remaining_sessions || 0,
          status: relation.status,
          createTime: relation.created_at,
          notes: relation.notes || ''
        }));

        this.setData({
          coaches: coaches,
          isEmpty: coaches.length === 0
        });
      } else {
        this.setData({
          coaches: [],
          isEmpty: true
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载我的教练数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 进入教练详情
   */
  onCoachDetail(e) {
    const coach = e.currentTarget.dataset.coach;
    wx.navigateTo({
      url: `/pages/coachDetail/coachDetail?coachData=${encodeURIComponent(JSON.stringify(coach))}`
    });
  }
}) 