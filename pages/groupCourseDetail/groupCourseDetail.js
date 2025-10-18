// pages/groupCourseDetail/groupCourseDetail.js
const api = require('../../utils/api.js')
const { navigateToLoginWithRedirect } = require('../../utils/util.js')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    courseId: null,
    coachId: null,
    courseDetail: null,
    isRegistered: false,
    loginType: 'guest',
    mode: 'view', // view-查看，preview-预览
    isOwner: false, // 是否为课程创建者
    canEdit: false, // 是否可以编辑
    canPublish: false, // 是否可以发布
    showRegistrationModal: false // 是否显示报名人员弹窗
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('团课详情页面参数:', options)
    
    if (options.courseId) {
      this.setData({
        courseId: parseInt(options.courseId),
        mode: options.mode || 'view'
      })
      this.loadCourseDetail()
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 获取用户角色和登录状态
    this.loadUserInfo()
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    const loginType = wx.getStorageSync('loginType') || 'guest'

    this.setData({
      loginType: loginType,
    })
  },

  /**
   * 加载团课详情
   */
  loadCourseDetail() {
    const { courseId } = this.data
    
    wx.showLoading({
      title: '加载中...'
    })

    api.groupCourse.getDetail(courseId)
      .then(res => {
        if (res.success && res.data) {
          const course = {
            ...res.data,
            showTime: this.getshowTime(res.data)
          };
          
          // 检查是否已报名
          let isRegistered = false
          if (course.registrations && course.registrations.length > 0) {
            const userInfo = wx.getStorageSync('userInfo')
            if (userInfo && userInfo.id) {
              isRegistered = course.registrations.some(reg => 
                reg.student && reg.student.id === userInfo.id
              )
            }
          }
          
          // 检查权限
          const userInfo = wx.getStorageSync('userInfo')
          const isOwner = userInfo && userInfo.id === course.coach_id
          const canEdit = isOwner && this.canEditCourse(course)
          const canPublish = isOwner && !course.status
          
          this.setData({
            courseDetail: course,
            isRegistered: isRegistered,
            isOwner: isOwner,
            canEdit: canEdit,
            canPublish: canPublish,
            coachId: course.coach_id
          })
        }
      })
      .catch(err => {
        console.error('加载团课详情失败:', err)
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  // 打开团课
  onGroupCourses() {
    const { coachId } = this.data;
    wx.navigateTo({
      url: `/pages/groupCourses/groupCourses?coachId=${coachId}`
    })
  },
  
  /**
   * 报名团课
   */
  onRegisterTap() {
    const { courseDetail, loginType } = this.data

    // 检查登录状态
    if (loginType === 'guest') {
      navigateToLoginWithRedirect({
        message: '请先登录后再报名',
        redirectParams: {
          isFixedRole: true,
          selectedRole: 'student',
          courseId: this.data.courseId
        }
      });
      return
    }
    
    // 检查报名条件
    if (courseDetail.current_participants >= courseDetail.max_participants) {
      wx.showToast({
        title: '课程已满员',
        icon: 'error'
      })
      return
    }
    
    wx.showModal({
      title: '确认报名',
      content: `确定要报名"${courseDetail.title}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '报名中...'
            });
            const { courseId } = this.data
            const res = await api.groupCourse.register(courseId);
            if(res.success) {
              wx.hideLoading();
              wx.showToast({
                title: '报名成功',
                icon: 'success'
              })
              setTimeout(() => {
                // 重新加载详情
                this.loadCourseDetail()
              }, 1500)
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '报名失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  /**
   * 取消报名
   */
  onUnregisterTap() {
    wx.showModal({
      title: '取消报名',
      content: '确定要取消报名吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '取消中...'
            });
            const { courseId } = this.data
            const res = await api.groupCourse.unregister(courseId);
            if(res.success) {
              wx.hideLoading();
              wx.showToast({
                title: '取消成功',
                icon: 'success'
              })
              setTimeout(() => {
                // 重新加载详情
                this.loadCourseDetail()
              }, 1500)
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '取消失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  /**
   * 显示报名人员弹窗
   */
  onShowRegistrationModal() {
    this.setData({
      showRegistrationModal: true
    })
  },

  /**
   * 隐藏报名人员弹窗
   */
  onHideRegistrationModal() {
    this.setData({
      showRegistrationModal: false
    })
  },

  /**
   * 查看地址详情
   */
  onAddressTap() {
    const { courseDetail } = this.data
    
    if (courseDetail.address) {
      // 这里可以跳转到地图页面或地址详情页
      wx.showModal({
        title: courseDetail.address.name,
        content: courseDetail.address.address,
        showCancel: false
      })
    }
  },

  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${month}.${day}`
  },

  /**
   * 获取星期几
   */
  getWeekday(dateStr) {
    if (!dateStr) return ''
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const date = new Date(dateStr)
    return weekdays[date.getDay()]
  },

  getTime(courseDetail) {
    const start_time = `${courseDetail.start_time.split(':')[0]}:${courseDetail.start_time.split(':')[1]}`;
    const end_time = `${courseDetail.end_time.split(':')[0]}:${courseDetail.end_time.split(':')[1]}`;
    return `${start_time} - ${end_time}`
  },

  getshowTime(courseDetail) {
    return `${this.formatDate(courseDetail.course_date)} ${this.getWeekday(courseDetail.course_date)} ${this.getTime(courseDetail)}`
  },

  /**
   * 获取价格显示文本
   */
  getPriceText(course) {
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
   * 格式化报名时间
   */
  formatRegistrationTime(dateStr) {
    if (!dateStr) return ''
    
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    
    // 小于1分钟
    if (diff < 60 * 1000) {
      return '刚刚'
    }
    
    // 小于1小时
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000))
      return `${minutes}分钟前`
    }
    
    // 小于1天
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours}小时前`
    }
    
    // 小于7天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))
      return `${days}天前`
    }
    
    // 超过7天显示具体日期
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${month}-${day}`
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { current, urls } = e.currentTarget.dataset
    
    wx.previewImage({
      current: current,
      urls: urls
    })
  },

  /**
   * 判断是否可以编辑课程
   */
  canEditCourse(course) {
    // 已取消或人数不足取消的课程不能编辑
    if (course.status === 4 || course.status === 5) {
      return false
    }
    
    // 已开始的课程不能编辑开始时间
    if (course.status === 2 || course.status === 3) {
      return false
    }
    
    // 课程开始时间已过不能编辑
    const now = new Date()
    const courseStart = new Date(`${course.course_date}T${course.start_time}`)
    if (courseStart <= now) {
      return false
    }
    
    return true
  },

  /**
   * 编辑课程
   */
  onEditCourse() {
    const { courseId } = this.data
    
    wx.navigateTo({
      url: `/pages/addGroupCourse/addGroupCourse?id=${courseId}&mode=edit`
    })
  },

  /**
   * 发布课程
   */
  onPublishCourse() {
    wx.showModal({
      title: '确认发布',
      content: '发布后课程将对所有用户可见，确定要发布吗？',
      success: async (res) => {
        if (res.confirm) {
          const { courseId } = this.data;
          try {
            wx.showLoading({
              title: '发布中...'
            });
            const res = await api.groupCourse.publish(courseId)
            if(res.success) {
              wx.hideLoading();
            
              wx.showToast({
                title: '发布成功',
                icon: 'success'
              });
              // 返回团课列表页
              setTimeout(() => {
                wx.navigateBack({
                  delta: 2
                })
              }, 1500)
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: '发布失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    })
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { courseDetail } = this.data
    
    return {
      title: courseDetail ? courseDetail.title : '团课详情',
      imageUrl: courseDetail.cover_images[0] || courseDetail.images[0],
      path: `/pages/groupCourseDetail/groupCourseDetail?courseId=${this.data.courseId}`
    }
  }
})
