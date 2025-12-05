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
    courseId: {
      type: Number,
      value: null
    },
    // 组件模式：'view'(查看模式) 或 'select'(选择模式)
    mode: {
      type: String,
      value: 'view'
    },
    // 组件类型：'default'(普通课程) 或 'groupCourses'(活动)
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
    timeType: 0, // 时间模板类型：0-全日程统一模板，1-按周历循环模板，2-自由日程模板
    weekSlots: [], // 按周历循环模板数据
    freeTimeRange: null, // 自由日程时间范围
    // 自由时间选择
    selectedStartTime: '',
    selectedEndTime: '',
    // 自由时间选择模式下的课程展示
    bookedCoursesForDisplay: [],
    groupCoursesForDisplay: [],
    // 动态计算的时间限制
    minSelectableStartTime: '', // 可选择的最小开始时间
    minSelectableEndTime: ''    // 可选择的最小结束时间
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
          
          // 确定初始日期：优先使用selectedTimeSlot.course_date，否则使用currentDate
          let initialDate = this.data.currentDate;
          if (this.properties.selectedTimeSlot && this.properties.selectedTimeSlot.course_date) {
            initialDate = this.properties.selectedTimeSlot.course_date;
            // 设置currentDate
            this.setData({
              currentDate: initialDate
            });
          }
          
          if (initialDate) {
            this.loadTimeSlots(initialDate); // 加载时间段
          }
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
          
          // 获取时间模板类型
          const timeType = template.time_type !== undefined ? template.time_type : 0;
          
          // 获取按周历循环模板数据
          const weekSlots = template.week_slots || [];
          
          // 获取自由日程模板数据
          const freeTimeRange = template.free_time_range || null;
          
          this.setData({
            timeTemplate: template,
            maxAdvanceDays: template.max_advance_days || 30,
            timeType: timeType,
            weekSlots: weekSlots,
            freeTimeRange: freeTimeRange
          });
        }
      } catch (error) {
        console.error('获取时间模板失败:', error);
        // 使用默认配置
        const defaultMaxDays = this.properties && this.properties.maxAdvanceDays ? this.properties.maxAdvanceDays : 30;
        this.setData({
          maxAdvanceDays: defaultMaxDays,
          timeType: 0,
          weekSlots: []
        });
      }
    },

    /**
     * 加载活动数据
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
        console.error('获取活动数据失败:', error);
        return [];
      }
    },

    /**
     * 生成日期列表
     */
    generateDateList() {
      const dateList = [];
      const today = new Date();
      const { timeType, timeTemplate, weekSlots } = this.data;
      
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
        const dayOfWeek = date.getDay(); // 0-6，对应周日到周六
        
        // 根据时间模板类型判断日期是否可用
        let isChecked = true;
        
        if (timeType === 0) {
          // 全日程统一模板：使用 date_slots
          const date_slots = (timeTemplate && timeTemplate.date_slots) ? timeTemplate.date_slots : [];
          const weekDayJson = date_slots.find(item => item.text === weekDay) || {};
          if (weekDayJson.checked != null) {
            isChecked = weekDayJson.checked;
          } else {
            isChecked = true;
          }
        } else if (timeType === 1) {
          // 按周历循环模板：使用 weekSlots
          const weekSlot = weekSlots.find(item => item.id === dayOfWeek);
          if (weekSlot) {
            isChecked = weekSlot.checked !== undefined ? weekSlot.checked : true;
          } else {
            isChecked = true;
          }
        } else if (timeType === 2) {
          // 自由日程模板：也使用 date_slots 控制可预约的星期几
          const date_slots = (timeTemplate && timeTemplate.date_slots) ? timeTemplate.date_slots : [];
          const weekDayJson = date_slots.find(item => item.text === weekDay) || {};
          if (weekDayJson.checked != null) {
            isChecked = weekDayJson.checked;
          } else {
            isChecked = true;
          }
        }
        
        if (isChecked) {
          dateList.push({
            date: dateStr,
            weekDay: weekDay,
            monthDay: monthDay,
            dayOfWeek: dayOfWeek, // 添加星期几的数字表示
            isToday: i === 0,
            status: 'available' // 默认状态为可约
          });
        }
      }
      
      this.setData({
        dateList: dateList
      });
      
      if (!this.data.currentDate && dateList && dateList[0] && dateList[0].date) {
        this.setData({
          currentDate: dateList[0].date
        });
      }
    },

  /**
   * 根据日期和时间模板类型获取该日期的时间段模板
   * @param {string} date - 日期字符串 YYYY-MM-DD
   * @returns {Array} 时间段模板数组
   */
  getTemplateSlotsForDate(date) {
    const { timeType, timeTemplate, weekSlots } = this.data;
    
    if (timeType === 0) {
      // 全日程统一模板：使用 time_slots
      if (!timeTemplate || !timeTemplate.time_slots) {
        console.warn('全日程统一模板未配置');
        return [];
      }
      return timeTemplate.time_slots;
    } else if (timeType === 1) {
      // 按周历循环模板：根据星期几获取对应的 time_slots
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 0-6，对应周日到周六
      
      const weekSlot = weekSlots.find(item => item.id === dayOfWeek);
      if (!weekSlot || !weekSlot.time_slots) {
        console.warn(`周${dayOfWeek}的时间模板未配置`);
        return [];
      }
      return weekSlot.time_slots;
    } else if (timeType === 2) {
      // 自由日程模板：返回空数组，使用自由时间选择
      return [];
    }
    
    return [];
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

      const { timeType } = this.data;
      
      // 根据日期和时间模板类型获取该日期的时间段模板
      const templateSlots = this.getTemplateSlotsForDate(date);
      
      // 对于非自由日程模板，如果没有配置时间段，则返回空状态
      if (timeType !== 2 && (!templateSlots || templateSlots.length === 0)) {
        console.warn('该日期的时间模板未配置，显示空状态');
        this.setData({
          isLoading: false,
          timeSlots: []
        });
        return;
      }
      
      // 获取时间模板配置
      const timeTemplate = this.data.timeTemplate;
      
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
      
      // 无论哪种模式都需要加载个人课程和活动数据，用于冲突检测
      const [courseResult, groupCourseResult] = await Promise.all([
        api.course.getList(queryParams),
        this.loadGroupCourses(date, coachId)
      ]);

      const bookedCourses = courseResult.data ? courseResult.data.list : [];
      const groupCourses = groupCourseResult || [];

      // 对于自由日程模板（time_type = 2），根据模式处理
      let finalTemplateSlots = templateSlots;
      
      // 选择模式：保存课程数据用于展示，但不生成时间段
      if (timeType === 2 && this.properties.mode === 'select') {
        // 提取所有已预约的时间段（排除已取消的课程）
        const bookedTimeSlots = [];
        
        // 添加个人课程的时间段
        bookedCourses.filter(course => course.booking_status !== 4).forEach(course => {
          const startTime = `${course.start_time.split(':')[0]}:${course.start_time.split(':')[1]}`;
          const endTime = `${course.end_time.split(':')[0]}:${course.end_time.split(':')[1]}`;
          const timeKey = `${startTime}-${endTime}`;
          
          // 检查是否已存在相同时间段
          const existingSlot = bookedTimeSlots.find(slot => slot.timeKey === timeKey);
          if (existingSlot) {
            existingSlot.count += 1;
          } else {
            bookedTimeSlots.push({
              timeKey: timeKey,
              startTime: startTime,
              endTime: endTime,
              count: 1,
              type: 'personal'
            });
          }
        });
        
        // 添加活动的时间段
        groupCourses.forEach(groupCourse => {
          const startTime = `${groupCourse.start_time.split(':')[0]}:${groupCourse.start_time.split(':')[1]}`;
          const endTime = `${groupCourse.end_time.split(':')[0]}:${groupCourse.end_time.split(':')[1]}`;
          const timeKey = `${startTime}-${endTime}`;
          
          // 检查是否已存在相同时间段
          const existingSlot = bookedTimeSlots.find(slot => slot.timeKey === timeKey);
          if (existingSlot) {
            existingSlot.count += 1;
            existingSlot.hasGroup = true;
          } else {
            bookedTimeSlots.push({
              timeKey: timeKey,
              startTime: startTime,
              endTime: endTime,
              count: 1,
              type: 'group',
              hasGroup: true
            });
          }
        });
        
        // 按时间排序
        bookedTimeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        // 保存到 data 中用于显示
        this.setData({
          isLoading: false,
          bookedCoursesForDisplay: bookedTimeSlots,
          groupCoursesForDisplay: [] // 不再单独显示
        });
        
        // 更新时间限制
        this.updateTimeConstraints(date);
        return;
      }
      
      // 查看模式：根据实际课程动态生成时间段列表
      if (timeType === 2 && this.properties.mode === 'view') {
        // 从课程数据中提取唯一的时间段
        const uniqueTimeSlots = new Map();
        
        // 添加个人课程的时间段
        bookedCourses.forEach(course => {
          const startTime = `${course.start_time.split(':')[0]}:${course.start_time.split(':')[1]}`;
          const endTime = `${course.end_time.split(':')[0]}:${course.end_time.split(':')[1]}`;
          const key = `${startTime}-${endTime}`;
          if (!uniqueTimeSlots.has(key)) {
            uniqueTimeSlots.set(key, { startTime, endTime });
          }
        });
        
        // 添加活动的时间段
        groupCourses.forEach(groupCourse => {
          const startTime = `${groupCourse.start_time.split(':')[0]}:${groupCourse.start_time.split(':')[1]}`;
          const endTime = `${groupCourse.end_time.split(':')[0]}:${groupCourse.end_time.split(':')[1]}`;
          const key = `${startTime}-${endTime}`;
          if (!uniqueTimeSlots.has(key)) {
            uniqueTimeSlots.set(key, { startTime, endTime });
          }
        });
        
        // 转换为数组并排序
        finalTemplateSlots = Array.from(uniqueTimeSlots.values()).sort((a, b) => 
          a.startTime.localeCompare(b.startTime)
        );
        
        // 如果没有任何课程，显示空状态
        if (finalTemplateSlots.length === 0) {
          this.setData({
            isLoading: false,
            timeSlots: []
          });
          return;
        }
      }

        // 生成时间段列表
        const timeSlots = finalTemplateSlots.map(slot => {
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

          // 查找该时间段的活动
          const groupCoursesInSlot = groupCourses.filter(groupCourse => {
            const course_start_time = `${groupCourse.start_time.split(':')[0]}:${groupCourse.start_time.split(':')[1]}`;
            const course_end_time = `${groupCourse.end_time.split(':')[0]}:${groupCourse.end_time.split(':')[1]}`;
            if(this.properties.type === 'groupCourses' && this.properties.courseId != null) {
              return groupCourse.id !== this.properties.courseId && course_start_time === slot.startTime && course_end_time === slot.endTime;
            }
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
              studentName: course.relation.student_name || course.student.nickname,
              location: course.address.name,
              booking_status: this.getStatusFromApi(course.booking_status),
              isCreatedByCurrentUser: isCreatedByCurrentUser,
              courseData: course,
              type: 'personal' // 标记为个人课程
            };
          });

          // 处理活动列表数据
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
              type: 'group' // 标记为活动
            };
          });

          // 合并个人课程和活动
          const allCourses = [...courses, ...groupCoursesList];

          // 判断时间段状态
          let status;
          if (isExpired) {
            status = 'expired';
          } else if (groupCoursesInSlot.length > 0) {
            // 有活动：无论什么模式都不可选
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
            courses: allCourses, // 包含个人课程和活动
            groupCourses: groupCoursesList, // 单独的活动列表
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
        currentDate: date,
        selectedStartTime: '', // 切换日期时清空已选时间
        selectedEndTime: ''
      });
      
      // 加载选中日期的时间段数据
      this.loadTimeSlots(date);
      
      // 更新时间限制
      this.updateTimeConstraints(date);
      
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
          message = '该时段已有活动';
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
      
      // 如果是活动，跳转到活动详情页面
      if (course.type === 'group') {
        wx.navigateTo({
          url: `/pages/groupCourseDetail/groupCourseDetail?courseId=${course.id}`
        });
        return;
      }
      if (course && course.id != null) {
        wx.navigateTo({
          url: `/pages/courseDetail/courseDetail?id=${course.id}`
        });
      }
    },

    /**
     * 获取活动价格显示文本
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
    },

    /**
     * 自由时间选择 - 选择开始时间
     */
    onSelectStartTime(e) {
      const time = e.detail.value;
      const { freeTimeRange, selectedEndTime, minSelectableStartTime, currentDate } = this.data;

      // 验证时间是否在范围内
      if (freeTimeRange && time < freeTimeRange.startTime) {
        wx.showToast({
          title: `开始时间不能早于${freeTimeRange.startTime}`,
          icon: 'none'
        });
        return;
      }

      if (freeTimeRange && time > freeTimeRange.endTime) {
        wx.showToast({
          title: `开始时间不能晚于${freeTimeRange.endTime}`,
          icon: 'none'
        });
        return;
      }

      // 如果是今天，验证开始时间必须大于当前时间
      if (this.isToday(currentDate) && time < minSelectableStartTime) {
        wx.showToast({
          title: '开始时间必须晚于当前时间',
          icon: 'none'
        });
        return;
      }

      // 如果已选择结束时间，验证开始时间必须小于结束时间
      if (selectedEndTime && time >= selectedEndTime) {
        wx.showToast({
          title: '开始时间必须早于结束时间',
          icon: 'none'
        });
        return;
      }

      this.setData({ 
        selectedStartTime: time,
        // 更新结束时间的最小值
        minSelectableEndTime: this.getNextMinuteTime(time)
      });
      
      // 如果结束时间也已选择，自动触发选择事件
      if (this.data.selectedEndTime) {
        this.triggerTimeSelection();
      }
    },

    /**
     * 自由时间选择 - 选择结束时间
     */
    onSelectEndTime(e) {
      const time = e.detail.value;
      const { freeTimeRange, selectedStartTime, minSelectableEndTime } = this.data;

      // 验证时间是否在范围内
      if (freeTimeRange && time < freeTimeRange.startTime) {
        wx.showToast({
          title: `结束时间不能早于${freeTimeRange.startTime}`,
          icon: 'none'
        });
        return;
      }

      if (freeTimeRange && time > freeTimeRange.endTime) {
        wx.showToast({
          title: `结束时间不能晚于${freeTimeRange.endTime}`,
          icon: 'none'
        });
        return;
      }

      // 如果已选择开始时间，验证结束时间必须大于开始时间
      if (selectedStartTime && time <= selectedStartTime) {
        wx.showToast({
          title: '结束时间必须晚于开始时间',
          icon: 'none'
        });
        return;
      }

      // 验证结束时间必须大于最小可选时间
      if (minSelectableEndTime && time < minSelectableEndTime) {
        wx.showToast({
          title: '结束时间必须晚于开始时间',
          icon: 'none'
        });
        return;
      }

      this.setData({ selectedEndTime: time });
      
      // 如果开始时间也已选择，自动触发选择事件
      if (this.data.selectedStartTime) {
        this.triggerTimeSelection();
      }
    },

    /**
     * 触发时间段选择事件（内部方法）
     */
    triggerTimeSelection() {
      const { currentDate, selectedStartTime, selectedEndTime } = this.data;

      if (!selectedStartTime || !selectedEndTime) {
        return; // 数据不完整，不触发事件
      }

      // 触发时间段选择事件
      this.triggerEvent('timeSlotTap', {
        slot: {
          id: `free_${currentDate}_${selectedStartTime}_${selectedEndTime}`,
          startTime: selectedStartTime,
          endTime: selectedEndTime,
          status: 'free',
          isFreeTime: true // 标记为自由时间段
        },
        date: currentDate
      });
    },

    /**
     * 更新时间限制（针对今天的情况）
     */
    updateTimeConstraints(date) {
      const { freeTimeRange } = this.data;
      
      if (!freeTimeRange) {
        return;
      }

      // 判断是否是今天
      if (this.isToday(date)) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // 当前时间，向上取整到下一分钟
        const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute + 1).padStart(2, '0')}`;
        
        // 取当前时间和配置开始时间的较大值
        const minStartTime = currentTime > freeTimeRange.startTime ? currentTime : freeTimeRange.startTime;
        
        this.setData({
          minSelectableStartTime: minStartTime,
          minSelectableEndTime: this.getNextMinuteTime(minStartTime)
        });
      } else {
        // 不是今天，使用配置的时间范围
        this.setData({
          minSelectableStartTime: freeTimeRange.startTime,
          minSelectableEndTime: freeTimeRange.startTime
        });
      }
    },

    /**
     * 判断是否是今天
     */
    isToday(dateString) {
      const today = new Date();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return dateString === todayString;
    },

    /**
     * 获取指定时间的下一分钟
     */
    getNextMinuteTime(timeString) {
      if (!timeString) return '';
      
      const [hour, minute] = timeString.split(':').map(Number);
      let nextMinute = minute + 1;
      let nextHour = hour;
      
      if (nextMinute >= 60) {
        nextMinute = 0;
        nextHour += 1;
      }
      
      if (nextHour >= 24) {
        nextHour = 23;
        nextMinute = 59;
      }
      
      return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
    }
  }
}); 