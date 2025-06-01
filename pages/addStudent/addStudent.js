/**
 * pages/addStudent/addStudent.js
 * 添加学员页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 表单数据
    phone: '',        // 手机号
    lessons: '',      // 课时数
    remark: '',       // 备注
    
    // 状态
    canSubmit: false  // 是否可以提交
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 输入手机号
   */
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    });
    this.checkCanSubmit();
  },

  /**
   * 输入课时数
   */
  onLessonsInput(e) {
    this.setData({
      lessons: e.detail.value
    });
    this.checkCanSubmit();
  },

  /**
   * 输入备注
   */
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    });
  },

  /**
   * 检查是否可以提交
   */
  checkCanSubmit() {
    const { phone, lessons } = this.data;
    // 手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;
    // 课时数验证
    const lessonsNum = parseInt(lessons);
    
    const canSubmit = phoneRegex.test(phone) && lessonsNum > 0 && Number.isInteger(lessonsNum);
    this.setData({
      canSubmit
    });
  },

  /**
   * 提交添加学员
   */
  onSubmitAdd() {
    const { phone, lessons, remark } = this.data;
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }
    
    // 验证课时数
    const lessonsNum = parseInt(lessons);
    if (!lessonsNum || lessonsNum <= 0) {
      wx.showToast({
        title: '请输入正确的课时数',
        icon: 'none'
      });
      return;
    }

    // 构造学员数据
    const studentData = {
      phone: phone.trim(),
      lessons: lessonsNum,
      remark: remark.trim(),
      createTime: new Date().toLocaleString()
    };

    // 这里应该调用后端API添加学员
    console.log('添加学员数据：', studentData);
    
    // 模拟添加成功
    wx.showToast({
      title: '添加成功',
      icon: 'success',
      duration: 2000
    });

    // 延迟返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 2000);
  }
}) 