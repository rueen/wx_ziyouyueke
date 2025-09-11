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
    editableLessons: '', // 可编辑的课时数
    studentRemark: '',   // 学员备注
    isEditing: false,    // 是否处于编辑状态
    isSaving: false,     // 是否正在保存
    showUnbindModal: false, // 是否显示解除绑定确认弹窗
    isUnbinding: false   // 是否正在解除绑定
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.studentData) {
      try {
        const studentData = JSON.parse(decodeURIComponent(options.studentData));
        this.setData({
          studentData,
          editableLessons: studentData.remainingLessons.toString(),
          studentRemark: studentData.remark || ''
        });
      } catch (error) {
        console.error('解析学员数据失败：', error);
        wx.showToast({
          title: '数据加载失败',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /**
   * 开始编辑
   */
  onStartEdit() {
    this.setData({
      isEditing: true
    });
  },

  /**
   * 取消编辑
   */
  onCancelEdit() {
    const { studentData } = this.data;
    this.setData({
      isEditing: false,
      editableLessons: studentData.remainingLessons.toString(),
      studentRemark: studentData.remark || ''
    });
  },

  /**
   * 输入课时数
   */
  onLessonsInput(e) {
    this.setData({
      editableLessons: e.detail.value
    });
  },

  /**
   * 输入备注
   */
  onRemarkInput(e) {
    this.setData({
      studentRemark: e.detail.value
    });
  },

  /**
   * 保存修改
   */
  async onSave() {
    const { editableLessons, studentRemark, studentData, isSaving } = this.data;
    
    if (isSaving) {
      return; // 防止重复提交
    }
    
    const lessonsNum = parseInt(editableLessons);
    
    if (isNaN(lessonsNum) || lessonsNum < 0) {
      wx.showToast({
        title: '请输入正确的课时数',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({
        isSaving: true
      });

      wx.showLoading({
        title: '保存中...'
      });

      // 调用API更新师生关系
      const updateData = {
        remaining_lessons: lessonsNum,
        coach_remark: studentRemark.trim()
      };

      const result = await api.relation.update(studentData.id, updateData);
      
      wx.hideLoading();

      if (result && result.success) {
        // 更新本地数据
        const updatedStudentData = {
          ...studentData,
          remainingLessons: lessonsNum,
          remark: studentRemark.trim()
        };

        this.setData({
          studentData: updatedStudentData,
          isEditing: false,
          isSaving: false
        });

        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        });
      } else {
        throw new Error(result.message || '保存失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('保存师生关系失败:', error);
      
      this.setData({
        isSaving: false
      });

      const errorMessage = error.message || '保存失败，请重试';
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    }
  },

  /**
   * 约课
   */
  onBookStudent() {
    const { studentData } = this.data;
    wx.navigateTo({
      url: `/pages/bookCourse/bookCourse?type=coach-book-student&from=studentDetail&studentId=${studentData.studentId}&studentName=${encodeURIComponent(studentData.name)}`
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
    
    // 检查剩余课时数，如果大于0则不允许解除绑定
    if (studentData.remainingLessons > 0) {
      wx.showModal({
        title: '无法解除绑定',
        content: `该学员还有 ${studentData.remainingLessons} 节剩余课时，请先消耗完课时或将课时数修改为0后再解除绑定。`,
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

  // 查看课程记录
  handleViewCourseList() {
    const { studentData } = this.data;
    const student = {
      student_id: studentData.student_id,
      nickname: studentData.name
    }
    wx.navigateTo({
      url: `/pages/courseList/courseList?pageFrom=studentDetail&student=${JSON.stringify(student)}`
    });
  }

})