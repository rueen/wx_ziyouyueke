/**
 * pages/availableTime/availableTime.js
 * 我的可约时间页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 一周的时间安排
    weekSchedule: [
      {
        day: '周一',
        dayEn: 'monday',
        timeSlots: [
          { id: 1, startTime: '09:00', endTime: '12:00', status: 'available' },
          { id: 2, startTime: '14:00', endTime: '17:00', status: 'booked', bookedBy: '小李' }
        ]
      },
      {
        day: '周二', 
        dayEn: 'tuesday',
        timeSlots: [
          { id: 3, startTime: '08:00', endTime: '12:00', status: 'available' }
        ]
      },
      {
        day: '周三',
        dayEn: 'wednesday', 
        timeSlots: [
          { id: 4, startTime: '14:00', endTime: '17:00', status: 'available' },
          { id: 5, startTime: '19:00', endTime: '21:00', status: 'booked', bookedBy: '小王' }
        ]
      },
      {
        day: '周四',
        dayEn: 'thursday',
        timeSlots: [
          { id: 6, startTime: '15:00', endTime: '18:00', status: 'available' }
        ]
      },
      {
        day: '周五',
        dayEn: 'friday',
        timeSlots: [
          { id: 7, startTime: '10:00', endTime: '15:00', status: 'available' }
        ]
      },
      {
        day: '周六',
        dayEn: 'saturday',
        timeSlots: [
          { id: 8, startTime: '10:00', endTime: '16:00', status: 'available' }
        ]
      },
      {
        day: '周日',
        dayEn: 'sunday',
        timeSlots: [
          { id: 9, startTime: '09:00', endTime: '11:00', status: 'available' }
        ]
      }
    ],
    
    // 添加时间段的表单数据
    showAddForm: false,
    selectedDay: '',
    selectedDayIndex: -1,
    newStartTime: '',
    newEndTime: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadAvailableTime();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 加载可约时间数据
   */
  loadAvailableTime() {
    // 这里应该从后端API获取数据
    console.log('加载可约时间数据');
  },

  /**
   * 显示添加时间段表单
   */
  onShowAddForm(e) {
    const { day, index } = e.currentTarget.dataset;
    this.setData({
      showAddForm: true,
      selectedDay: day,
      selectedDayIndex: index,
      newStartTime: '',
      newEndTime: ''
    });
  },

  /**
   * 隐藏添加表单
   */
  onHideAddForm() {
    this.setData({
      showAddForm: false,
      selectedDay: '',
      selectedDayIndex: -1,
      newStartTime: '',
      newEndTime: ''
    });
  },

  /**
   * 输入开始时间
   */
  onStartTimeChange(e) {
    this.setData({
      newStartTime: e.detail.value
    });
  },

  /**
   * 输入结束时间
   */
  onEndTimeChange(e) {
    this.setData({
      newEndTime: e.detail.value
    });
  },

  /**
   * 确认添加时间段
   */
  onConfirmAdd() {
    const { selectedDayIndex, newStartTime, newEndTime, weekSchedule } = this.data;
    
    if (!newStartTime || !newEndTime) {
      wx.showToast({
        title: '请选择时间',
        icon: 'none'
      });
      return;
    }

    if (newStartTime >= newEndTime) {
      wx.showToast({
        title: '结束时间必须晚于开始时间',
        icon: 'none'
      });
      return;
    }

    // 检查时间重叠
    const currentDaySlots = weekSchedule[selectedDayIndex].timeSlots;
    const hasOverlap = this.checkTimeOverlap(newStartTime, newEndTime, currentDaySlots);
    
    if (hasOverlap) {
      wx.showToast({
        title: '时间段重叠，请重新选择',
        icon: 'none'
      });
      return;
    }

    // 生成新的时间段
    const newTimeSlot = {
      id: Date.now(), // 简单的ID生成
      startTime: newStartTime,
      endTime: newEndTime,
      status: 'available'
    };

    // 更新对应天的时间段
    const updatedSchedule = [...weekSchedule];
    updatedSchedule[selectedDayIndex].timeSlots.push(newTimeSlot);
    
    // 按时间排序
    updatedSchedule[selectedDayIndex].timeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    this.setData({
      weekSchedule: updatedSchedule,
      showAddForm: false,
      selectedDay: '',
      selectedDayIndex: -1,
      newStartTime: '',
      newEndTime: ''
    });

    // 这里应该调用后端API保存
    console.log('添加时间段：', newTimeSlot);
    
    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  /**
   * 检查时间重叠
   * @param {string} newStart 新时间段开始时间
   * @param {string} newEnd 新时间段结束时间
   * @param {Array} existingSlots 已有时间段数组
   * @returns {boolean} 是否有重叠
   */
  checkTimeOverlap(newStart, newEnd, existingSlots) {
    for (let slot of existingSlots) {
      const existingStart = slot.startTime;
      const existingEnd = slot.endTime;
      
      // 判断两个时间段是否重叠
      // 重叠条件：新开始时间 < 已有结束时间 且 已有开始时间 < 新结束时间
      if (newStart < existingEnd && existingStart < newEnd) {
        return true; // 有重叠
      }
    }
    return false; // 无重叠
  },

  /**
   * 删除时间段
   */
  onDeleteTimeSlot(e) {
    const { dayIndex, slotIndex } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个时间段吗？',
      success: (res) => {
        if (res.confirm) {
          const { weekSchedule } = this.data;
          const updatedSchedule = [...weekSchedule];
          updatedSchedule[dayIndex].timeSlots.splice(slotIndex, 1);
          
          this.setData({
            weekSchedule: updatedSchedule
          });

          // 这里应该调用后端API删除
          console.log('删除时间段');
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  }
}) 