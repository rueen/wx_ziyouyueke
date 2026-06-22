/**
 * pages/studentDetail/studentDetail.js
 * 学员详情页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    studentData: {},
    relationId: null,
    studentId: null,
    showUnbindModal: false,
    isUnbinding: false,
    bookingStatus: true,

    // 标签相关
    allTags: [],
    studentTags: [],
    selectedTagIds: [],
    showTagModal: false,
    isSavingTags: false,
    tagRefreshMode: false
  },

  /** 标记是否首次加载，避免 onLoad + onShow 双重触发接口 */
  _isFirstLoad: true,

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if(options.relationId && options.studentId) {
      this.setData({
        studentId: options.studentId - 0,
        relationId: options.relationId - 0
      }, () => {
        this.loadStudentDetail();
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   * 首次进入时跳过（onLoad 已触发），从子页面返回时刷新数据
   */
  onShow() {
    if (this._isFirstLoad) {
      this._isFirstLoad = false;
      return;
    }
    const { relationId } = this.data;
    if (relationId) {
      this.loadStudentDetail();
    }
  },

  /** 加载教练全量标签 */
  async loadAllTags() {
    try {
      const result = await api.tags.getList();
      this.setData({ allTags: (result && result.data) ? result.data : [] });
    } catch (e) {
      console.warn('加载标签失败', e);
    }
  },

  /** 打开标签选择弹窗，懒加载全量标签 */
  async onShowTagModal() {
    this.setData({
      showTagModal: true,
      selectedTagIds: this.data.studentTags.map(t => t.id)
    });
    // allTags 未加载时才请求，避免重复调用
    if (this.data.allTags.length === 0) {
      await this.loadAllTags();
    }
  },

  /** 关闭标签选择弹窗，重置刷新模式 */
  onHideTagModal() {
    this.setData({ showTagModal: false, tagRefreshMode: false });
  },

  /**
   * 管理标签 / 刷新标签
   * - tagRefreshMode 为 false：跳转至标签管理页，并切换为刷新模式
   * - tagRefreshMode 为 true：重新拉取全量标签，并还原为管理模式
   */
  async onManageOrRefreshTags() {
    if (this.data.tagRefreshMode) {
      // 刷新标签数据
      wx.showLoading({ title: '刷新中...' });
      await this.loadAllTags();
      wx.hideLoading();
      this.setData({ tagRefreshMode: false });
    } else {
      // 跳转至标签管理页，切换为刷新模式
      this.setData({ tagRefreshMode: true });
      wx.navigateTo({ url: '/pages/tagManagement/tagManagement' });
    }
  },

  /** 切换标签选中状态 */
  onToggleTag(e) {
    const id = e.currentTarget.dataset.id;
    const ids = [...this.data.selectedTagIds];
    const idx = ids.indexOf(id);
    if (idx === -1) { ids.push(id); } else { ids.splice(idx, 1); }
    this.setData({ selectedTagIds: ids });
  },

  /** 保存标签 */
  async onSaveTags() {
    const { selectedTagIds, relationId, isSavingTags } = this.data;
    if (isSavingTags) return;
    try {
      this.setData({ isSavingTags: true });
      wx.showLoading({ title: '保存中...' });
      await api.tags.setRelationTags(relationId, { tag_ids: selectedTagIds });
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.onHideTagModal();
      await this.loadStudentDetail();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ isSavingTags: false });
    }
  },

  async loadStudentDetail() {
    const { relationId } = this.data;
    try {
      wx.showLoading({
        title: '加载中...'
      });

      const result = await api.relation.getMyStudentsDetail(relationId);
      
      wx.hideLoading();

      if (result && result.data) {
        const studentData = result.data || {};
        const studentTags = studentData.tags || [];
        // 不在此处写 selectedTagIds，避免 loadStudentDetail 异步返回时覆盖弹窗中用户正在编辑的选中状态
        this.setData({
          studentData: studentData,
          bookingStatus: studentData.booking_status,
          studentTags: studentTags
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载学员详情失败:', error);
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  bookingStatusSwitchChange(e) {
    if(e.detail.value){
      // 开启
      wx.showModal({
        content: '开启后，课程到期时间会重新计算，确定开启约课状态吗？',
        success: (res) => {
          if (res.confirm) {
            this.switchBookingStatus(e.detail.value)
          } else if (res.cancel) {
            this.setData({
              bookingStatus: false
            })
          }
        }
      })
    } else {
      // 关闭
      wx.showModal({
        content: '关闭后，无法预约该学员的所有课程；课程到期时间会在重新开启后顺延，确定关闭约课状态吗？',
        success: (res) => {
          if (res.confirm) {
            this.switchBookingStatus(e.detail.value)
          } else if (res.cancel) {
            this.setData({
              bookingStatus: true
            })
          }
        }
      })
    }
  },

  async switchBookingStatus(value) {
    const { studentData } = this.data;
    try{
      wx.showLoading();
      const result = await api.relation.switchBookingStatus(studentData.id, {
        booking_status: value - 0
      });
      wx.hideLoading();
      if (result && result.success) {
        this.setData({
          bookingStatus: value
        })
        this.loadStudentDetail();
      } else {
        this.setData({
          bookingStatus: !value
        })
      }
    } catch (e) {
      this.setData({
        bookingStatus: !value
      })
    }
  },

  /**
   * 约课
   */
  onBookStudent() {
    const { studentData } = this.data;
    wx.navigateTo({
      url: `/pages/bookCourse/bookCourse?type=coach-book-student&from=studentDetail&studentId=${studentData.student_id}&studentName=${encodeURIComponent(studentData.student.nickname)}`
    });
  },

  /**
   * 阻止弹窗关闭（用于阻止点击弹窗内容区域时关闭弹窗）
   */
  onPreventClose(e) {
    // 阻止事件冒泡，防止触发遮罩层的点击事件
  },

  /**
   * 显示解除绑定确认弹窗
   */
  onShowUnbindConfirm() {
    const { studentData } = this.data;
    const lessons = studentData.lessons || [];
    const remaining = lessons.reduce((acc, curr) => acc + curr.remaining_lessons, 0);

    // 检查剩余课时数，如果大于0则不允许解除绑定
    if (remaining > 0) {
      wx.showModal({
        title: '无法解除绑定',
        content: `该学员还有 ${remaining} 节剩余课时，请先消耗完课时或将课时数修改为0后再解除绑定。`,
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#007aff'
      });
      return;
    }
    
    this.setData({
      showUnbindModal: true
    });
  },

  /**
   * 隐藏解除绑定确认弹窗
   */
  onHideUnbindModal() {
    this.setData({
      showUnbindModal: false
    });
  },

  /**
   * 确认解除绑定
   */
  async onConfirmUnbind() {
    const { studentData, isUnbinding } = this.data;
    
    if (isUnbinding) {
      return; // 防止重复提交
    }

    try {
      this.setData({
        isUnbinding: true
      });

      wx.showLoading({
        title: '解除中...'
      });

      // 调用API解除师生关系
      const result = await api.relation.delete(studentData.id);
      
      wx.hideLoading();

      if (result && result.success) {
        this.setData({
          showUnbindModal: false,
          isUnbinding: false
        });

        wx.showToast({
          title: '解除绑定成功',
          icon: 'success',
          duration: 1500,
          success: () => {
            // 延迟返回上一页
            setTimeout(() => {
              // 通知学员列表页面刷新数据
              const pages = getCurrentPages();
              if (pages.length >= 2) {
                const prevPage = pages[pages.length - 2];
                if (prevPage.route === 'pages/studentList/studentList' && prevPage.refreshStudentList) {
                  prevPage.refreshStudentList();
                }
              }
              
              wx.navigateBack({
                delta: 1
              });
            }, 1500);
          }
        });
      } else {
        throw new Error(result.message || '解除绑定失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('解除师生关系失败:', error);
      
      this.setData({
        isUnbinding: false
      });

      const errorMessage = error.message || '解除绑定失败，请重试';
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    }
  },

  // 查看上课记录
  handleViewCourseList() {
    const { studentData } = this.data;

    const student = {
      student_id: studentData.student_id,
      nickname: studentData.student_name
    }
    wx.navigateTo({
      url: `/pages/courseList/courseList?pageFrom=studentDetail&student=${JSON.stringify(student)}`
    });
  },

  /**
   * 卡片管理
   */
  handleCardManagement() {
    const { studentData, relationId, studentId } = this.data;
    const studentName = studentData.student_name || studentData.student.nickname;
    
    wx.navigateTo({
      url: `/pages/studentCards/studentCards?studentId=${studentId}&relationId=${relationId}&studentName=${encodeURIComponent(studentName)}`
    });
  },

  /**
   * 训练记录
   */
  handleTrainingRecordList() {
    const { studentId, studentData } = this.data;
    const userInfo = wx.getStorageSync('userInfo');
    const coachId = userInfo && userInfo.id ? userInfo.id : '';
    const studentName = studentData.student_name || (studentData.student && studentData.student.nickname) || '';
    wx.navigateTo({
      url: `/pages/trainingRecordList/trainingRecordList?studentId=${studentId}&coachId=${coachId}&studentName=${encodeURIComponent(studentName)}&isStudent=false`
    });
  },

  handleEdit() {
    const { relationId, studentId } = this.data;
    wx.navigateTo({
      url: `/pages/studentBasicProfile/studentBasicProfile?relationId=${relationId}&studentId=${studentId}`
    });
  },

  /**
   * 训练记录
   */
  handleTrainingRecordList() {
    const { studentId, studentData } = this.data;
    const userInfo = wx.getStorageSync('userInfo');
    const studentName = studentData.student_name || (studentData.student && studentData.student.nickname) || '';
    wx.navigateTo({
      url: `/pages/trainingRecordList/trainingRecordList?studentId=${studentId}&coachId=${userInfo.id}&studentName=${encodeURIComponent(studentName)}&isStudent=false`
    });
  },

  /**
   * 数据统计
   */
  handleDataStats() {
    const { studentId, studentData } = this.data;
    const studentName = studentData.student_name || (studentData.student && studentData.student.nickname) || '';
    wx.navigateTo({
      url: `/pages/dataStats/dataStats?studentId=${studentId}&studentName=${encodeURIComponent(studentName)}`
    });
  },

  /**
   * 常规课管理
   */
  handleRegularCourseManagement() {
    const { relationId, studentId } = this.data;
    
    wx.navigateTo({
      url: `/pages/regularCourseManagement/regularCourseManagement?relationId=${relationId}&studentId=${studentId}`
    });
  },

  /**
   * 训练计划
   */
  handlePlanManagement() {
    const { studentId, studentData } = this.data;
    const studentName = studentData.student_name || studentData.student.nickname;
    
    // 获取当前用户ID（教练ID）
    const userInfo = wx.getStorageSync('userInfo');
    const coachId = userInfo && userInfo.id ? userInfo.id : '';
    
    wx.navigateTo({
      url: `/pages/planList/planList?studentId=${studentId}&studentName=${encodeURIComponent(studentName)}&coachId=${coachId}`
    });
  },

  openPermissionTips(){
    wx.showModal({
      title: '提示',
      content: '需要联系学员开启/关闭。开启后，你主动预约该学员的课程不需要该学员二次确认。',
      showCancel: false,
      confirmText: '我知道了'
    })
  }

})