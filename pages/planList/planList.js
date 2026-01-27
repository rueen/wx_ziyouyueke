/**
 * pages/planList/planList.js
 * 训练计划列表页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    plans: [],
    studentId: null,
    coachId: null,
    isStudent: false,
    studentName: '',
    isFirstLoad: true, // 标记是否首次加载
    isLoading: false, // 加载状态
    
    // 分页相关
    currentPage: 1,
    pageSize: 20,
    hasMore: true,
    isRefreshing: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const studentId = options.studentId ? parseInt(options.studentId) : null;
    const coachId = options.coachId ? parseInt(options.coachId) : null;
    const studentName = options.studentName ? decodeURIComponent(options.studentName) : '';
    const isStudent = !!options.isStudent;
    
    this.setData({
      studentId: studentId,
      coachId: coachId,
      studentName: studentName,
      isFirstLoad: false,
      isStudent: isStudent
    }, () => {
      this.loadPlans(true);
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 只有非首次加载时才刷新数据（从其他页面返回时）
    if (!this.data.isFirstLoad) {
      this.loadPlans(true);
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadPlans(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadPlans(false);
    }
  },

  /**
   * 加载训练计划列表
   * @param {boolean} reset - 是否重置分页
   */
  async loadPlans(reset = false) {
    if (this.data.isLoading) return;
    
    try {
      const page = reset ? 1 : this.data.currentPage + 1;
      
      this.setData({ 
        isLoading: true,
        isRefreshing: reset
      });

      // 构建查询参数
      const params = {
        page: page,
        page_size: this.data.pageSize
      };
      if(this.data.isStudent){
        params.is_visible = 1;
      }
      
      // 如果指定了学员ID，添加筛选条件
      if (this.data.studentId) {
        params.student_id = this.data.studentId;
      }
      if(this.data.coachId) {
        params.coach_id = this.data.coachId;
      }

      // 调用API获取训练计划列表
      const result = await api.plan.getList(params);
      
      if (result && result.data) {
        const newPlans = result.data.list || [];
        const pagination = result.data.pagination || {};
        
        const plans = reset ? newPlans : [...this.data.plans, ...newPlans];
        
        this.setData({
          plans: plans,
          currentPage: page,
          hasMore: pagination.page < pagination.total_pages,
          isLoading: false,
          isRefreshing: false
        });
      } else {
        this.setData({
          isLoading: false,
          isRefreshing: false
        });
      }
    } catch (error) {
      console.error('加载训练计划列表失败:', error);
      this.setData({
        isLoading: false,
        isRefreshing: false
      });
      
      wx.showToast({
        title: error.message || '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 点击计划项，进入详情页
   */
  onPlanDetail(e) {
    const plan = e.currentTarget.dataset.plan;
    wx.navigateTo({
      url: `/pages/planDetail/planDetail?planId=${plan.id}&studentId=${this.data.studentId || ''}&coachId=${this.data.coachId || ''}&isStudent=${this.data.isStudent}`
    });
  },

  /**
   * 添加新计划
   */
  onAddPlan() {
    wx.navigateTo({
      url: `/pages/planDetail/planDetail?type=add&studentId=${this.data.studentId || ''}&coachId=${this.data.coachId || ''}`
    });
  }
});
