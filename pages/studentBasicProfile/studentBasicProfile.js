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
    gender: 0, // 0:未知 1:男 2:女
    genderText: '未设置',
    studentHeight: '',
    studentWeight: '',
    studentBirthday: '',
    isSaving: false
  },

  /**
   * 获取性别文本
   * @param {number} gender 性别值
   * @returns {string}
   */
  getGenderText(gender) {
    switch (gender) {
      case 1:
        return '男';
      case 2:
        return '女';
      default:
        return '未设置';
    }
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
        const student = studentData.student || {};
        const gender = studentData.gender ?? student.gender ?? 0;
        this.setData({
          relationRecordId: studentData.id,
          studentData,
          studentName: (studentData.student_name || student.nickname || '').trim(),
          studentRemark: studentData.coach_remark || '',
          gender,
          genderText: this.getGenderText(gender),
          studentHeight: studentData.height ?? student.height ?? '',
          studentWeight: studentData.weight ?? student.weight ?? '',
          studentBirthday: studentData.birthday ?? student.birthday ?? ''
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
   * 选择性别
   */
  onChooseGender() {
    wx.showActionSheet({
      itemList: ['男', '女'],
      success: (res) => {
        const gender = res.tapIndex === 0 ? 1 : 2;
        this.setData({
          gender,
          genderText: this.getGenderText(gender)
        });
      }
    });
  },

  /**
   * 身高输入
   * @param {Object} e 输入事件
   */
  onHeightInput(e) {
    this.setData({
      studentHeight: e.detail.value
    });
  },

  /**
   * 体重输入
   * @param {Object} e 输入事件
   */
  onWeightInput(e) {
    this.setData({
      studentWeight: e.detail.value
    });
  },

  /**
   * 生日选择
   * @param {Object} e 选择事件
   */
  onBirthdayChange(e) {
    this.setData({
      studentBirthday: e.detail.value
    });
  },

  /**
   * 提交基本资料
   */
  async onSubmit() {
    const {
      isSaving,
      relationRecordId,
      studentName,
      studentRemark,
      gender,
      studentHeight,
      studentWeight,
      studentBirthday
    } = this.data;
    const trimmedName = (studentName || '').trim();
    const trimmedHeight = (studentHeight || '').trim();
    const trimmedWeight = (studentWeight || '').trim();

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

    if (trimmedHeight) {
      const heightNum = parseFloat(trimmedHeight);
      if (Number.isNaN(heightNum) || heightNum <= 0 || heightNum > 300) {
        wx.showToast({
          title: '请输入有效的身高（1-300cm）',
          icon: 'none'
        });
        return;
      }
    }

    if (trimmedWeight) {
      const weightNum = parseFloat(trimmedWeight);
      if (Number.isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
        wx.showToast({
          title: '请输入有效的体重（1-500kg）',
          icon: 'none'
        });
        return;
      }
    }

    try {
      this.setData({ isSaving: true });
      wx.showLoading({ title: '提交中...' });

      const result = await api.relation.update(relationRecordId, {
        student_name: trimmedName,
        coach_remark: (studentRemark || '').trim(),
        gender,
        height: trimmedHeight ? parseFloat(trimmedHeight) : null,
        weight: trimmedWeight ? parseFloat(trimmedWeight) : null,
        birthday: (studentBirthday || '').trim() || null
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
