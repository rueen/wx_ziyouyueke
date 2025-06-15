/**
 * pages/coachDetail/coachDetail.js
 * 教练详情页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    coachData: {}
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.coachData) {
      try {
        const coachData = JSON.parse(decodeURIComponent(options.coachData));
        this.setData({
          coachData
        });
      } catch (error) {
        console.error('解析教练数据失败：', error);
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
      }
    } else if (options.coachId) {
      // 如果只有教练ID，从API获取详情
      this.loadCoachDetail(options.coachId);
    }
  },

  /**
   * 从API加载教练详情
   */
  async loadCoachDetail(coachId) {
    try {
      wx.showLoading({
        title: '加载中...'
      });

      const result = await api.user.getDetail(coachId);
      
      wx.hideLoading();

      if (result && result.data) {
        const coach = result.data;
        const coachData = {
          id: coach.id,
          name: coach.nickname || '未知教练',
          avatar: coach.avatar_url || '/images/defaultAvatar.png',
          specialty: coach.intro || '暂无专业介绍',
          introduction: coach.intro || '暂无介绍',
          stats: coach.stats || {},
          phone: coach.phone || ''
        };

        this.setData({
          coachData
        });

        console.log('加载教练详情成功:', coachData);
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载教练详情失败:', error);
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
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
   * 约课
   */
  onBookCoach() {
    const { coachData } = this.data;
    wx.navigateTo({
      url: `/pages/bookCourse/bookCourse?type=student-book-coach&from=coachDetail&coachId=${coachData.id}&coachName=${encodeURIComponent(coachData.name)}`
    });
  }
}) 