/**
 * pages/studentList/studentList.js
 * 学员列表页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    students: [],
    coachInfo: {}
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadStudents();
    this.loadCoachInfo();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    
  },

  /**
   * 加载学员列表
   */
  async loadStudents() {
    try {
      wx.showLoading({
        title: '加载中...'
      });

      // 调用API获取我的学员列表
      const result = await api.relation.getMyStudents();
      
      wx.hideLoading();

      if (result && result.data && result.data.length > 0) {
        // 格式化数据
        const students = result.data.map(item => ({
          id: item.id,
          name: (item.student && item.student.nickname) || '未知学员',
          avatar: (item.student && item.student.avatar_url) || '/images/defaultAvatar.png',
          level: '初级', // 暂时写死，后续可以从用户信息中获取
          remainingLessons: item.remaining_lessons || 0,
          introduction: (item.student && item.student.intro) || '暂无介绍',
          remark: item.coach_remark || '无备注',
          phone: (item.student && item.student.phone) || ''
        }));

        this.setData({
          students
        });

        console.log('加载学员数据成功:', students);
      } else {
        // 没有学员数据时，使用空数组
        this.setData({
          students: []
        });
        console.log('暂无学员数据');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载学员数据失败:', error);
      
      // API调用失败时，使用原有的静态数据作为后备
      console.log('使用静态数据作为后备');
      
      wx.showToast({
        title: '加载失败，显示缓存数据',
        icon: 'none'
      });
    }
  },

  /**
   * 加载教练信息
   */
  loadCoachInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        coachInfo: userInfo
      });
    }
  },

  /**
   * 进入学员详情
   */
  onStudentDetail(e) {
    const student = e.currentTarget.dataset.student;
    wx.navigateTo({
      url: `/pages/studentDetail/studentDetail?studentData=${encodeURIComponent(JSON.stringify(student))}`
    });
  },

  /**
   * 添加学员 - 直接分享绑定教练页面
   */
  onAddStudent() {
    console.log('分享绑定教练页面');
    
    // 直接触发分享
    this.shareBindCoachPage();
  },

    /**
   * 分享绑定教练页面
   */
  shareBindCoachPage() {
    // 显示分享菜单
    wx.showShareMenu({
      withShareTicket: true,
      success: () => {
        console.log('分享菜单显示成功');
      }
    });

    // 提示用户点击右上角分享
    wx.showToast({
      title: '请点击右上角分享给好友',
      icon: 'none',
      duration: 2000
    });
  },

  /**
   * 页面分享配置
   */
  onShareAppMessage() {
    const { coachInfo } = this.data;
    console.log(`/pages/bindCoach/bindCoach?coach_id=${coachInfo.id}`)
    return {
      title: `${coachInfo.nickname}邀请您成为学员`,
      path: `/pages/bindCoach/bindCoach?coach_id=${coachInfo.id}`,
      imageUrl: coachInfo.avatar_url
    };
  }
}) 