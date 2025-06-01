/**
 * pages/bookCoach/bookCoach.js
 * 约教练页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 来源信息
    from: '', // 'home' 或 'coachDetail'
    
    // 教练相关
    availableCoaches: [], // 可选教练列表
    selectedCoach: null,  // 已选择的教练
    selectedCoachId: '',
    showCoachSelection: false, // 是否显示教练选择界面
    
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
    const { from, coachId, coachName } = options;
    
    this.setData({
      from: from || 'coachDetail'
    });

    // 加载可用教练列表
    this.loadAvailableCoaches();
    
    // 根据入口处理教练选择
    if (from === 'home') {
      // 从首页进入，需要选择教练
      this.handleHomeEntry();
    } else {
      // 从教练详情进入，教练已确定
      this.handleCoachDetailEntry(coachId, coachName);
    }
  },

  /**
   * 加载可用教练列表
   */
  loadAvailableCoaches() {
    // 这里应该从后端API获取，目前使用静态数据
    const coaches = [
      {
        id: 1,
        name: "李教练",
        avatar: "/images/defaultAvatar.png",
        specialty: "瑜伽 · 普拉提",
        remainingLessons: 5, // 剩余课时
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
        availableTime: [
          "周一 19:00-21:00",
          "周三 19:00-21:00",
          "周五 19:00-21:00"
        ]
      }
    ];
    
    this.setData({
      availableCoaches: coaches
    });
  },

  /**
   * 处理从首页进入的情况
   */
  handleHomeEntry() {
    const { availableCoaches } = this.data;
    
    if (availableCoaches.length === 0) {
      wx.showToast({
        title: '暂无可约教练',
        icon: 'none'
      });
      return;
    }
    
    if (availableCoaches.length === 1) {
      // 只有一个教练，直接选中
      this.setData({
        selectedCoach: availableCoaches[0],
        selectedCoachId: availableCoaches[0].id,
        showCoachSelection: false
      });
    } else {
      // 多个教练，显示选择界面
      this.setData({
        showCoachSelection: true
      });
    }
  },

  /**
   * 处理从教练详情进入的情况
   */
  handleCoachDetailEntry(coachId, coachName) {
    const { availableCoaches } = this.data;
    const coach = availableCoaches.find(c => c.id == coachId);
    
    if (coach) {
      this.setData({
        selectedCoach: coach,
        selectedCoachId: coach.id,
        showCoachSelection: false
      });
    } else {
      wx.showToast({
        title: '教练信息获取失败',
        icon: 'none'
      });
    }
  },

  /**
   * 选择教练
   */
  onSelectCoach(e) {
    const coach = e.currentTarget.dataset.coach;
    this.setData({
      selectedCoach: coach,
      selectedCoachId: coach.id,
      showCoachSelection: false,
      selectedTime: '', // 清空之前选择的时间
      location: '',     // 清空地点
      remark: ''       // 清空备注
    });
    this.checkCanSubmit();
  },

  /**
   * 更换教练
   */
  onChangeCoach() {
    this.setData({
      showCoachSelection: true,
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
    const { selectedCoach, selectedTime, location } = this.data;
    const canSubmit = selectedCoach && selectedTime && location.trim();
    this.setData({
      canSubmit
    });
  },

  /**
   * 提交约课
   */
  onSubmitBooking() {
    const { selectedCoach, selectedTime, location, remark } = this.data;
    
    if (!selectedCoach || !selectedTime || !location.trim()) {
      wx.showToast({
        title: '请完善约课信息',
        icon: 'none'
      });
      return;
    }

    // 构造约课数据
    const bookingData = {
      coachId: selectedCoach.id,
      coachName: selectedCoach.name,
      time: selectedTime,
      location: location.trim(),
      remark: remark.trim(),
      createTime: new Date().toLocaleString()
    };

    // 这里应该调用后端API提交约课
    console.log('约课数据：', bookingData);
    
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

  }
}) 