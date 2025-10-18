// pages/groupCoursesRegistrations/groupCoursesRegistrations.js
const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    courseId: null,
    list: [],
    price_type: 1,
    status: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { courseId, price_type, status } = options;
    if(courseId != null) {
      this.setData({
        courseId,
        price_type: price_type - 0,
        status: status - 0
      }, () => {
        this.loadList()
      })
    }
  },

    /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadList().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadList() {
    try {
      wx.showLoading({
        title: '加载中...'
      });
      const { courseId } = this.data;
      const res = await api.groupCourse.getRegistrations(courseId, {
        limit: 100
      })
      if(res.success && res.data && res.data.list) {
        this.setData({
          list: res.data.list || [],
          isLoading: false
        });
      }
      wx.hideLoading();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  handleCheckIn(e) {
    const { currentTarget: { dataset: { item } } } = e;

    wx.showModal({
      title: '',
      content: '确定签到吗？',
      complete: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '签到中...'
            });
            const { courseId } = this.data;
            const res = await api.groupCourse.checkIn(courseId, item.id);
            if(res.success) {
              wx.hideLoading();
            
              wx.showToast({
                title: '签到成功',
                icon: 'success'
              });
              this.loadList()
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '签到失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    })
  },

  async complete() {
    try {
      wx.showLoading({
        title: '处理中...'
      });
      const { courseId } = this.data;
      const res = await api.groupCourse.complete(courseId);
      if(res.success) {
        wx.hideLoading();
      
        wx.showToast({
          title: '操作成功',
          icon: 'success'
        });
        this.setData({
          status: 2
        })
        setTimeout(() => {
          this.loadList()
        }, 1500)
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '操作失败，请重试',
        icon: 'none'
      });
    }
  },
  handleComplete() {
    const { price_type, list } = this.data;
    let tips = '';
    const notCheckIn = list.filter(item => {item.check_in_status === 0});

    if(notCheckIn.length) {
      // 存在未签到的学员
      tips = `未签到的学员将被标记为缺课，${tips}`;
      if(price_type === 1) {
        tips = `并且不会扣除相应课时，${tips}`;
      }
    }

    wx.showModal({
      title: '',
      content: `${tips}确定完成团课吗？`,
      complete: async (res) => {
        if (res.confirm) {
          this.complete()
        }
      }
    })
  }
})