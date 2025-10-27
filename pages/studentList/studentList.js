/**
 * pages/studentList/studentList.js
 * 学员列表页面
 */

// 引入API工具类
const api = require('../../utils/api.js');
// 引入工具函数
const { validatePhone } = require('../../utils/util.js');
// 引入海报工具
const posterUtil = require('../../utils/poster.js');

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

    // 分享相关
    showShareModal: false,
    shareOptions: [
      { id: 'friend', name: '发送好友', icon: 'icon-wechat' },
      { id: 'qrcode', name: '生成二维码', icon: 'icon-qrcode' }
    ]
  },

  /**
   * 点击添加学员按钮
   */
  onAddStudent() {
    this.setData({
      showShareModal: true
    });
  },

  /**
   * 关闭分享弹窗
   */
  onCloseShareModal() {
    this.setData({
      showShareModal: false
    });
  },

  /**
   * 选择分享方式
   * @param {Object} e 事件对象
   */
  onSelectShareType(e) {
    const { type } = e.detail;

    this.onCloseShareModal();

    switch (type) {
      case 'qrcode':
        // 生成二维码
        this.generateQRCode();
        break;
    }
  },

  /**
   * 生成二维码
   */
  async generateQRCode() {
    const { coachInfo } = this.data;
    
    await posterUtil.generateAndShareQRCode({
      scene: `coachId=${coachInfo.id}`,
      page: 'pages/bindCoach/bindCoach'
    });
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
      url: `/pages/studentDetail/studentDetail?relationId=${student.id}&studentId=${student.student_id}`
    });
  },

  /**
   * 页面分享配置
   */
  onShareAppMessage() {
    const { coachInfo } = this.data;
    return {
      title: `${coachInfo.nickname}邀请您成为学员`,
      path: `/pages/bindCoach/bindCoach?coachId=${coachInfo.id}`,
      imageUrl: coachInfo.avatar_url
    };
  }
}) 