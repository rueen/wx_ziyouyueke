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
    studentName: '', // 学员姓名（教练备注姓名）
    studentRemark: '',   // 学员备注
    isEditing: false,    // 是否处于编辑状态
    isSaving: false,     // 是否正在保存
    showUnbindModal: false, // 是否显示解除绑定确认弹窗
    isUnbinding: false,   // 是否正在解除绑定
    lessons: [],
    bookingStatus: true
  },

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
   */
  onShow() {

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
        this.setData({
          studentData: studentData,
          lessons: studentData.lessons,
          studentName: studentData.student_name || studentData.student.nickname || '',
          studentRemark: studentData.coach_remark || '',
          bookingStatus: studentData.booking_status
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
      studentName: studentData.student_name || '',
      studentRemark: studentData.coach_remark || ''
    });
  },

  // 输入学员名称
  onStudentNameInput(e) {
    this.setData({
      studentName: e.detail.value
    });
  },

  /**
   * 输入课时数
   */
  onLessonsInput(e) {
    const { currentTarget: { dataset: { id } }, detail: { value } } = e;
    const lessons = [...this.data.lessons];
    lessons.map(item => {
      if(item.category_id === id) {
        item.remaining_lessons = parseInt(value);
      }
    })
    this.setData({
      lessons: lessons
    })
  },

  // 选择到期时间
  bindPickerChange(e) {
    const { currentTarget: { dataset: { id } }, detail: { value } } = e;
    const lessons = [...this.data.lessons];
    lessons.map(item => {
      if(item.category_id === id) {
        item.expire_date = value;
      }
    })
    this.setData({
      lessons: lessons
    })
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
    const { lessons, studentRemark, studentName, studentData, isSaving } = this.data;

    if (isSaving) {
      return; // 防止重复提交
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
        category_lessons: lessons.map(lesson => ({
          category_id: lesson.category_id,
          expire_date: lesson.expire_date,
          remaining_lessons: lesson.remaining_lessons
        })),
        student_name: studentName.trim(),
        coach_remark: studentRemark.trim()
      };

      const result = await api.relation.update(studentData.id, updateData);
      
      wx.hideLoading();

      if (result && result.success) {
        this.setData({
          isEditing: false,
          isSaving: false
        });

        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        });
        setTimeout(() => {
          this.loadStudentDetail();
        }, 1500)
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

  // 查看课程
  handleViewCourseList() {
    const { studentData } = this.data;
    const student = {
      student_id: studentData.student_id,
      nickname: studentData.student.nickname
    }
    wx.navigateTo({
      url: `/pages/courseList/courseList?pageFrom=studentDetail&student=${JSON.stringify(student)}`
    });
  }

})