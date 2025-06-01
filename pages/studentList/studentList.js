/**
 * pages/studentList/studentList.js
 * 学员列表页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    students: [
      {
        id: 1,
        name: "小李",
        avatar: "/images/defaultAvatar.png",
        level: "初级",
        remainingLessons: 3, // 剩余课时
        introduction: "热爱健身的新手，主要目标是减脂塑形，希望通过专业指导建立良好的运动习惯。"
      },
      {
        id: 2,
        name: "小王",
        avatar: "/images/defaultAvatar.png", 
        level: "中级",
        remainingLessons: 5, // 剩余课时
        introduction: "有一定运动基础，希望提升力量训练水平，目标是增肌和提高身体素质。"
      },
      {
        id: 3,
        name: "小张", 
        avatar: "/images/defaultAvatar.png",
        level: "高级",
        remainingLessons: 0, // 剩余课时为0
        introduction: "资深健身爱好者，希望通过专业指导优化训练计划，提升训练效果。"
      }
    ]
    // 测试空状态时，可将 students 设置为空数组: students: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadStudents();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    
  },

  /**
   * 加载学员列表
   */
  loadStudents() {
    // 这里可以从后端API获取学员数据
    // 目前使用静态数据
    console.log('学员列表加载完成');
  },

  /**
   * 进入学员详情
   */
  onStudentDetail(e) {
    const student = e.currentTarget.dataset.student;
    wx.navigateTo({
      url: `/pages/studentDetail/studentDetail?studentData=${encodeURIComponent(JSON.stringify(student))}`
    });
  }
}) 