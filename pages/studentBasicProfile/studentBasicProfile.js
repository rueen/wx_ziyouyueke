/**
 * pages/studentBasicProfile/studentBasicProfile.js
 * 学员基本资料页面
 */
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    relationId: null,
    studentId: null,
    relationRecordId: null,
    studentData: {
      student: {}
    },
    studentName: '',
    studentRemark: '',
    isSaving: false
  },

  /**
   * 生命周期函数--监听页面加载
   * @param {Object} options 页面参数
   */
  onLoad(options) {
    if (!options.relationId || !options.studentId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1200);
      return;
    }

    this.setData({
      relationId: Number(options.relationId),
      studentId: Number(options.studentId)
    }, () => {
      this.loadStudentDetail();
    });
  },

  /**
   * 加载学员详情
   */
  async loadStudentDetail() {
    const { relationId } = this.data;
    try {
      wx.showLoading({ title: '加载中...' });
      const result = await api.relation.getMyStudentsDetail(relationId);
      wx.hideLoading();

      if (result && result.data) {
        const studentData = result.data;
        this.setData({
          relationRecordId: studentData.id,
          studentData,
          studentName: (studentData.student_name || studentData.student.nickname || '').trim(),
          studentRemark: studentData.coach_remark || ''
        });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 学员姓名输入
   * @param {Object} e 输入事件
   */
  onStudentNameInput(e) {
    this.setData({
      studentName: e.detail.value
    });
  },

  /**
   * 备注输入
   * @param {Object} e 输入事件
   */
  onRemarkInput(e) {
    this.setData({
      studentRemark: e.detail.value
    });
  },

  /**
   * 提交基本资料
   */
  async onSubmit() {
    const { isSaving, relationRecordId, studentName, studentRemark } = this.data;
    const trimmedName = (studentName || '').trim();

    if (isSaving) {
      return;
    }

    if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 50) {
      wx.showToast({
        title: '学员姓名需为1-50个字符',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ isSaving: true });
      wx.showLoading({ title: '提交中...' });

      const result = await api.relation.update(relationRecordId, {
        student_name: trimmedName,
        coach_remark: (studentRemark || '').trim()
      });

      wx.hideLoading();
      this.setData({ isSaving: false });

      if (result && result.success) {
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1200);
        return;
      }

      throw new Error((result && result.message) || '提交失败');
    } catch (error) {
      wx.hideLoading();
      this.setData({ isSaving: false });
      wx.showToast({
        title: error.message || '提交失败，请重试',
        icon: 'none'
      });
    }
  }
});
