/**
 * pages/studentDetail/studentDetail.js
 * 学员详情页面
 */
Page({

  /**
   * 页面的初始数据
   */
  data: {
    studentData: {},
    editableLessons: '', // 可编辑的课时数
    studentRemark: ''    // 学员备注
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.studentData) {
      try {
        const studentData = JSON.parse(decodeURIComponent(options.studentData));
        this.setData({
          studentData,
          editableLessons: studentData.remainingLessons.toString(),
          studentRemark: studentData.remark || ''
        });
      } catch (error) {
        console.error('解析学员数据失败：', error);
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
      }
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
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 输入课时数
   */
  onLessonsInput(e) {
    this.setData({
      editableLessons: e.detail.value
    });
  },

  /**
   * 保存课时数
   */
  onSaveLessons() {
    const { editableLessons, studentData } = this.data;
    const lessonsNum = parseInt(editableLessons);
    
    if (!lessonsNum || lessonsNum < 0) {
      wx.showToast({
        title: '请输入正确的课时数',
        icon: 'none'
      });
      // 恢复原来的值
      this.setData({
        editableLessons: studentData.remainingLessons.toString()
      });
      return;
    }

    // 更新数据
    const updatedStudentData = {
      ...studentData,
      remainingLessons: lessonsNum
    };

    this.setData({
      studentData: updatedStudentData
    });

    // 这里应该调用后端API保存课时数
    console.log('保存课时数：', lessonsNum);
    
    wx.showToast({
      title: '课时数已更新',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 输入备注
   */
  onRemarkInput(e) {
    this.setData({
      studentRemark: e.detail.value
    });
  },

  /**
   * 保存备注
   */
  onSaveRemark() {
    const { studentRemark, studentData } = this.data;
    
    // 更新数据
    const updatedStudentData = {
      ...studentData,
      remark: studentRemark.trim()
    };

    this.setData({
      studentData: updatedStudentData
    });

    // 这里应该调用后端API保存备注
    console.log('保存备注：', studentRemark.trim());
    
    wx.showToast({
      title: '备注已保存',
      icon: 'success',
      duration: 1500
    });
  },

  /**
   * 约课
   */
  onBookStudent() {
    const { studentData } = this.data;
    wx.navigateTo({
      url: `/pages/bookStudent/bookStudent?from=studentDetail&studentId=${studentData.id}&studentName=${encodeURIComponent(studentData.name)}`
    });
  }
})