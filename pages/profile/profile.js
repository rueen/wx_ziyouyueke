/**
 * pages/profile/profile.js
 * 我的页面逻辑
 */
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      nickname: '请设置昵称',
      avatar: '/images/defaultAvatar.png'
    },
    // 身份信息
    userRole: 'student', // 'student' 学员, 'coach' 教练
    roleNames: {
      student: '学员',
      coach: '教练'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserInfo();
    this.loadUserRole();
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
    this.loadUserInfo();
    this.loadUserRole();
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
   * 加载用户信息
   */
  loadUserInfo() {
    const storedUserInfo = wx.getStorageSync('userInfo');
    if (storedUserInfo && storedUserInfo.nickName) {
      this.setData({
        userInfo: {
          nickname: storedUserInfo.nickName,
          avatar: storedUserInfo.avatarUrl || '/images/defaultAvatar.png'
        }
      });
    } else {
      // 确保有默认值
      this.setData({
        userInfo: {
          nickname: '请设置昵称',
          avatar: '/images/defaultAvatar.png'
        }
      });
    }
  },

  /**
   * 加载用户身份
   */
  loadUserRole() {
    const storedRole = wx.getStorageSync('userRole') || 'student';
    this.setData({
      userRole: storedRole
    });
  },

  /**
   * 切换身份
   */
  onSwitchRole() {
    const { userRole, roleNames } = this.data;
    const targetRole = userRole === 'student' ? 'coach' : 'student';
    
    wx.showModal({
      title: '切换身份',
      content: `确定要切换到${roleNames[targetRole]}身份吗？`,
      success: (res) => {
        if (res.confirm) {
          // 保存新身份
          wx.setStorageSync('userRole', targetRole);
          this.setData({
            userRole: targetRole
          });
          
          wx.showToast({
            title: `已切换到${roleNames[targetRole]}身份`,
            icon: 'success'
          });

          // 通知其他页面更新
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

  /**
   * 编辑个人资料
   */
  onEditProfile() {
    wx.navigateTo({
      url: '/pages/editProfile/editProfile'
    })
  },

  /**
   * 我的教练/我的学员
   */
  onMyCoachesOrStudents() {
    const { userRole } = this.data;
    
    if (userRole === 'student') {
      // 学员身份：进入我的教练
      wx.navigateTo({
        url: '/pages/coachList/coachList'
      });
    } else {
      // 教练身份：进入我的学员
      wx.navigateTo({
        url: '/pages/studentList/studentList'
      });
    }
  },

  /**
   * 我的课程
   */
  onMyCourses() {
    wx.navigateTo({
      url: '/pages/courseList/courseList'
    })
  },

  /**
   * 我的可约时间（教练专用）
   */
  onMyAvailableTime() {
    wx.navigateTo({
      url: '/pages/availableTime/availableTime'
    });
  }
})