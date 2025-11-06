/**
 * components/studentSchedule/studentSchedule.js
 * 学员日程组件
 */

const api = require('../../utils/api.js');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 学员ID
    studentId: {
      type: Number,
      value: null
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    currentDate: '', // 当前选中的日期
    dateList: [], // 近7天的日期列表
    scheduleData: [], // 当前日期的课程安排
    isLoading: false,
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
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'studentId': function(newStudentId) {
      if (newStudentId && typeof newStudentId === 'number') {
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
        this.generateDateList();
        if (this.data.currentDate) {
          await this.loadScheduleData(this.data.currentDate);
        }
      } catch (error) {
        console.error('初始化学员日程组件失败:', error);
      }
    },

    /**
     * 生成近7天的日期列表
     */
    generateDateList() {
      const dateList = [];
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dateStr = this.formatDate(date);
        const weekDay = this.getWeekDay(date);
        const monthDay = this.getMonthDay(date);
        
        dateList.push({
          date: dateStr,
          weekDay: weekDay,
          monthDay: monthDay,
          isToday: i === 0
        });
      }
      
      if(this.data.dateList && this.data.dateList.length && this.data.dateList[0].date === dateList[0].date){
        return;
      }
      this.setData({
        dateList: dateList,
        currentDate: dateList[0].date
      });
    },

    /**
     * 加载指定日期的课程安排
     */
    async loadScheduleData(date) {
      if (this.data.isLoading) return;
      
      try {
        this.setData({
          isLoading: true
        });

        const studentId = this.properties.studentId;
        if (!studentId) {
          console.warn('学员ID未设置');
          this.setData({
            isLoading: false,
            scheduleData: []
          });
          return;
        }

        // 并行加载普通课程和活动数据
        const [courseResult, groupCourseResult] = await Promise.all([
          this.loadPersonalCourses(date, studentId),
          this.loadGroupCourses(date, studentId)
        ]);

        // 合并并按时间排序
        const allCourses = [...courseResult, ...groupCourseResult];
        allCourses.sort((a, b) => {
          const timeA = a.startTime.replace(':', '');
          const timeB = b.startTime.replace(':', '');
          return timeA - timeB;
        });

        this.setData({
          scheduleData: allCourses,
          isLoading: false
        });

      } catch (error) {
        console.error('加载课程安排失败:', error);
        this.setData({
          isLoading: false,
          scheduleData: []
        });
      }
    },

    /**
     * 加载普通课程
     */
    async loadPersonalCourses(date, studentId) {
      try {
        const params = {
          start_date: date,
          end_date: date,
          student_id: studentId,
          limit: 100
        };

        const result = await api.course.getList(params);
        const courses = result.data ? result.data.list : [];

        // 过滤掉已取消的课程，并转换数据格式
        return courses
          .filter(course => course.booking_status !== 4 && course.booking_status !== 5)
          .map(course => {
            const isCreatedByCurrentUser = course.created_by && course.created_by == this.data.currentUserId;
            return {
              id: course.id,
              type: 'personal',
              startTime: course.start_time.substring(0, 5),
              endTime: course.end_time.substring(0, 5),
              coachName: course.coach ? course.coach.nickname : '未知教练',
              location: course.address ? course.address.name : '未设置地址',
              booking_status: this.getStatusFromApi(course.booking_status),
              isCreatedByCurrentUser: isCreatedByCurrentUser,
              courseData: course
            };
          });
      } catch (error) {
        console.error('加载普通课程失败:', error);
        return [];
      }
    },

    /**
     * 加载活动
     */
    async loadGroupCourses(date, studentId) {
      try {
        // 使用 getMyRegistrations API 获取学员报名的活动
        const params = {
          status: 0, // 只获取进行中中的活动
          limit: 100
        };
        
        const result = await api.groupCourse.getMyRegistrations(params);
        const registrations = result.data ? result.data.list : [];

        // 筛选出指定日期的活动
        const studentGroupCourses = registrations
          .map(reg => reg.groupCourse)
          .filter(course => course && course.course_date === date);

        return studentGroupCourses.map(course => ({
          id: course.id,
          type: 'group',
          startTime: course.start_time.substring(0, 5),
          endTime: course.end_time.substring(0, 5),
          title: course.title,
          coachName: course.coach ? course.coach.nickname : '未知教练',
          location: course.address ? course.address.name : '未设置地址',
          currentParticipants: course.current_participants || 0,
          maxParticipants: course.max_participants || 0,
          price: this.getGroupCoursePrice(course),
          courseData: course
        }));
      } catch (error) {
        console.error('加载活动失败:', error);
        return [];
      }
    },

    /**
     * 获取活动价格显示文本
     */
    getGroupCoursePrice(course) {
      switch (course.price_type) {
        case 1:
          return `${course.lesson_cost}课时`;
        case 2:
          return `¥${course.price_amount}`;
        case 3:
          return '免费';
        default:
          return '免费';
      }
    },

    /**
     * API状态码转换为中文状态
     */
    getStatusFromApi(status) {
      const statusMap = {
        1: 'pending',
        2: 'confirmed',
        3: 'completed',
        4: 'cancelled',
        5: 'cancelled'
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
      
      this.loadScheduleData(date);
    },

    /**
     * 点击课程
     */
    onCourseTap(e) {
      const { course } = e.currentTarget.dataset;
      
      if (!course) return;
      
      // 根据课程类型跳转到不同的详情页
      if (course.type === 'group') {
        wx.navigateTo({
          url: `/pages/groupCourseDetail/groupCourseDetail?courseId=${course.id}`
        });
      } else {
        wx.navigateTo({
          url: `/pages/courseDetail/courseDetail?id=${course.id}`
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
    },

    /**
     * 刷新数据
     */
    refresh() {
      if (this.data.currentDate) {
        this.loadScheduleData(this.data.currentDate);
      }
    }
  }
});

