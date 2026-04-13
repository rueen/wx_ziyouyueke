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

    // 搜索相关
    keyword: '', // 搜索关键词
    searchTimer: null, // 搜索防抖定时器

    // 分享相关
    showShareModal: false,
    shareOptions: [
      { id: 'friend', name: '发送好友', icon: 'icon-wechat' },
      { id: 'qrcode', name: '生成二维码', icon: 'icon-qrcode' },
      { id: 'manual', name: '手动录入', icon: 'icon-editor' }
    ],

    // 手动录入学员弹窗
    showAddByPhoneModal: false,
    addByPhoneForm: {
      phone: '',
      student_name: '',
      coach_remark: ''
    },
    isSubmittingByPhone: false
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
      case 'manual':
        // 手动录入学员
        this.onShowAddByPhoneModal();
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
      const { currentPage, pageSize, keyword } = this.data;
      
      const params = {
        page: currentPage,
        limit: pageSize
      };

      // 如果有搜索关键词，添加到参数中
      if (keyword && keyword.trim()) {
        params.keyword = keyword.trim();
      }

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
   * 待激活学员（relation_status=2）无法进入详情，点击弹出提示
   */
  onStudentDetail(e) {
    const student = e.currentTarget.dataset.student;

    if (student.relation_status === 2) {
      wx.showModal({
        title: '待激活学员',
        content: `手机号 ${student.pending_phone} 尚未注册，请引导其登录并绑定手机号后自动激活。`,
        cancelText: '解除绑定',
        confirmText: '知道了',
        success: (res) => {
          if (res.cancel) {
            this.onUnbindPendingStudent(student);
          }
        }
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/studentDetail/studentDetail?relationId=${student.id}&studentId=${student.student_id}`
    });
  },

  /**
   * 解除待激活学员绑定
   * @param {Object} student 待激活学员关系对象
   */
  onUnbindPendingStudent(student) {
    wx.showModal({
      title: '确认解除',
      content: `确定要解除与手机号 ${student.pending_phone} 的待激活关系吗？`,
      confirmText: '确认解除',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (!res.confirm) return;

        try {
          wx.showLoading({ title: '解除中...' });
          const result = await api.relation.delete(student.id);
          wx.hideLoading();

          if (result && result.success) {
            wx.showToast({ title: '解除成功', icon: 'success' });
            setTimeout(() => this.loadStudents(true), 600);
          } else {
            throw new Error(result.message || '解除失败');
          }
        } catch (error) {
          wx.hideLoading();
          console.error('解除待激活关系失败:', error);
          wx.showToast({
            title: error.message || '解除失败，请重试',
            icon: 'none',
            duration: 3000
          });
        }
      }
    });
  },

  /**
   * 显示手动录入学员弹窗
   */
  onShowAddByPhoneModal() {
    this.setData({
      showAddByPhoneModal: true,
      addByPhoneForm: { phone: '', student_name: '', coach_remark: '' }
    });
  },

  /**
   * 关闭手动录入学员弹窗
   */
  onHideAddByPhoneModal() {
    this.setData({
      showAddByPhoneModal: false
    });
  },

  /**
   * 手动录入表单输入事件（phone / student_name / coach_remark 共用）
   * @param {Object} e 事件对象
   */
  onAddByPhoneInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`addByPhoneForm.${field}`]: e.detail.value
    });
  },

  /**
   * 提交手动录入学员
   */
  async onSubmitAddByPhone() {
    const { addByPhoneForm, isSubmittingByPhone } = this.data;

    if (isSubmittingByPhone) return;

    const { phone, student_name, coach_remark } = addByPhoneForm;

    if (!validatePhone(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
      return;
    }

    const trimmedName = student_name.trim();
    if (!trimmedName) {
      wx.showToast({ title: '请输入学员姓名', icon: 'none' });
      return;
    }
    if (trimmedName.length > 50) {
      wx.showToast({ title: '学员姓名不能超过50个字符', icon: 'none' });
      return;
    }

    try {
      this.setData({ isSubmittingByPhone: true });
      wx.showLoading({ title: '添加中...' });

      const result = await api.relation.addByPhone({
        phone: phone.trim(),
        student_name: student_name.trim(),
        coach_remark: coach_remark.trim()
      });

      wx.hideLoading();

      if (result && result.success) {
        const isPending = result.data && result.data.is_pending;
        wx.showToast({
          title: isPending ? '已录入，等待学员激活' : '添加成功',
          icon: 'success',
          duration: 2000
        });
        this.onHideAddByPhoneModal();
        // 延迟刷新，等 toast 消失后再加载
        setTimeout(() => this.loadStudents(true), 600);
      }
    } catch (error) {
      wx.hideLoading();
      console.error('手动录入学员失败:', error);
      wx.showToast({
        title: error.message || '添加失败，请重试',
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ isSubmittingByPhone: false });
    }
  },

  /**
   * 搜索输入事件处理（带防抖）
   * @param {Object} e 事件对象
   */
  onSearchInput(e) {
    const keyword = e.detail.value;
    
    // 更新搜索关键词
    this.setData({
      keyword: keyword
    });

    // 清除之前的定时器
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }

    // 设置防抖定时器，500ms后执行搜索
    const timer = setTimeout(() => {
      this.loadStudents(true);
    }, 500);

    this.setData({
      searchTimer: timer
    });
  },

  /**
   * 搜索确认事件处理
   * @param {Object} e 事件对象
   */
  onSearchConfirm(e) {
    const keyword = e.detail.value;
    
    // 清除防抖定时器
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
      this.setData({
        searchTimer: null
      });
    }

    // 更新搜索关键词并立即搜索
    this.setData({
      keyword: keyword
    });
    
    this.loadStudents(true);
  },

  /**
   * 清空搜索
   */
  onClearSearch() {
    // 清除防抖定时器
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
      this.setData({
        searchTimer: null
      });
    }

    // 清空搜索关键词并重新加载
    this.setData({
      keyword: ''
    });
    
    this.loadStudents(true);
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
  },

  /**
   * 阻止事件冒泡，防止点击弹窗内容区域时触发遮罩关闭
   */
  onPreventClose() {},

  /**
   * 页面卸载时清理定时器
   */
  onUnload() {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer);
    }
  }
}) 