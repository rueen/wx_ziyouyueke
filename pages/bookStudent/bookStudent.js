/**
 * pages/bookStudent/bookStudent.js
 * 约学员页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 来源信息
    from: '', // 'home' 或 'studentDetail'
    
    // 学员相关
    availableStudents: [], // 可选学员列表
    selectedStudent: null,  // 已选择的学员
    selectedStudentId: '',
    showStudentSelection: false, // 是否显示学员选择界面
    
    // 教练可约时间
    coachAvailableTime: [
      "周一 09:00-12:00",
      "周一 14:00-17:00",
      "周二 08:00-12:00",
      "周三 14:00-17:00",
      "周三 19:00-21:00",
      "周四 15:00-18:00",
      "周五 10:00-15:00",
      "周六 10:00-16:00",
      "周日 09:00-11:00"
    ],
    
    // 约课表单
    selectedTime: '',     // 选择的时间
    location: '',         // 上课地点
    remark: '',          // 备注
    
    // 状态
    canSubmit: false     // 是否可以提交
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { from, studentId, studentName } = options;
    
    this.setData({
      from: from || 'studentDetail'
    });

    // 加载可用学员列表
    this.loadAvailableStudents();
    
    // 根据入口处理学员选择
    if (from === 'home') {
      // 从首页进入，需要选择学员
      this.handleHomeEntry();
    } else {
      // 从学员详情进入，学员已确定
      this.handleStudentDetailEntry(studentId, studentName);
    }
  },

  /**
   * 加载可用学员列表
   */
  loadAvailableStudents() {
    // 这里应该从后端API获取，目前使用静态数据
    const students = [];
    
    this.setData({
      availableStudents: students
    });
  },

  /**
   * 处理从首页进入的情况
   */
  handleHomeEntry() {
    const { availableStudents } = this.data;
    
    if (availableStudents.length === 0) {
      wx.showToast({
        title: '暂无可约学员',
        icon: 'none'
      });
      return;
    }
    
    if (availableStudents.length === 1) {
      // 只有一个学员，直接选中
      this.setData({
        selectedStudent: availableStudents[0],
        selectedStudentId: availableStudents[0].id,
        showStudentSelection: false
      });
    } else {
      // 多个学员，显示选择界面
      this.setData({
        showStudentSelection: true
      });
    }
  },

  /**
   * 处理从学员详情进入的情况
   */
  handleStudentDetailEntry(studentId, studentName) {
    const { availableStudents } = this.data;
    const student = availableStudents.find(s => s.id == studentId);
    
    if (student) {
      this.setData({
        selectedStudent: student,
        selectedStudentId: student.id,
        showStudentSelection: false
      });
    } else {
      wx.showToast({
        title: '学员信息获取失败',
        icon: 'none'
      });
    }
  },

  /**
   * 选择学员
   */
  onSelectStudent(e) {
    const student = e.currentTarget.dataset.student;
    this.setData({
      selectedStudent: student,
      selectedStudentId: student.id,
      showStudentSelection: false,
      selectedTime: '', // 清空之前选择的时间
      location: '',     // 清空地点
      remark: ''       // 清空备注
    });
    this.checkCanSubmit();
  },

  /**
   * 更换学员
   */
  onChangeStudent() {
    this.setData({
      showStudentSelection: true,
      selectedTime: '', // 清空之前选择的时间
      location: '',     // 清空地点
      remark: ''       // 清空备注
    });
    this.checkCanSubmit();
  },

  /**
   * 选择时间
   */
  onSelectTime(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({
      selectedTime: time
    });
    this.checkCanSubmit();
  },

  /**
   * 输入地点
   */
  onLocationInput(e) {
    this.setData({
      location: e.detail.value
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
    const { selectedStudent, selectedTime, location } = this.data;
    const canSubmit = selectedStudent && selectedTime && location.trim();
    this.setData({
      canSubmit
    });
  },

  /**
   * 提交约课
   */
  onSubmitBooking() {
    const { selectedStudent, selectedTime, location, remark } = this.data;
    
    if (!selectedStudent || !selectedTime || !location.trim()) {
      wx.showToast({
        title: '请完善约课信息',
        icon: 'none'
      });
      return;
    }

    // 构造约课数据
    const bookingData = {
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      time: selectedTime,
      location: location.trim(),
      remark: remark.trim(),
      createTime: new Date().toLocaleString()
    };

    // 这里应该调用后端API提交约课
    console.log('约学员数据：', bookingData);
    
    // 模拟提交成功
    wx.showToast({
      title: '约课成功',
      icon: 'success',
      duration: 2000
    });

    // 延迟跳转回首页
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 2000);
  }
}) 