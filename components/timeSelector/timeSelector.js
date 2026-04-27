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
    },
    // 当前选中的日期（可从父组件传入）
    currentDate: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
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
    minSelectableEndTime: '',   // 可选择的最小结束时间
    minAdvanceHours: 0,         // 最短提前预约时间（小时），0 表示不限制
    blockedSlots: [],           // 当前日期的休息时段列表
    lessonDuration: 0,          // 课程时长（分钟），0 = 未配置
    slotInterval: 0,            // 时间步长（分钟），0 = 未配置
    structuredFreeSlots: [],  // 结构化自由模板生成的时间点列表
    selectedGridStart: '',    // 当前选中课程的开始时间（HH:MM）
    selectedGridEnd: '',      // 当前选中课程的结束时间（HH:MM）
    showGridSlotDetail: false, // 是否显示网格时间段详情面板（view 模式）
    currentGridSlot: null      // 当前查看的时间段数据
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
    },
    'currentDate': function(newCurrentDate) {
      // 当父组件传入的 currentDate 变化时，更新内部状态并加载时间段
      if (newCurrentDate && newCurrentDate !== this.data.currentDate) {
        this.setData({
          currentDate: newCurrentDate
        });
        // 如果组件已初始化，加载时间段
        if (this.data.dateList && this.data.dateList.length > 0) {
          this.loadTimeSlots(newCurrentDate);
        }
      }
    },
    'selectedTimeSlot': function(newSelectedTimeSlot) {
      // 当 selectedTimeSlot 变化时，如果是自由日程模板且是选择模式，回显时间
      const { timeType, lessonDuration, slotInterval } = this.data;
      const isStructuredFree = timeType === 2 && lessonDuration > 0 && slotInterval > 0;
      if (timeType === 2 && this.properties.mode === 'select') {
        if (newSelectedTimeSlot && Object.keys(newSelectedTimeSlot).length > 0) {
          // 提取时间字段（兼容多种格式）
          const { startTime, endTime } = this.extractTimeFromSlot(newSelectedTimeSlot);
          
          if (startTime && endTime) {
            // 网格模式：同步网格高亮；普通自由模式：同步 picker
            const updateObj = isStructuredFree
              ? { selectedGridStart: startTime, selectedGridEnd: endTime }
              : { selectedStartTime: startTime, selectedEndTime: endTime };
            this.setData(updateObj);
            
            // 如果日期不同，切换日期并更新时间限制
            const slotDate = newSelectedTimeSlot.course_date || newSelectedTimeSlot.date;
            if (slotDate && slotDate !== this.data.currentDate) {
              this.setData({ currentDate: slotDate });
              this.loadTimeSlots(slotDate);
            } else if (slotDate && !isStructuredFree) {
              // 日期相同 + 普通自由模式：仅更新时间限制
              this.updateTimeConstraints(slotDate);
            }
          }
        } else {
          // 清空已选时间（同时清两套字段，避免切换模式残留）
          this.setData({
            selectedStartTime: '',
            selectedEndTime: '',
            selectedGridStart: '',
            selectedGridEnd: ''
          });
        }
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 格式化时间为 HH:mm 格式（去掉秒）
     * @param {string} timeString - 时间字符串（可能包含秒，如 HH:mm:ss）
     * @returns {string} HH:mm 格式的时间字符串
     */
    formatTime(timeString) {
      if (!timeString || !timeString.includes(':')) {
        return timeString || '';
      }
      const parts = timeString.split(':');
      return `${parts[0]}:${parts[1]}`;
    },

    /**
     * 从 selectedTimeSlot 中提取时间字段（兼容多种格式）
     * @param {Object} selectedTimeSlot - 选中的时间段对象
     * @returns {Object} { startTime, endTime } 格式化后的时间
     */
    extractTimeFromSlot(selectedTimeSlot) {
      if (!selectedTimeSlot) {
        return { startTime: '', endTime: '' };
      }

      let startTime = selectedTimeSlot.startTime || selectedTimeSlot.start_time || '';
      let endTime = selectedTimeSlot.endTime || selectedTimeSlot.end_time || '';

      if (!startTime || !endTime) {
        return { startTime: '', endTime: '' };
      }

      // 格式化时间（确保格式为 HH:mm）
      return {
        startTime: this.formatTime(startTime),
        endTime: this.formatTime(endTime)
      };
    },

    /**
     * 检查自由时间段的状态（是否与已预约时间段冲突）
     * @param {string} startTime - 开始时间 HH:mm
     * @param {string} endTime - 结束时间 HH:mm
     * @param {string} date - 日期 YYYY-MM-DD
     * @param {Array} bookedCourses - 个人课程列表（可选，如果不传则从data中读取）
     * @param {Array} groupCourses - 活动列表（可选，如果不传则从data中读取）
     * @returns {Object} { status, canSelect, message }
     */
    async checkFreeTimeSlotStatus(startTime, endTime, date, bookedCourses = null, groupCourses = null) {
      // 检查时间段是否已过期
      const isExpired = this.isTimeSlotExpired(date, startTime);
      if (isExpired) {
        return { status: 'expired', canSelect: false, message: '该时段已过期' };
      }

      // 如果没有传入课程数据，则重新获取
      if (!bookedCourses || !groupCourses) {
        const coachId = this.properties && this.properties.coachId ? this.properties.coachId : null;
        const queryParams = {
          start_date: date,
          end_date: date,
          limit: 100
        };
        
        if (coachId) {
          queryParams.coach_id = coachId;
        }
        
        try {
          const [courseResult, groupCourseResult] = await Promise.all([
            api.course.getList(queryParams),
            this.loadGroupCourses(date, coachId)
          ]);
          
          bookedCourses = courseResult.data ? courseResult.data.list : [];
          groupCourses = groupCourseResult || [];
        } catch (error) {
          console.error('获取课程数据失败:', error);
          return { status: 'free', canSelect: true, message: '' };
        }
      }

      // 获取当前选中的时间段（用于排除）
      const { selectedTimeSlot } = this.properties;
      const { startTime: selectedStartTime, endTime: selectedEndTime } = this.extractTimeFromSlot(selectedTimeSlot);

      // 检查是否与个人课程冲突（排除已取消 4 和 超时取消 5）
      const activePersonalCourses = bookedCourses.filter(course => course.booking_status !== 4 && course.booking_status !== 5);
      for (const course of activePersonalCourses) {
        const courseStart = this.formatTime(course.start_time);
        const courseEnd = this.formatTime(course.end_time);

        // 排除当前选中的时间段（编辑模式）
        if (selectedStartTime === courseStart && selectedEndTime === courseEnd) {
          continue;
        }

        // 判断时间段是否重叠
        const hasOverlap = (startTime < courseEnd && endTime > courseStart);
        
        if (hasOverlap) {
          // 其他已预约的时间段，根据 type 判断
          if (this.properties.type === 'groupCourses') {
            // 活动模式：任何已预约的时间段都不可选
            return { status: 'booked', canSelect: false, message: '该时段已预约' };
          } else {
            // 普通模式：已预约但未满员的时间段可以选
            // 这里简化处理，假设未满员
            return { status: 'booked', canSelect: true, message: '' };
          }
        }
      }

      // 检查是否与活动冲突
      for (const groupCourse of groupCourses) {
        // 排除当前编辑的活动
        if (this.properties.courseId != null && groupCourse.id === this.properties.courseId) {
          continue;
        }

        const courseStart = this.formatTime(groupCourse.start_time);
        const courseEnd = this.formatTime(groupCourse.end_time);

        // 判断时间段是否重叠
        const hasOverlap = (startTime < courseEnd && endTime > courseStart);
        
        if (hasOverlap) {
          // 有活动的时间段不可选
          return { status: 'groupBooked', canSelect: false, message: '该时段已有活动' };
        }
      }

      // 没有冲突，可以选择
      return { status: 'free', canSelect: true, message: '' };
    },

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
          const { selectedTimeSlot } = this.properties;
          
          if (selectedTimeSlot && selectedTimeSlot.course_date) {
            initialDate = selectedTimeSlot.course_date;
            // 设置currentDate
            this.setData({
              currentDate: initialDate
            });
          }
          
          if (initialDate) {
            this.loadTimeSlots(initialDate); // 加载时间段（内部会处理时间回显）
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
            minAdvanceHours: template.min_advance_hours || 0,
            timeType: timeType,
            weekSlots: weekSlots,
            freeTimeRange: freeTimeRange,
            lessonDuration: template.lesson_duration || 0,
            slotInterval: template.slot_interval || 0
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
      // 固定时间段模板 以及 结构化自由日程（有 lessonDuration+slotInterval）均需拉取休息时段
      const { lessonDuration, slotInterval } = this.data;
      const isStructuredFree = timeType === 2 && lessonDuration > 0 && slotInterval > 0;
      const blockedSlotsParams = { date };
      if (coachId) blockedSlotsParams.coach_id = coachId;
      const blockedSlotsPromise = (timeType !== 2 || isStructuredFree)
        ? api.blockedSlot.getList(blockedSlotsParams)
        : Promise.resolve({ data: [] });

      const [courseResult, groupCourseResult, blockedSlotResult] = await Promise.all([
        api.course.getList(queryParams),
        this.loadGroupCourses(date, coachId),
        blockedSlotsPromise
      ]);

      const bookedCourses = courseResult.data ? courseResult.data.list : [];
      const groupCourses = groupCourseResult || [];
      const blockedSlots = (blockedSlotResult && blockedSlotResult.data) ? blockedSlotResult.data : [];
      this.setData({ blockedSlots });

      // 结构化自由日程：直接生成网格时间点，两种模式共用
      if (isStructuredFree) {
        const { freeTimeRange } = this.data;
        // 清空普通自由模式残留状态，避免 UI 闪现
        const cleanupObj = {
          bookedCoursesForDisplay: [],
          groupCoursesForDisplay: [],
          timeSlots: [],
          selectedStartTime: '',
          selectedEndTime: ''
        };
        if (!freeTimeRange) {
          this.setData({ ...cleanupObj, isLoading: false, structuredFreeSlots: [] });
          this.updateDateStatus(date, 'available');
          return;
        }
        const structuredFreeSlots = this.generateStructuredFreeSlots(
          date, freeTimeRange, lessonDuration, slotInterval,
          bookedCourses, groupCourses, blockedSlots
        );
        this.setData({ ...cleanupObj, isLoading: false, structuredFreeSlots });
        // 复用 getDateStatus 逻辑保持一致
        const dateStatus = this.getDateStatus(date, structuredFreeSlots);
        this.updateDateStatus(date, dateStatus);
        this.triggerEvent('timeSlotsLoaded', { date, timeSlots: structuredFreeSlots });
        return;
      }

      // 对于自由日程模板（time_type = 2），根据模式处理
      let finalTemplateSlots = templateSlots;
      
      // 选择模式：保存课程数据用于展示，但不生成时间段
      if (timeType === 2 && this.properties.mode === 'select') {
        // 提取所有已预约的时间段（排除已取消的课程）
        const bookedTimeSlots = [];
        
        // 获取当前选中的时间段（用于排除）
        const { selectedTimeSlot } = this.properties;
        const { startTime: selectedStartTime, endTime: selectedEndTime } = this.extractTimeFromSlot(selectedTimeSlot);
        
        // 统一处理个人课程和活动的时间段（合并计数）
        // 添加个人课程的时间段（排除已取消 4 和 超时取消 5）
        bookedCourses.filter(course => course.booking_status !== 4 && course.booking_status !== 5).forEach(course => {
          const startTime = this.formatTime(course.start_time);
          const endTime = this.formatTime(course.end_time);
          const timeKey = `${startTime}-${endTime}`;
          
          // 排除当前选中的时间段（编辑模式回显时，不显示自己）
          if (selectedStartTime && selectedEndTime && 
              selectedStartTime === startTime && selectedEndTime === endTime) {
            return; // 跳过当前选中的时间段
          }
          
          // 检查是否已存在相同时间段
          const existingSlot = bookedTimeSlots.find(slot => slot.timeKey === timeKey);
          if (existingSlot) {
            existingSlot.count += 1;
          } else {
            bookedTimeSlots.push({
              timeKey: timeKey,
              startTime: startTime,
              endTime: endTime,
              count: 1
            });
          }
        });
        
        // 添加活动的时间段（与个人课程统一处理，合并计数）
        groupCourses.forEach(groupCourse => {
          // 排除当前编辑的活动（编辑模式回显时，不显示自己）
          if (this.properties.courseId != null && groupCourse.id === this.properties.courseId) {
            return; // 跳过当前编辑的活动
          }
          
          const startTime = this.formatTime(groupCourse.start_time);
          const endTime = this.formatTime(groupCourse.end_time);
          const timeKey = `${startTime}-${endTime}`;
          
          // 检查是否已存在相同时间段（与个人课程合并）
          const existingSlot = bookedTimeSlots.find(slot => slot.timeKey === timeKey);
          if (existingSlot) {
            existingSlot.count += 1;
            existingSlot.hasGroup = true; // 标记包含活动
          } else {
            bookedTimeSlots.push({
              timeKey: timeKey,
              startTime: startTime,
              endTime: endTime,
              count: 1,
              hasGroup: true // 标记包含活动
            });
          }
        });
        
        // 按时间排序
        bookedTimeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        // 保存到 data 中用于显示
        this.setData({
          isLoading: false,
          bookedCoursesForDisplay: bookedTimeSlots,
          selectedStartTime: selectedStartTime,
          selectedEndTime: selectedEndTime
        });
        
        // 更新时间限制
        this.updateTimeConstraints(date);
        return;
      }
      
      // 查看模式:根据实际课程动态生成时间段列表
      if (timeType === 2 && this.properties.mode === 'view') {
        // 从课程数据中提取唯一的时间段
        const uniqueTimeSlots = new Map();
        
        // 添加个人课程的时间段
        bookedCourses.forEach(course => {
          const startTime = this.formatTime(course.start_time);
          const endTime = this.formatTime(course.end_time);
          const key = `${startTime}-${endTime}`;
          if (!uniqueTimeSlots.has(key)) {
            uniqueTimeSlots.set(key, { startTime, endTime });
          }
        });
        
        // 添加活动的时间段
        groupCourses.forEach(groupCourse => {
          const startTime = this.formatTime(groupCourse.start_time);
          const endTime = this.formatTime(groupCourse.end_time);
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
          // 检查时间段是否在最短提前预约窗口内（过期的不再重复判断；团课由教练自主设置，不受此限制）
          const isTooSoon = !isExpired && this.properties.type !== 'groupCourses' && this.isTimeSlotTooSoon(date, slot.startTime);
          // 检查时间段是否被教练设置为休息
          const blockedSlotItem = blockedSlots.find(b =>
            this.formatTime(b.start_time) === slot.startTime &&
            this.formatTime(b.end_time) === slot.endTime
          );
          const isBlocked = !!blockedSlotItem;
          
          // 获取该时间段的最大预约人数
          const maxAdvanceNums = timeTemplate.max_advance_nums || 1;

          // 查找该时间段的所有个人课程（包括已取消的）
          const allCoursesInSlot = bookedCourses.filter(course => {
            const course_start_time = this.formatTime(course.start_time);
            const course_end_time = this.formatTime(course.end_time);
            return course_start_time === slot.startTime && course_end_time === slot.endTime;
          });

          // 查找该时间段的活动
          const groupCoursesInSlot = groupCourses.filter(groupCourse => {
            const course_start_time = this.formatTime(groupCourse.start_time);
            const course_end_time = this.formatTime(groupCourse.end_time);
            if(this.properties.type === 'groupCourses' && this.properties.courseId != null) {
              return groupCourse.id !== this.properties.courseId && course_start_time === slot.startTime && course_end_time === slot.endTime;
            }
            return course_start_time === slot.startTime && course_end_time === slot.endTime;
          });

          // 计算个人课程名额统计（排除已取消 4 和 超时取消 5）
          const activeCourses = allCoursesInSlot.filter(course => course.booking_status !== 4 && course.booking_status !== 5);
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

          // 状态优先级
          // view 模式：groupBooked > full > booked > expired > tooSoon > resting > free
          // select 模式：expired > tooSoon > resting > groupBooked > full > booked > free
          const isViewMode = this.properties.mode === 'view';
          let status;
          if (isViewMode) {
            if (groupCoursesInSlot.length > 0) {
              status = 'groupBooked';
            } else if (remainingCount <= 0 && bookedCount > 0) {
              status = 'full';
            } else if (bookedCount > 0) {
              status = 'booked';
            } else if (isExpired) {
              status = 'expired';
            } else if (isTooSoon) {
              status = 'tooSoon';
            } else if (isBlocked) {
              status = 'resting';
            } else {
              status = 'free';
            }
          } else {
            if (isExpired) {
              status = 'expired';
            } else if (isTooSoon) {
              status = 'tooSoon';
            } else if (isBlocked) {
              status = 'resting';
            } else if (groupCoursesInSlot.length > 0) {
              status = 'groupBooked';
            } else if (remainingCount <= 0) {
              status = 'full';
            } else if (bookedCount > 0) {
              status = 'booked';
            } else {
              status = 'free';
            }
          }

          // 是否存在待确认/已确认的课程（有则不显示休息按钮）
          const hasActiveBookings = activeCourses.some(
            course => course.booking_status === 1 || course.booking_status === 2
          );

          return {
            id: `${date}_${slot.startTime}_${slot.endTime}`,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: status,
            maxAdvanceNums: maxAdvanceNums,
            bookedCount: bookedCount,
            remainingCount: remainingCount,
            courses: allCourses,
            groupCourses: groupCoursesList,
            isExpired: isExpired,
            isTooSoon: isTooSoon,
            isBlocked: isBlocked,
            blockedSlotId: isBlocked ? blockedSlotItem.id : null,
            hasActiveBookings: hasActiveBookings
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
    async onSelectDate(e) {
      const { date } = e.currentTarget.dataset;
      
      if (date === this.data.currentDate) return;
      
      const { timeType, lessonDuration, slotInterval, selectedStartTime, selectedEndTime, selectedGridStart, selectedGridEnd } = this.data;
      const { mode } = this.properties;
      const isStructuredFree = timeType === 2 && lessonDuration > 0 && slotInterval > 0;
      
      // 结构化网格模式 + 已有选中高亮：切换日期时保留选中时间，触发事件
      if (isStructuredFree && mode === 'select' && selectedGridStart && selectedGridEnd) {
        this.setData({ currentDate: date });
        await this.loadTimeSlots(date);
        const statusCheck = await this.checkFreeTimeSlotStatus(selectedGridStart, selectedGridEnd, date);
        this.triggerEvent('timeSlotTap', {
          slot: {
            id: `${date}_${selectedGridStart}_${selectedGridEnd}`,
            startTime: selectedGridStart,
            endTime: selectedGridEnd,
            status: statusCheck.status
          },
          date: date
        });
        this.triggerEvent('dateSelected', { date: date });
        return;
      }

      // 普通自由日程模板（未配置网格）：保留已选时间触发事件
      if (timeType === 2 && mode === 'select' && selectedStartTime && selectedEndTime) {
        this.setData({ currentDate: date });
        this.updateTimeConstraints(date);
        await this.loadTimeSlots(date);
        const statusCheck = await this.checkFreeTimeSlotStatus(selectedStartTime, selectedEndTime, date);
        this.triggerEvent('timeSlotTap', {
          slot: {
            id: `${date}_${selectedStartTime}_${selectedEndTime}`,
            startTime: selectedStartTime,
            endTime: selectedEndTime,
            status: statusCheck.status
          },
          date: date
        });
        this.triggerEvent('dateSelected', { date: date });
        return;
      }

      // 其他情况：清空已选时间（含网格高亮）
      this.setData({
        currentDate: date,
        selectedStartTime: '',
        selectedEndTime: '',
        selectedGridStart: '',
        selectedGridEnd: ''
      });
      this.loadTimeSlots(date);
      this.updateTimeConstraints(date);
      this.triggerEvent('dateSelected', { date: date });
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
     * 判断时间段是否在最短提前预约时间窗口内（太早预约）
     * @param {string} date 日期 YYYY-MM-DD
     * @param {string} startTime 开始时间 HH:MM
     * @returns {boolean} 是否在限制窗口内
     */
    isTimeSlotTooSoon(date, startTime) {
      const { minAdvanceHours } = this.data;
      if (!minAdvanceHours || minAdvanceHours <= 0) return false;

      try {
        const now = new Date();
        const [y, m, d] = date.split('-').map(Number);
        const [h, min] = startTime.split(':').map(Number);
        const slotDateTime = new Date(y, m - 1, d, h, min, 0, 0);

        const diffMs = slotDateTime - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        // 时间段在未来，但距现在不足 minAdvanceHours 小时
        return diffHours >= 0 && diffHours < minAdvanceHours;
      } catch (e) {
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
        } else if (slot.status === 'tooSoon') {
          message = `需提前 ${this.data.minAdvanceHours} 小时预约`;
        } else if (slot.status === 'resting') {
          message = '教练已设置该时段休息，暂不可约';
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

    /**
     * 将 HH:MM 转为分钟数
     * @param {string} timeStr - 格式 HH:MM
     * @returns {number}
     */
    timeToMinutes(timeStr) {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    },

    /**
     * 将分钟数转为 HH:MM 字符串
     * @param {number} minutes
     * @returns {string}
     */
    minutesToTime(minutes) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },

    /**
     * 根据自由日程配置（lessonDuration + slotInterval）生成结构化时间点列表
     * @param {string} date - YYYY-MM-DD
     * @param {Object} freeTimeRange - { startTime, endTime }
     * @param {number} lessonDuration - 课程时长（分钟）
     * @param {number} slotInterval - 时间步长（分钟）
     * @param {Array} bookedCourses - 已预约课程列表
     * @param {Array} groupCourses - 活动列表
     * @param {Array} blockedSlots - 休息时段列表
     * @returns {Array}
     */
    generateStructuredFreeSlots(date, freeTimeRange, lessonDuration, slotInterval, bookedCourses, groupCourses, blockedSlots) {
      const startMin = this.timeToMinutes(freeTimeRange.startTime);
      const endMin = this.timeToMinutes(freeTimeRange.endTime);
      const maxAdvanceNums = this.data.timeTemplate ? (this.data.timeTemplate.max_advance_nums || 1) : 1;
      const slots = [];
      let current = startMin;

      while (current + lessonDuration <= endMin) {
        const startTime = this.minutesToTime(current);
        // 预约时段（课程时长）：用于实际课程提交、冲突检测
        const endTime = this.minutesToTime(current + lessonDuration);
        // 单格时段（时间步长）：用于休息标记和显示，每个格子在视觉上只占一格宽度
        const cellEndTime = this.minutesToTime(current + slotInterval);

        const isExpired = this.isTimeSlotExpired(date, startTime);
        const isTooSoon = !isExpired && this.properties.type !== 'groupCourses' && this.isTimeSlotTooSoon(date, startTime);

        // 重叠检测：任何休息时段与该格子的视觉范围 [startTime, cellEndTime] 有重叠
        // 用于所有模式的"休息"状态判断，以及"取消休息"时批量删除
        const overlappingBlockedItems = blockedSlots.filter(b => {
          const bStart = this.formatTime(b.start_time);
          const bEnd = this.formatTime(b.end_time);
          return bStart < cellEndTime && bEnd > startTime;
        });
        const isEffectivelyBlocked = overlappingBlockedItems.length > 0;
        // 保留精确匹配（用于"设为休息"创建记录后的反查，以及老数据兼容）
        const blockedSlotItem = overlappingBlockedItems.find(b =>
          this.formatTime(b.start_time) === startTime &&
          this.formatTime(b.end_time) === cellEndTime
        );
        const isBlocked = isEffectivelyBlocked; // 对外统一用重叠判断

        // 预约冲突（select 模式专用）：预约时段 [startTime, endTime] 与任何休息时段重叠
        // 仅在格子本身未被视为休息时触发，用于 lessonDuration > slotInterval 场景
        const hasRestConflict = !isEffectivelyBlocked && blockedSlots.some(b => {
          const bStart = this.formatTime(b.start_time);
          const bEnd = this.formatTime(b.end_time);
          return bStart < endTime && bEnd > startTime;
        });

        // 个人课程统计（用于显示）：仅当格子开始时间被某节课覆盖时计入
        // 即 cStart <= slotStart < cEnd，表示"此刻有课在进行"（排除已取消 4 和 超时取消 5）
        const coursesInSlot = bookedCourses.filter(c => {
          const cStart = this.formatTime(c.start_time);
          const cEnd = this.formatTime(c.end_time);
          return c.booking_status !== 4 && c.booking_status !== 5 && cStart <= startTime && startTime < cEnd;
        });
        const hasActiveBookings = coursesInSlot.some(c => c.booking_status === 1 || c.booking_status === 2);
        const bookedCount = coursesInSlot.length;
        const remainingCount = Math.max(0, maxAdvanceNums - bookedCount);

        // 活动冲突检测
        // view 模式：格子视觉范围 [startTime, cellEndTime] 与活动有重叠即显示"活动"状态
        // select 模式：预约范围 [startTime, endTime] 与活动有重叠即禁止预约
        const groupCoursesInSlot = groupCourses.filter(gc => {
          const gcStart = this.formatTime(gc.start_time);
          const gcEnd = this.formatTime(gc.end_time);
          return gcStart < cellEndTime && gcEnd > startTime;
        });
        const hasGroupConflictView = groupCoursesInSlot.length > 0;
        const hasGroupConflictSelect = groupCourses.some(gc => {
          const gcStart = this.formatTime(gc.start_time);
          const gcEnd = this.formatTime(gc.end_time);
          return gcStart < endTime && gcEnd > startTime;
        });

        // select 模式专用：检测预约时间段冲突（与任何已有个人课程时间重叠）
        // 用于阻止用户从"看似空闲但实际会冲突"的时间点开始预约（排除已取消 4 和 超时取消 5）
        const hasBookingConflict = bookedCourses.some(c => {
          const cStart = this.formatTime(c.start_time);
          const cEnd = this.formatTime(c.end_time);
          return c.booking_status !== 4 && c.booking_status !== 5 && cStart < endTime && cEnd > startTime;
        });

        // 个人课程列表（view 模式详情面板使用）
        const personalCourses = coursesInSlot.map(course => ({
          id: course.id,
          studentName: course.relation ? (course.relation.student_name || '') : (course.student ? course.student.nickname : ''),
          location: course.address ? course.address.name : '',
          booking_status: this.getStatusFromApi(course.booking_status),
          isCreatedByCurrentUser: course.created_by && course.created_by == this.data.currentUserId,
          courseData: course,
          type: 'personal'
        }));
        const groupCoursesList = groupCoursesInSlot.map(gc => ({
          id: gc.id,
          title: gc.title,
          coachName: gc.coach ? gc.coach.nickname : '未知教练',
          location: gc.address ? gc.address.name : '未设置地址',
          currentParticipants: gc.current_participants || 0,
          maxParticipants: gc.max_participants || 0,
          price: this.getGroupCoursePrice(gc),
          courseData: gc,
          type: 'group'
        }));

        // 合并个人课程与活动（详情面板展示用）
        const courses = [...personalCourses, ...groupCoursesList];

        // 状态优先级
        // view 模式：groupBooked > full > booked > expired > tooSoon > resting > free
        // select 模式：expired > tooSoon > resting > groupBooked > full > booked > conflict > free
        const isSelectMode = this.properties.mode === 'select';
        let status, statusLabel;
        if (!isSelectMode) {
          // view 模式
          if (hasGroupConflictView) {
            status = 'groupBooked'; statusLabel = '活动';
          } else if (remainingCount <= 0 && bookedCount > 0) {
            status = 'full'; statusLabel = '满';
          } else if (bookedCount > 0) {
            status = 'booked'; statusLabel = String(bookedCount);
          } else if (isExpired) {
            status = 'expired'; statusLabel = '过';
          } else if (isTooSoon) {
            status = 'tooSoon'; statusLabel = '早';
          } else if (isBlocked) {
            status = 'resting'; statusLabel = '休';
          } else {
            status = 'free'; statusLabel = '';
          }
        } else {
          // select 模式
          if (isExpired) {
            status = 'expired'; statusLabel = '过';
          } else if (isTooSoon) {
            status = 'tooSoon'; statusLabel = '早';
          } else if (isBlocked) {
            status = 'resting'; statusLabel = '休';
          } else if (hasGroupConflictSelect) {
            status = 'groupBooked'; statusLabel = '活动';
          } else if (remainingCount <= 0) {
            status = 'full'; statusLabel = '满';
          } else if (bookedCount > 0) {
            status = 'booked'; statusLabel = String(bookedCount);
          } else if (hasBookingConflict || hasRestConflict) {
            // 此格本身没有课程/休息，但从此处预约会与已有课程或休息时段冲突
            status = 'conflict'; statusLabel = '';
          } else {
            status = 'free'; statusLabel = '';
          }
        }

        slots.push({
          id: `${date}_${startTime}_${endTime}`,
          startTime,
          endTime,
          cellEndTime,
          status,
          statusLabel,
          isExpired,
          isTooSoon,
          isBlocked,
          blockedSlotId: blockedSlotItem ? blockedSlotItem.id : (overlappingBlockedItems[0] ? overlappingBlockedItems[0].id : null),
          overlappingBlockedIds: overlappingBlockedItems.map(b => b.id),
          hasActiveBookings,
          bookedCount,
          remainingCount,
          maxAdvanceNums,
          courses,
          groupCourses: groupCoursesList // 与固定模板 slot 字段保持一致
        });

        current += slotInterval;
      }

      return slots;
    },

    /**
     * 切换时间段休息状态（教练专用）
     * @param {Object} e - 事件对象，dataset.slot 为当前时间段数据
     */
    async onToggleRest(e) {
      const { slot } = e.currentTarget.dataset;
      const { currentDate } = this.data;

      if (!slot || !currentDate) return;

      const isCurrentlyBlocked = slot.isBlocked;
      const actionText = isCurrentlyBlocked ? '取消休息' : '设置休息';

      try {
        wx.showLoading({ title: `${actionText}中...`, mask: true });

        if (isCurrentlyBlocked) {
          await api.blockedSlot.delete(slot.blockedSlotId);
        } else {
          // 结构化自由日程网格的休息时段长度 = 时间步长（cellEndTime）
          // 固定时间段模板的休息时段长度 = 模板自身长度（endTime）
          const restEndTime = slot.cellEndTime || slot.endTime;
          await api.blockedSlot.create({
            slot_date: currentDate,
            start_time: slot.startTime,
            end_time: restEndTime
          });
        }

        wx.hideLoading();
        wx.showToast({ title: `${actionText}成功`, icon: 'success' });

        // 重新加载当前日期时间段
        this.loadTimeSlots(currentDate);
      } catch (error) {
        wx.hideLoading();
        console.error('切换休息状态失败:', error);
        wx.showToast({ title: error.message || '操作失败，请重试', icon: 'none' });
      }
    },

    /**
     * 结构化自由日程网格点击
     * - select 模式：选中时间点并触发事件
     * - view 模式（教练）：切换休息状态
     * @param {Object} e
     */
    onGridSlotTap(e) {
      const { slot } = e.currentTarget.dataset;
      if (!slot) return;

      const { mode } = this.properties;
      const { currentDate } = this.data;

      if (mode === 'select') {
        // 不可选状态拦截
        const blockMsg = {
          expired: '该时段已过期',
          tooSoon: `需提前 ${this.data.minAdvanceHours} 小时预约`,
          resting: '教练已设置该时段休息，暂不可约',
          groupBooked: '该时段已有活动',
          full: '该时段已满员',
          conflict: '与已有课程时间冲突，请选择其他时间'
        };
        if (blockMsg[slot.status]) {
          wx.showToast({ title: blockMsg[slot.status], icon: 'none', duration: 2000 });
          return;
        }
        // 点击已选中的起始格子 → 取消选中
        if (this.data.selectedGridStart === slot.startTime) {
          this.setData({ selectedGridStart: '', selectedGridEnd: '' });
          return;
        }
        // 高亮范围 = [startTime, startTime + lessonDuration)
        const { lessonDuration } = this.data;
        const endTime = this.minutesToTime(this.timeToMinutes(slot.startTime) + lessonDuration);
        this.setData({ selectedGridStart: slot.startTime, selectedGridEnd: endTime });
        this.triggerEvent('timeSlotTap', { slot, date: currentDate });
      } else if (mode === 'view') {
        // view 模式：弹出详情面板（教练和学员均可查看课程列表）
        this.setData({ showGridSlotDetail: true, currentGridSlot: slot });
      }
    },

    /**
     * 关闭网格时间段详情面板
     */
    onCloseGridSlotDetail() {
      this.setData({ showGridSlotDetail: false, currentGridSlot: null });
    },

    /**
     * 在详情面板内切换休息状态
     * 取消休息时删除该格子时间范围内所有重叠的休息记录
     */
    async onGridDetailToggleRest() {
      const { currentGridSlot, currentDate } = this.data;
      if (!currentGridSlot || !currentDate) return;

      if (currentGridSlot.hasActiveBookings) {
        wx.showToast({ title: '该时段有已确认课程，无法设置休息', icon: 'none', duration: 2500 });
        return;
      }

      if (currentGridSlot.status === 'groupBooked') {
        wx.showToast({ title: '该时段已有活动，无法设置休息', icon: 'none', duration: 2500 });
        return;
      }

      this.setData({ showGridSlotDetail: false, currentGridSlot: null });

      const isCurrentlyBlocked = currentGridSlot.isBlocked;
      const actionText = isCurrentlyBlocked ? '取消休息' : '设置休息';

      try {
        wx.showLoading({ title: `${actionText}中...`, mask: true });

        if (isCurrentlyBlocked) {
          // 批量删除所有重叠的休息记录
          const ids = currentGridSlot.overlappingBlockedIds || [];
          if (ids.length > 1) {
            await api.blockedSlot.deleteBatch(ids);
          } else if (ids.length === 1) {
            await api.blockedSlot.delete(ids[0]);
          }
        } else {
          await api.blockedSlot.create({
            slot_date: currentDate,
            start_time: currentGridSlot.startTime,
            end_time: currentGridSlot.cellEndTime || currentGridSlot.endTime
          });
        }

        wx.hideLoading();
        wx.showToast({ title: `${actionText}成功`, icon: 'success' });
        this.loadTimeSlots(currentDate);
      } catch (error) {
        wx.hideLoading();
        console.error('切换休息状态失败:', error);
        wx.showToast({ title: error.message || '操作失败，请重试', icon: 'none' });
      }
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

      const updateObj = {
        selectedStartTime: time,
        minSelectableEndTime: this.getNextMinuteTime(time)
      };

      // 若配置了课程时长（但未配置步长），自动填入结束时间
      const { lessonDuration, slotInterval } = this.data;
      if (lessonDuration > 0 && slotInterval === 0) {
        const endMin = this.timeToMinutes(time) + lessonDuration;
        const autoEnd = this.minutesToTime(endMin);
        // 不超出模板范围才填入
        if (!freeTimeRange || autoEnd <= freeTimeRange.endTime) {
          updateObj.selectedEndTime = autoEnd;
        }
      }

      this.setData(updateObj);
      
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
    async triggerTimeSelection() {
      const { currentDate, selectedStartTime, selectedEndTime, minAdvanceHours } = this.data;

      if (!selectedStartTime || !selectedEndTime) {
        return;
      }

      // 提前预约限制校验（非团课）
      if (minAdvanceHours > 0 && this.properties.type !== 'groupCourses') {
        if (this.isTimeSlotTooSoon(currentDate, selectedStartTime)) {
          wx.showToast({
            title: `需提前 ${minAdvanceHours} 小时预约，请重新选择开始时间`,
            icon: 'none',
            duration: 2500
          });
          // 重置开始时间，避免 picker 显示无效值误导用户
          this.setData({
            selectedStartTime: '',
            minSelectableEndTime: ''
          });
          return;
        }
      }

      // 检查该时间段的状态
      const statusCheck = await this.checkFreeTimeSlotStatus(selectedStartTime, selectedEndTime, currentDate);

      // 触发时间段选择事件
      this.triggerEvent('timeSlotTap', {
        slot: {
          id: `${currentDate}_${selectedStartTime}_${selectedEndTime}`,
          startTime: selectedStartTime,
          endTime: selectedEndTime,
          status: statusCheck.status
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