/**
 * pages/coachList/coachList.js
 * 教练列表页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    coaches: [
      {
        id: 1,
        name: "李教练",
        avatar: "/images/defaultAvatar.png",
        specialty: "瑜伽 · 普拉提",
        remainingLessons: 5, // 剩余课时
        introduction: "资深瑜伽导师，拥有5年教学经验，擅长哈他瑜伽和阴瑜伽，曾获得国际瑜伽联盟200小时认证。",
        availableTime: [
          "周一 09:00-12:00",
          "周三 14:00-17:00", 
          "周五 10:00-15:00",
          "周日 09:00-11:00"
        ]
      },
      {
        id: 2,
        name: "王教练",
        avatar: "/images/defaultAvatar.png", 
        specialty: "力量训练 · 减脂",
        remainingLessons: 8, // 剩余课时
        introduction: "专业健身教练，精通力量训练和减脂塑形，帮助众多学员达成健身目标，拥有ACSM认证。",
        availableTime: [
          "周二 08:00-12:00",
          "周四 15:00-18:00",
          "周六 10:00-16:00"
        ]
      },
      {
        id: 3,
        name: "张教练", 
        avatar: "/images/defaultAvatar.png",
        specialty: "舞蹈 · 体态矫正",
        remainingLessons: 0, // 剩余课时为0
        introduction: "舞蹈专业出身，擅长爵士舞、现代舞教学，同时专注于体态矫正，让学员拥有优美身姿。",
        availableTime: [
          "周一 19:00-21:00",
          "周三 19:00-21:00",
          "周五 19:00-21:00"
        ]
      }
    ]
    // 测试空状态时，可将 coaches 设置为空数组: coaches: []
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
   * 加载教练列表
   */
  loadCoaches() {
    // 这里可以从后端API获取教练数据
    // 目前使用静态数据
    console.log('教练列表加载完成');
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