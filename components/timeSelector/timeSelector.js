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
    // 组件类型：'default'(普通课程) 或 'groupCourses'(团课)
    type: {
      type: String,
      value: 'default'
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
        // 异步加载时间模板和时间段数据
        this.loadTimeTemplate().then(() => {
          this.generateDateList(); // 重新生成日期列表
          this.loadTimeSlots(this.data.currentDate); // 加载时间段
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
          
          this.setData({
            maxAdvanceDays: template.max_advance_days || 30
          });
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
     * 加载团课数据
     */
    async loadGroupCourses(date, coachId) {
      try {
        const params = {
          course_date_start: date,
          course_date_end: date,
          status: [0,1],
          limit: 100
        };
        
        if (coachId) {
          params.coach_id = coachId;
        }
        
        const result = await api.groupCourse.getList(params);
        return result.data ? result.data.list : [];
      } catch (error) {
        console.error('获取团课数据失败:', error);
        return [];
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
      const { date_slots } = this.data.timeTemplate
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
        let isChecked = true;
        const weekDayJson = date_slots.find(item => item.text === weekDay) || {};

        if(weekDayJson.checked != null){
          isChecked = weekDayJson.checked
        } else {
          isChecked = true;
        }
        if(isChecked) {
          dateList.push({
            date: dateStr,
            weekDay: weekDay,
            monthDay: monthDay,
            isToday: i === 0,
            status: 'available' // 默认状态为可约
          });
        }
      }
      this.setData({
        dateList: dateList
      });
      if(dateList && dateList[0] && dateList[0].date){
        this.setData({
          currentDate: dateList[0].date
        });
      }
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
        start_date: date,
        end_date: date,
        limit: 100
      };
      
      // 如果指定了教练ID，添加到查询参数中
      const coachId = this.properties && this.properties.coachId ? this.properties.coachId : null;
      if (coachId) {
        queryParams.coach_id = coachId;
      }
      
      // 无论哪种模式都需要加载个人课程和团课数据，用于冲突检测
      const [courseResult, groupCourseResult] = await Promise.all([
        api.course.getList(queryParams),
        this.loadGroupCourses(date, coachId)
      ]);

      const bookedCourses = courseResult.data ? courseResult.data.list : [];
      const groupCourses = groupCourseResult || [];

        // 生成时间段列表
        const timeSlots = templateSlots.map(slot => {
          // 检查时间段是否已过期
          const isExpired = this.isTimeSlotExpired(date, slot.startTime);
          
          // 获取该时间段的最大预约人数
          const maxAdvanceNums = timeTemplate.max_advance_nums || 1;
          
          // 查找该时间段的所有个人课程（包括已取消的）
          const allCoursesInSlot = bookedCourses.filter(course => {
            const course_start_time = `${course.start_time.split(':')[0]}:${course.start_time.split(':')[1]}`;
            const course_end_time = `${course.end_time.split(':')[0]}:${course.end_time.split(':')[1]}`;
            return course_start_time === slot.startTime && course_end_time === slot.endTime;
          });

          // 查找该时间段的团课
          const groupCoursesInSlot = groupCourses.filter(groupCourse => {
            const course_start_time = `${groupCourse.start_time.split(':')[0]}:${groupCourse.start_time.split(':')[1]}`;
            const course_end_time = `${groupCourse.end_time.split(':')[0]}:${groupCourse.end_time.split(':')[1]}`;
            return course_start_time === slot.startTime && course_end_time === slot.endTime;
          });

          // 计算个人课程名额统计
          const activeCourses = allCoursesInSlot.filter(course => course.booking_status !== 4);
          const bookedCount = activeCourses.length;
          const remainingCount = Math.max(0, maxAdvanceNums - bookedCount);
          
          // 处理个人课程列表数据
          const courses = allCoursesInSlot.map(course => {
            const isCreatedByCurrentUser = course.created_by && course.created_by == this.data.currentUserId;
            return {
              id: course.id,
              studentName: course.student ? course.student.nickname : '未知学员',
              location: course.address.name,
              booking_status: this.getStatusFromApi(course.booking_status),
              isCreatedByCurrentUser: isCreatedByCurrentUser,
              courseData: course,
              type: 'personal' // 标记为个人课程
            };
          });

          // 处理团课列表数据
          const groupCoursesList = groupCoursesInSlot.map(groupCourse => {
            return {
              id: groupCourse.id,
              title: groupCourse.title,
              coachName: groupCourse.coach ? groupCourse.coach.nickname : '未知教练',
              location: groupCourse.address ? groupCourse.address.name : '未设置地址',
              currentParticipants: groupCourse.current_participants || 0,
              maxParticipants: groupCourse.max_participants || 0,
              price: this.getGroupCoursePrice(groupCourse),
              courseData: groupCourse,
              type: 'group' // 标记为团课
            };
          });

          // 合并个人课程和团课
          const allCourses = [...courses, ...groupCoursesList];

          // 判断时间段状态
          let status;
          if (isExpired) {
            status = 'expired';
          } else if (groupCoursesInSlot.length > 0) {
            // 有团课：无论什么模式都不可选
            status = 'groupBooked';
          } else if (remainingCount <= 0) {
            // 个人课程已满员
            status = 'full';
          } else if (bookedCount > 0) {
            // 个人课程有预约但未满
            status = 'booked';
          } else {
            // 空闲
            status = 'free';
          }

          return {
            id: `${date}_${slot.startTime}_${slot.endTime}`,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: status,
            maxAdvanceNums: maxAdvanceNums,
            bookedCount: bookedCount,
            remainingCount: remainingCount,
            courses: allCourses, // 包含个人课程和团课
            groupCourses: groupCoursesList, // 单独的团课列表
            isExpired: isExpired
          };
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
        
        // 检查是否存在可以预约的时段（有剩余名额的时段）
        const availableSlots = timeSlots.filter(slot => 
          slot.status === 'free' || slot.status === 'booked'
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
      if (this.properties.mode === 'select' && slot.isExpired) {
        wx.showToast({
          title: '该时段已过期',
          icon: 'none'
        });
        return;
      }

      // 检查时间段是否可以选择
      if (this.properties.mode === 'select') {
        let canSelect = false;
        let message = '该时段不可选择';
        
        if (slot.status === 'free') {
          canSelect = true;
        } else if (slot.status === 'booked' && this.properties.type === 'default') {
          // 普通模式：有预约但未满可以选择
          canSelect = true;
        } else if (slot.status === 'groupBooked') {
          message = '该时段已有团课';
        } else if (slot.status === 'booked' && this.properties.type === 'groupCourses') {
          message = '该时段已预约';
        } else if (slot.status === 'full') {
          message = '该时段已满员';
        } else if (slot.status === 'expired') {
          message = '该时段已过期';
        }
        
        if (!canSelect) {
          wx.showToast({
            title: message,
            icon: 'none'
          });
          return;
        }
      }

      // 触发时间段点击事件
      this.triggerEvent('timeSlotTap', {
        slot: slot,
        date: this.data.currentDate
      });
    },

    onCourseTap(e){
      const { course } = e.currentTarget.dataset;
      
      // 如果是团课，跳转到团课详情页面
      if (course.type === 'group') {
        wx.navigateTo({
          url: `/pages/groupCourseDetail/groupCourseDetail?id=${course.id}`
        });
        return;
      }
      
      // 个人课程的处理逻辑
      this.triggerEvent('courseTap', {
        course: course,
        date: this.data.currentDate
      });
    },

    /**
     * 获取团课价格显示文本
     */
    getGroupCoursePrice(course) {
      switch (course.price_type) {
        case 1:
          return `${course.lesson_cost}课时`
        case 2:
          return `¥${course.price_amount}`
        case 3:
          return '免费'
        default:
          return '免费'
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