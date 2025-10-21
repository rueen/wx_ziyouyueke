// pages/groupCourseStudent/groupCourseStudent.js
const api = require('../../utils/api.js');
// 引入二维码生成工具
const drawQrcode = require('../../utils/weapp-qrcode/weapp.qrcode.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 0,
    tabs: [
      { status: 0, name: '进行中' },
      { status: 1, name: '已完成' }
    ],
    list: [],
    isLoading: false, // 加载状态
    hasMore: true, // 是否还有更多数据
    currentPage: 1, // 当前页码
    pageSize: 10, // 每页数量
    showQrcodeModal: false,
    qrCodeImagePath: '', // 二维码图片路径
    pollingTimer: null, // 轮询定时器
    pollingErrorCount: 0, // 轮询错误计数
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadData(true)
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
    // 页面隐藏时停止轮询
    this.stopPollingCourseStatus();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 页面卸载时停止轮询
    this.stopPollingCourseStatus();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadData(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (!this.data.isLoading && this.data.hasMore) {
      this.loadData(false)
    }
  },

  /**
   * 切换标签
   */
  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;

    this.setData({
      activeTab: tab.status
    },  () => {
      this.loadData(true)
    })
  },

  async loadData(isRefresh = false) {
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

      const { currentPage, pageSize, activeTab } = this.data;
      const params = {
        page: currentPage,
        limit: pageSize,
        status: activeTab
      }
      // 调用API获取团课列表
      const res = await api.groupCourse.getMyRegistrations(params)
      if(res.success && res.data && res.data.list){
        const list = res.data.list.map(_item => {
          const item = _item.groupCourse || {};
          return {
            ...item,
            image: item.cover_images && item.cover_images.length > 0 
              ? item.cover_images[0] 
              : '',
            date: this.formatDate(item.course_date),
            weekday: this.getWeekday(item.course_date),
            time: this.getTime(item),
            price: this.getCoursePrice(item),
            check_in_status: _item.check_in_status - 0,
            registrationId: _item.id
          }
        })
        this.setData({
          list: this.data.currentPage === 1 ? list : [...this.data.list, ...list],
          isLoading: false,
          hasMore: res.data.page < res.data.totalPages
        });
      }
    } catch (error) {
      this.setData({
        isLoading: false
      });

      // 显示具体的错误信息
      const errorMsg = error.message || '加载失败，请重试';
      wx.showToast({
        title: errorMsg,
        icon: 'none'
      });
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

  getTime(item) {
    const start_time = `${item.start_time.split(':')[0]}:${item.start_time.split(':')[1]}`;
    const end_time = `${item.end_time.split(':')[0]}:${item.end_time.split(':')[1]}`;
    return `${start_time} - ${end_time}`
  },

  /**
   * 获取课程价格显示
   */
  getCoursePrice(course) {
    switch (course.price_type) {
      case 1: // 扣课时
        return `${course.lesson_cost}课时`
      case 2: // 金额展示
        return `¥${course.price_amount}`
      case 3: // 免费
        return '免费'
      default:
        return '--'
    }
  },

  /**
   * 点击课程卡片
   */
  onCourseTap(e) {
    const { course } = e.currentTarget.dataset
    
    // 跳转到团课详情页
    wx.navigateTo({
      url: `/pages/groupCourseDetail/groupCourseDetail?courseId=${course.id}`
    })
  },
  onQrcodeModalClose() {
    // 停止轮询
    this.stopPollingCourseStatus();
    this.setData({
      showQrcodeModal: false,
      qrCodeImagePath: '' // 清除二维码图片路径
    })
  },
    /**
   * 停止轮询
   */
  stopPollingCourseStatus() {
    if (this.data.pollingTimer) {
      clearInterval(this.data.pollingTimer);
      this.setData({
        pollingTimer: null,
        pollingErrorCount: 0 // 重置错误计数
      });
    }
  },
  /**
   * 启动轮询检查课程状态
   */
  startPollingCourseStatus(registrationId) {
    // 清除之前的定时器
    if (this.data.pollingTimer) {
      clearInterval(this.data.pollingTimer);
    }
    
    // 每3秒检查一次课程状态
    const timer = setInterval(() => {
      this.checkCourseStatus(registrationId);
    }, 3000);
    
    this.setData({
      pollingTimer: timer,
      pollingErrorCount: 0 // 重置错误计数
    });
  },
  /**
   * 检查课程状态
   */
  async checkCourseStatus(registrationId) {
    try {
      const res = await api.groupCourse.getMyRegistrations({
        id: registrationId
      })
      
      if(res.success && res.data && res.data.list){
        const course = res.data.list[0] || {};
        const currentStatus = course.check_in_status;
        const originalItem = this.data.list.find(item => item.registrationId === registrationId);
        if (!originalItem) {
          console.warn('未找到对应的课程记录，停止轮询');
          this.stopPollingCourseStatus();
          return;
        }
        const originalStatus = originalItem.check_in_status;
        
        // 如果状态发生变化（特别是变为已完成），停止轮询并更新课程内容
        if (currentStatus !== originalStatus) {
          this.stopPollingCourseStatus();
          
          // 隐藏二维码弹窗
          this.setData({
            showQrcodeModal: false,
            qrCodeImagePath: ''
          });
          
          // 显示状态变化提示
          if (currentStatus === 1) {
            wx.showToast({
              title: '签到成功',
              icon: 'success'
            });
          }
          this.loadData(true)
        }
      }
    } catch (error) {
      console.error('检查课程状态失败:', error);
      // 连续失败3次后停止轮询
      if (!this.data.pollingErrorCount) {
        this.setData({ pollingErrorCount: 0 });
      }
      this.setData({ 
        pollingErrorCount: this.data.pollingErrorCount + 1 
      });
      
      if (this.data.pollingErrorCount >= 3) {
        console.warn('轮询连续失败3次，停止轮询');
        this.stopPollingCourseStatus();
        wx.showToast({
          title: '网络异常，请手动刷新',
          icon: 'none'
        });
      }
    }
  },
  handleCheckIn(e) {
    const { course } = e.currentTarget.dataset;
    const { registrationId } = course;

    this.setData({
      showQrcodeModal: true
    })
    // 生成二维码
    this.generateQRCode(registrationId.toString());
    this.startPollingCourseStatus(registrationId);
  },
  /**
   * 生成二维码
   * @param {string} courseId 课程ID
   */
  generateQRCode(text) {
    try {
      // 使用weapp-qrcode生成二维码
      drawQrcode({
        width: 150, // 使用像素单位，300rpx约等于150px
        height: 150,
        canvasId: 'qrcode-canvas',
        text,
        typeNumber: -1,
        correctLevel: 1, // L级别纠错
        background: '#ffffff',
        foreground: '#000000',
        _this: this,
        callback: (res) => {
          // 延迟一下再转换图片，确保绘制完成
          setTimeout(() => {
            this.canvasToTempFilePath();
          }, 100);
        }
      });
    } catch (error) {
      console.error('生成二维码失败:', error);
      wx.showToast({
        title: '生成二维码失败',
        icon: 'error'
      });
    }
  },

    /**
   * 将canvas转换为临时图片文件
   */
  canvasToTempFilePath() {
    wx.canvasToTempFilePath({
      x: 0,
      y: 0,
      width: 150,
      height: 150,
      destWidth: 300,
      destHeight: 300,
      canvasId: 'qrcode-canvas',
      success: (res) => {
        this.setData({
          qrCodeImagePath: res.tempFilePath
        });
      },
      fail: (error) => {
        console.error('转换二维码图片失败:', error);
        console.error('错误详情:', error);
        wx.showToast({
          title: '生成二维码图片失败',
          icon: 'error'
        });
      }
    }, this);
  },

})