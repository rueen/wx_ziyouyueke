/**
 * pages/studentList/studentList.js
 * 学员列表页面
 */

// 引入API工具类
const api = require('../../utils/api.js');
// 引入工具函数
const { validatePhone } = require('../../utils/util.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    students: [],
    coachInfo: {},
    isFirstLoad: true, // 标记是否首次加载
    isLoading: false, // 加载状态
    
    // 分页相关
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    isRefreshing: false,
    showModal: false,

    studentPhone: null
  },

  onAddStudent() {
    this.setData({
      showModal: true
    });
  },
  onHideModal() {
    this.setData({
      showModal: false
    });
  },
  /**
   * 手机号输入事件
   * @param {Object} e 事件对象
   */
  onPhoneInput(e) {
    this.setData({
      studentPhone: e.detail.value
    });
  },

  /**
   * 确认绑定学员
   */
  onConfirmBind() {
    const { studentPhone } = this.data;
    
    // 检查手机号是否已填写
    if (!studentPhone || studentPhone.trim() === '') {
      wx.showToast({
        title: '请输入学员手机号',
        icon: 'none'
      });
      return;
    }
    
    // 检查手机号格式是否正确
    if (!validatePhone(studentPhone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }
    
    // 手机号验证通过，这里可以添加后续的绑定逻辑
    console.log('手机号验证通过:', studentPhone);
    // TODO: 调用绑定学员的API接口
    
    // 关闭弹窗
    this.onHideModal();
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadStudents(true);
    this.loadCoachInfo();
    this.setData({
      isFirstLoad: false
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 只有非首次加载时才刷新数据（从其他页面返回时）
    if (!this.data.isFirstLoad) {
      this.loadStudents(true);
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadStudents(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载学员列表
   * @param {boolean} isRefresh 是否是刷新操作
   */
  async loadStudents(isRefresh = false) {
    if (this.data.isLoading) return;
    
    try {
      this.setData({ isLoading: true });
      
      if (isRefresh) {
        this.setData({ 
          currentPage: 1,
          hasMore: true,
          isRefreshing: true
        });
      }

      if (!isRefresh && !this.data.hasMore) {
        this.setData({ isLoading: false });
        return;
      }

      // 构建请求参数
      const { currentPage, pageSize } = this.data;
      
      const params = {
        page: currentPage,
        limit: pageSize
      };

      // 调用API获取我的学员列表
      const result = await api.relation.getMyStudents(params);
      
      if (result && result.data && result.data.list) {
        
        // 格式化API数据为前端需要的格式
        const newStudents = result.data.list.map(item => ({
          ...item,
          id: item.id, // 师生关系ID
          studentId: item.student_id, // 学员用户ID
          name: (item.student && item.student.nickname) || '未知学员',
          avatar: (item.student && item.student.avatar_url) || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
          level: '初级', // 暂时写死，后续可以从用户信息中获取
          remainingLessons: item.remaining_lessons || 0,
          introduction: (item.student && item.student.intro) || '暂无介绍',
          remark: item.coach_remark || '无备注',
          phone: (item.student && item.student.phone) || ''
        }));

        // 处理分页数据
        const hasMore = result.data.page < result.data.totalPages;
        
        let students;
        if (isRefresh || currentPage === 1) {
          students = newStudents;
        } else {
          students = [...this.data.students, ...newStudents];
        }

        this.setData({
          students,
          currentPage: currentPage + 1,
          hasMore,
          isLoading: false,
          isRefreshing: false
        });
        
      } else {
        // 没有学员数据
        this.setData({
          students: isRefresh ? [] : this.data.students,
          hasMore: false,
          isLoading: false,
          isRefreshing: false
        });
      }
    } catch (error) {
      console.error('加载学员数据失败:', error);
      
      this.setData({
        isLoading: false,
        isRefreshing: false
      });
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 刷新学员列表（供其他页面调用）
   */
  refreshStudentList() {
    this.loadStudents(true);
  },

  /**
   * 上拉加载更多
   */
  onReachBottom() {
    if (!this.data.isLoading && this.data.hasMore) {
      this.loadStudents(false);
    }
  },

  /**
   * 加载教练信息
   */
  loadCoachInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        coachInfo: userInfo
      });
    }
  },

  /**
   * 进入学员详情
   */
  onStudentDetail(e) {
    const student = e.currentTarget.dataset.student;
    wx.navigateTo({
      url: `/pages/studentDetail/studentDetail?studentData=${encodeURIComponent(JSON.stringify(student))}`
    });
  },

  /**
   * 页面分享配置
   */
  onShareAppMessage() {
    const { coachInfo } = this.data;
    return {
      title: `${coachInfo.nickname}邀请您成为学员`,
      path: `/pages/bindCoach/bindCoach?coach_id=${coachInfo.id}`,
      imageUrl: coachInfo.avatar_url
    };
  }
}) 