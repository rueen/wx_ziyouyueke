/**
 * pages/studentDetail/studentDetail.js
 * 学员详情页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    studentData: {},
    editableLessons: '', // 可编辑的课时数
    studentRemark: '',   // 学员备注
    isEditing: false,    // 是否处于编辑状态
    isSaving: false      // 是否正在保存
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
        console.log('加载学员数据:', studentData);
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
   * 开始编辑
   */
  onStartEdit() {
    this.setData({
      isEditing: true
    });
  },

  /**
   * 取消编辑
   */
  onCancelEdit() {
    const { studentData } = this.data;
    this.setData({
      isEditing: false,
      editableLessons: studentData.remainingLessons.toString(),
      studentRemark: studentData.remark || ''
    });
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
   * 输入备注
   */
  onRemarkInput(e) {
    this.setData({
      studentRemark: e.detail.value
    });
  },

  /**
   * 保存修改
   */
  async onSave() {
    const { editableLessons, studentRemark, studentData, isSaving } = this.data;
    
    if (isSaving) {
      return; // 防止重复提交
    }
    
    const lessonsNum = parseInt(editableLessons);
    
    if (isNaN(lessonsNum) || lessonsNum < 0) {
      wx.showToast({
        title: '请输入正确的课时数',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({
        isSaving: true
      });

      wx.showLoading({
        title: '保存中...'
      });

      // 调用API更新师生关系
      const updateData = {
        remaining_lessons: lessonsNum,
        coach_remark: studentRemark.trim()
      };

      console.log('更新师生关系数据:', updateData);
      console.log('师生关系ID:', studentData.id);

      const result = await api.relation.update(studentData.id, updateData);
      
      wx.hideLoading();

      if (result && result.success) {
        // 更新本地数据
        const updatedStudentData = {
          ...studentData,
          remainingLessons: lessonsNum,
          remark: studentRemark.trim()
        };

        this.setData({
          studentData: updatedStudentData,
          isEditing: false,
          isSaving: false
        });

        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        });

        console.log('师生关系更新成功:', result.data);
      } else {
        throw new Error(result.message || '保存失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('保存师生关系失败:', error);
      
      this.setData({
        isSaving: false
      });

      const errorMessage = error.message || '保存失败，请重试';
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    }
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