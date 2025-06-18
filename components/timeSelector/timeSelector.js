/**
 * components/timeSelector/timeSelector.js
 * 时间选择器组件
 */

const api = require('../../utils/api.js');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 教练ID（用于获取指定教练的时间安排）
    coachId: {
      type: Number,
      value: null
    },
    // 组件模式：'view'(查看模式) 或 'select'(选择模式)
    mode: {
      type: String,
      value: 'view'
    },
    // 是否显示已预约的详细信息
    showBookingDetails: {
      type: Boolean,
      value: true
    },
    // 最大可预约天数
    maxAdvanceDays: {
      type: Number,
      value: 30
    },
    selectedTimeSlot: {
      type: Object,
      value: {}
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    currentDate: '', // 当前选中的日期
    dateList: [], // 可预约日期列表
    timeSlots: [], // 当前日期的时间段列表
    isLoading: false, // 加载状态
    timeTemplate: null, // 时间模板
    scrollLeft: 0, // 日期滚动位置
    maxAdvanceDays: 30, // 最大可预约天数，默认30天
    userRole: '',
    currentUserId: null,
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      const userRole = wx.getStorageSync('userRole');
      const userInfo = wx.getStorageSync('userInfo');
      if (userRole && userInfo) {
        this.setData({
          userRole: userRole,
          currentUserId: userInfo.id
        });
      }
    },
    ready() {
      // 在ready阶段初始化，确保组件完全准备好
      this.initializeComponent();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'coachId': function(newCoachId) {
      if (newCoachId && typeof newCoachId === 'number') {
        this.initializeComponent();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化组件
     */
    async initializeComponent() {
      try {
        // 先生成基本的日期列表
        this.generateBasicDateList();
        
        // 设置默认选中今天
        const today = this.formatDate(new Date());
        this.setData({
          currentDate: today
        });
        
        // 异步加载时间模板和时间段数据
        this.loadTimeTemplate().then(() => {
          this.generateDateList(); // 重新生成日期列表
          this.loadTimeSlots(today); // 加载时间段
        }).catch(error => {
          console.error('加载时间模板失败:', error);
          // 即使失败也显示基本的日期选择器
        });
        
      } catch (error) {
        console.error('初始化时间选择器失败:', error);
        this.triggerEvent('error', {
          message: '加载失败，请重试'
        });
      }
    },

    /**
     * 生成基本日期列表（不依赖时间模板）
     */
    generateBasicDateList() {
      const dateList = [];
      const today = new Date();
      const maxDays = 30; // 使用默认值
      
      for (let i = 0; i < maxDays; i++) {
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
          status: 'available' // 默认状态为可约
        });
      }
      
      this.setData({
        dateList: dateList
      });
    },

    /**
     * 获取时间模板配置
     */
    async loadTimeTemplate() {
      try {
        // 安全地获取coachId属性
        const coachId = this.properties && this.properties.coachId ? this.properties.coachId : null;
          
        const result = await api.timeTemplate.getList(coachId);

        if (result.data && result.data.length > 0) {
          const template = result.data[0]; // 使用第一个激活的模板
          this.setData({
            timeTemplate: template
          });
          
          // 如果组件属性没有设置maxAdvanceDays，使用模板中的配置
          const propMaxDays = this.properties && this.properties.maxAdvanceDays ? this.properties.maxAdvanceDays : 30;
          if (!propMaxDays || propMaxDays === 30) {
            this.setData({
              maxAdvanceDays: template.max_advance_days || 30
            });
          }
        }
      } catch (error) {
        console.error('获取时间模板失败:', error);
        // 使用默认配置
        const defaultMaxDays = this.properties && this.properties.maxAdvanceDays ? this.properties.maxAdvanceDays : 30;
        this.setData({
          maxAdvanceDays: defaultMaxDays
        });
      }
    },

    /**
     * 生成日期列表
     */
    generateDateList() {
      const dateList = [];
      const today = new Date();
      // 获取最大可预约天数，优先使用data中的值，然后是properties中的值，最后是默认值
      let maxDays = 30;
      if (this.data && this.data.maxAdvanceDays) {
        maxDays = this.data.maxAdvanceDays;
      } else if (this.properties && this.properties.maxAdvanceDays) {
        maxDays = this.properties.maxAdvanceDays;
      }
      
      for (let i = 0; i < maxDays; i++) {
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
          status: 'available' // 默认状态为可约
        });
      }
      
      this.setData({
        dateList: dateList
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
          console.warn('时间模板未配置，显示空状态');
          this.setData({
            isLoading: false,
            timeSlots: []
          });
          return;
        }

        let templateSlots;
        try {
          templateSlots = timeTemplate.time_slots;
        } catch (parseError) {
          console.error('解析时间模板失败:', parseError);
          this.setData({
            isLoading: false,
            timeSlots: []
          });
          return;
        }
        
        // 获取该日期的预约情况
        const queryParams = {
          role: 'coach',
          start_date: date,
          end_date: date
        };
        
        // 如果指定了教练ID，添加到查询参数中
        const coachId = this.properties && this.properties.coachId ? this.properties.coachId : null;
        if (coachId) {
          queryParams.coach_id = coachId;
        }
        
        const result = await api.course.getList(queryParams);

        const bookedCourses = result.data ? result.data.list : [];

        // 生成时间段列表
        const timeSlots = templateSlots.map(slot => {
          // 检查时间段是否已过期
          const isExpired = this.isTimeSlotExpired(date, slot.startTime);
          
          // 查找该时间段的所有课程（包括已取消的）
          const allCoursesInSlot = bookedCourses.filter(course => {
            const course_start_time = `${course.start_time.split(':')[0]}:${course.start_time.split(':')[1]}`;
            const course_end_time = `${course.end_time.split(':')[0]}:${course.end_time.split(':')[1]}`;
            return course_start_time === slot.startTime && course_end_time === slot.endTime;
          });

          // 查找有效的课程（非已取消状态）
          const activeCourse = allCoursesInSlot.find(course => course.booking_status !== 4);
          
          // 如果有showBookingDetails且有课程（包括已取消的），优先显示最新的课程信息
          const displayCourse = this.properties.showBookingDetails && allCoursesInSlot.length > 0 
            ? allCoursesInSlot[allCoursesInSlot.length - 1] // 显示最新的课程
            : activeCourse; // 或者有效的课程

          if (activeCourse) {
            // 有有效课程，时间段不可预约
            const isCreatedByCurrentUser = activeCourse.created_by && activeCourse.created_by == this.data.currentUserId;
            return {
              id: `${date}_${slot.startTime}_${slot.endTime}`,
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: isExpired ? 'expired-booked' : 'booked',
              studentName: activeCourse.student ? activeCourse.student.nickname : '未知学员',
              location: activeCourse.address.name,
              booking_status: this.getStatusFromApi(activeCourse.booking_status),
              isCreatedByCurrentUser: isCreatedByCurrentUser,
              courseId: activeCourse.id,
              courseData: activeCourse,
              isExpired: isExpired
            };
          } else if (displayCourse && this.properties.showBookingDetails) {
            // 没有有效课程，但有已取消的课程且需要显示详情
            const isCreatedByCurrentUser = displayCourse.created_by && displayCourse.created_by == this.data.currentUserId;
            return {
              id: `${date}_${slot.startTime}_${slot.endTime}`,
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: isExpired ? 'expired' : 'free-with-cancelled', // 新状态：空闲但有已取消课程
              studentName: displayCourse.student ? displayCourse.student.nickname : '未知学员',
              location: displayCourse.address.name,
              booking_status: this.getStatusFromApi(displayCourse.booking_status),
              isCreatedByCurrentUser: isCreatedByCurrentUser,
              courseId: displayCourse.id,
              courseData: displayCourse,
              isExpired: isExpired,
              isSelectable: !isExpired // 可以重新预约
            };
          } else {
            // 没有任何课程或不显示详情
            return {
              id: `${date}_${slot.startTime}_${slot.endTime}`,
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: isExpired ? 'expired' : 'free',
              date: date,
              isExpired: isExpired
            };
          }
        });

        this.setData({
          timeSlots: timeSlots,
          isLoading: false
        });

        // 根据时间段数据更新当前日期的状态
        const dateStatus = this.getDateStatus(date, timeSlots);
        this.updateDateStatus(date, dateStatus);

        // 触发时间段加载完成事件
        this.triggerEvent('timeSlotsLoaded', {
          date: date,
          timeSlots: timeSlots
        });

      } catch (error) {
        console.error('加载时间段失败:', error);
        this.setData({
          isLoading: false,
          timeSlots: []
        });
        
        // 更新日期状态为可约（出错时的默认状态）
        this.updateDateStatus(date, 'available');
        
        this.triggerEvent('error', {
          message: '加载失败，请重试'
        });
      }
    },

    /**
     * 获取指定日期的状态
     */
    getDateStatus(date, timeSlots) {
      try {
        // 根据时间段数据计算日期状态
        if (!timeSlots || timeSlots.length === 0) {
          return 'available';
        }
        
        // 检查是否存在可以预约的时段
        const availableSlots = timeSlots.filter(slot => 
          slot.status === 'free' || slot.status === 'free-with-cancelled'
        );
        
        // 如果不存在可以预约的时段，显示"已满"
        if (availableSlots.length === 0) {
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
   * API状态码转换为中文状态
   */
  getStatusFromApi(status) {
    const statusMap = {
      1: 'pending',    // 待确认
      2: 'confirmed',  // 已确认
      3: 'completed',  // 已完成
      4: 'cancelled',   // 已取消
      5: 'cancelled'   // 超时已取消
    };
    return statusMap[status] || 'unknown';
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
      
      // 触发日期选择事件
      this.triggerEvent('dateSelected', {
        date: date
      });
    },

    /**
     * 判断时间段是否已过期
     * @param {string} date 日期 YYYY-MM-DD
     * @param {string} startTime 开始时间 HH:MM
     * @returns {boolean} 是否已过期
     */
    isTimeSlotExpired(date, startTime) {
      try {
        const now = new Date();
        const currentDate = this.formatDate(now);
        
        // 如果不是今天，不需要检查过期
        if (date !== currentDate) {
          return false;
        }
        
        // 解析时间段的开始时间
        const [hours, minutes] = startTime.split(':').map(Number);
        const slotDateTime = new Date();
        slotDateTime.setHours(hours, minutes, 0, 0);
        
        // 比较时间，如果时间段开始时间小于当前时间，则已过期
        return slotDateTime <= now;
      } catch (error) {
        console.error('判断时间段过期状态失败:', error);
        return false;
      }
    },

    /**
     * 点击时间段
     */
    onTimeSlotTap(e) {
      const { slot } = e.currentTarget.dataset;
      
      // 确保参数不为 undefined
      if (!slot || !this.data.currentDate) {
        console.warn('时间段点击事件参数不完整:', { slot, currentDate: this.data.currentDate });
        return;
      }
      
      // 检查时间段是否已过期
      if (slot.isExpired) {
        wx.showToast({
          title: '该时段已过期',
          icon: 'none'
        });
        return;
      }
      
      // 检查时间段是否可以选择
      const selectableStatuses = ['free', 'free-with-cancelled'];
      if (this.properties.mode === 'select' && !selectableStatuses.includes(slot.status)) {
        wx.showToast({
          title: '该时段已被预约',
          icon: 'none'
        });
        return;
      }
      
      // 触发时间段点击事件
      this.triggerEvent('timeSlotTap', {
        slot: slot,
        date: this.data.currentDate
      });
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
    },

    /**
     * 刷新数据
     */
    refresh() {
      if (this.data.currentDate) {
        this.loadTimeSlots(this.data.currentDate);
      }
    },

    /**
     * 获取当前选中的日期和时间段
     */
    getCurrentSelection() {
      return {
        date: this.data.currentDate,
        timeSlots: this.data.timeSlots
      };
    }
  }
}); 