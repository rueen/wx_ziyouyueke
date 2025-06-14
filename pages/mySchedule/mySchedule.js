/**
 * pages/mySchedule/mySchedule.js
 * 我的时间页面（教练专用）
 */

const API = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentDate: '', // 当前选中的日期
    dateList: [], // 可预约日期列表
    timeSlots: [], // 当前日期的时间段列表
    isLoading: false, // 加载状态
    maxAdvanceDays: 30, // 最多可预约天数
    scrollLeft: 0 // 日期滚动位置
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initializePage();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时刷新数据
    if (this.data.currentDate) {
      this.loadTimeSlots(this.data.currentDate);
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadTimeSlots(this.data.currentDate);
    wx.stopPullDownRefresh();
  },

  /**
   * 初始化页面
   */
  async initializePage() {
    try {
      // 获取时间模板配置
      await this.loadTimeTemplate();
      
      // 生成日期列表
      this.generateDateList();
      
      // 设置默认选中今天
      const today = this.formatDate(new Date());
      this.setData({
        currentDate: today
      });
      
      // 加载今天的时间段
      await this.loadTimeSlots(today);
      
    } catch (error) {
      console.error('初始化页面失败:', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 获取时间模板配置
   */
  async loadTimeTemplate() {
    try {
      const result = await API.request({
        url: '/api/h5/time-templates',
        method: 'GET'
      });

      if (result.data && result.data.length > 0) {
        const template = result.data[0]; // 使用第一个激活的模板
        this.setData({
          maxAdvanceDays: template.max_advance_days || 30,
          timeTemplate: template
        });
      }
    } catch (error) {
      console.error('获取时间模板失败:', error);
      // 使用默认配置
      this.setData({
        maxAdvanceDays: 30
      });
    }
  },

  /**
   * 生成日期列表
   */
  generateDateList() {
    const dateList = [];
    const today = new Date();
    
    for (let i = 0; i < this.data.maxAdvanceDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateStr = this.formatDate(date);
      const weekDay = this.getWeekDay(date);
      const monthDay = this.getMonthDay(date);
      
      dateList.push({
        date: dateStr,
        weekDay: weekDay,
        monthDay: monthDay,
        isToday: i === 0,
        status: 'available' // 默认状态为可约，只有当前选中日期才会加载真实状态
      });
    }
    
    this.setData({
      dateList: dateList
    });
  },

  /**
   * 获取指定日期的状态
   */
  async getDateStatus(date, timeSlots) {
    try {
      // 根据时间段数据计算日期状态
      if (!timeSlots || timeSlots.length === 0) {
        return 'available';
      }
      
      // 检查是否所有时间段都已被预约
      const bookedSlots = timeSlots.filter(slot => slot.status === 'booked');
      const totalSlots = timeSlots.length;
      
      if (bookedSlots.length === totalSlots) {
        return 'full';
      } else {
        return 'available';
      }
    } catch (error) {
      console.error('计算日期状态失败:', error);
      return 'available';
    }
  },

  /**
   * 更新指定日期的状态
   */
  updateDateStatus(date, status) {
    const { dateList } = this.data;
    const updatedDateList = dateList.map(item => {
      if (item.date === date) {
        return { ...item, status: status };
      }
      return item;
    });
    
    this.setData({
      dateList: updatedDateList
    });
  },

  /**
   * 加载指定日期的时间段
   */
  async loadTimeSlots(date) {
    if (this.data.isLoading) return;
    
    try {
      this.setData({
        isLoading: true
      });

      // 获取时间模板的时间段
      const timeTemplate = this.data.timeTemplate;
      if (!timeTemplate || !timeTemplate.time_slots) {
        throw new Error('时间模板未配置');
      }

      const templateSlots = JSON.parse(timeTemplate.time_slots);
      
      // 获取该日期的预约情况
      const result = await API.request({
        url: '/api/h5/courses',
        method: 'GET',
        data: {
          role: 'coach',
          start_date: date,
          end_date: date
        }
      });

      const bookedCourses = result.data ? result.data.courses : [];
      
      // 生成时间段列表
      const timeSlots = templateSlots.map(slot => {
        // 查找该时间段是否有预约
        const bookedCourse = bookedCourses.find(course => 
          course.start_time === slot.startTime && course.end_time === slot.endTime
        );

        if (bookedCourse) {
          return {
            id: `${date}_${slot.startTime}_${slot.endTime}`,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'booked',
            studentName: bookedCourse.student ? bookedCourse.student.nickname : '未知学员',
            location: bookedCourse.notes || '未指定地点',
            bookingStatus: this.getBookingStatusText(bookedCourse.booking_status),
            courseId: bookedCourse.id
          };
        } else {
          return {
            id: `${date}_${slot.startTime}_${slot.endTime}`,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'free'
          };
        }
      });

      this.setData({
        timeSlots: timeSlots,
        isLoading: false
      });

      // 根据时间段数据更新当前日期的状态
      const dateStatus = await this.getDateStatus(date, timeSlots);
      this.updateDateStatus(date, dateStatus);

    } catch (error) {
      console.error('加载时间段失败:', error);
      this.setData({
        isLoading: false,
        timeSlots: []
      });
      
      // 更新日期状态为可约（出错时的默认状态）
      this.updateDateStatus(date, 'available');
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 获取预约状态文本
   */
  getBookingStatusText(status) {
    const statusMap = {
      1: '待确认',
      2: '已确认',
      3: '进行中',
      4: '已完成',
      5: '已取消'
    };
    return statusMap[status] || '未知状态';
  },

  /**
   * 选择日期
   */
  onSelectDate(e) {
    const { date } = e.currentTarget.dataset;
    
    if (date === this.data.currentDate) return;
    
    this.setData({
      currentDate: date
    });
    
    // 加载选中日期的时间段数据
    this.loadTimeSlots(date);
  },

  /**
   * 点击时间段
   */
  onTimeSlotTap(e) {
    const { slot } = e.currentTarget.dataset;
    
    if (slot.status === 'booked') {
      // 已预约的时间段，跳转到课程详情
      wx.navigateTo({
        url: `/pages/courseDetail/courseDetail?id=${slot.courseId}`
      });
    } else {
      // 空闲时间段，可以进行其他操作（如手动添加课程等）
      wx.showToast({
        title: '该时间段空闲',
        icon: 'none'
      });
    }
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 获取星期
   */
  getWeekDay(date) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekDays[date.getDay()];
  },

  /**
   * 获取月日
   */
  getMonthDay(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}.${day}`;
  }
}); 