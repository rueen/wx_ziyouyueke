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

      // 调用API获取我的教练列表（学员绑定的教练）
      const result = await api.coach.getMyList({
        page: 1,
        limit: 20
      });
      
      wx.hideLoading();

      if (result && result.success && result.data && result.data.length > 0) {
        // 格式化API数据 - 新接口返回的是师生关系数据，包含教练信息和课程统计
        const coaches = result.data.map(relation => {
          const coach = relation.coach || {};
          return {
            id: coach.id,
            relationId: relation.id, // 师生关系ID
            name: coach.nickname || '未知教练',
            avatar: coach.avatar_url || '/images/defaultAvatar.png',
            specialty: coach.intro || '暂无专业介绍',
            remainingLessons: relation.remaining_sessions || 0, // 剩余课时
            totalLessons: relation.total_sessions || 0, // 总课时
            introduction: coach.intro || '暂无介绍',
            relationStatus: relation.status || 'active',
            stats: {
              totalCourses: relation.total_courses || 0,
              completedCourses: relation.completed_courses || 0,
              pendingCourses: relation.pending_courses || 0
            },
            availableTime: [
              '详细时间请查看教练详情'
            ]
          };
        });

        this.setData({
          coaches
        });

        console.log('API加载我的教练数据成功:', coaches);
        
        if (coaches.length === 0) {
          wx.showToast({
            title: '还没有绑定教练',
            icon: 'none'
          });
        }
      } else {
        this.setData({
          coaches: []
        });
        console.log('暂无绑定的教练');
        
        wx.showToast({
          title: '还没有绑定教练',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载我的教练数据失败:', error);
      
      // 显示错误信息
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
      
      // 设置空数据
      this.setData({
        coaches: []
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