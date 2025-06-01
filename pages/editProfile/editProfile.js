/**
 * pages/editProfile/editProfile.js
 * 编辑个人资料页面
 */
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      phoneNumber: '',
      gender: 0 // 0:未知 1:男 2:女
    },
    genderText: '未设置',
    showGenderModal: false
  },

  /**
   * 获取性别文本
   */
  getGenderText(gender) {
    switch (gender) {
      case 1: return '男';
      case 2: return '女';
      default: return '未设置';
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserInfo();
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
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || this.data.userInfo;
    const genderText = this.getGenderText(userInfo.gender);
    this.setData({
      userInfo,
      genderText
    });
  },

  /**
   * 保存用户信息
   */
  saveUserInfo() {
    wx.setStorageSync('userInfo', this.data.userInfo);
    // 通知其他页面用户信息已更新
    wx.setStorageSync('userInfoUpdated', true);
  },

  /**
   * 选择头像
   */
  onChooseAvatar() {
    const self = this;
    wx.getUserProfile({
      desc: '用于完善个人资料',
      success: (res) => {
        const userInfo = {
          ...self.data.userInfo,
          avatarUrl: res.userInfo.avatarUrl,
          nickName: res.userInfo.nickName,
          gender: res.userInfo.gender || self.data.userInfo.gender
        };
        const genderText = self.getGenderText(userInfo.gender);
        self.setData({
          userInfo,
          genderText
        });
        self.saveUserInfo();
        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.log('获取用户信息失败：', err);
        wx.showToast({
          title: '获取失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 选择昵称
   */
  onChooseNickname() {
    const self = this;
    wx.getUserProfile({
      desc: '用于完善个人资料',
      success: (res) => {
        const userInfo = {
          ...self.data.userInfo,
          avatarUrl: res.userInfo.avatarUrl,
          nickName: res.userInfo.nickName,
          gender: res.userInfo.gender || self.data.userInfo.gender
        };
        const genderText = self.getGenderText(userInfo.gender);
        self.setData({
          userInfo,
          genderText
        });
        self.saveUserInfo();
        wx.showToast({
          title: '昵称更新成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.log('获取用户信息失败：', err);
        wx.showToast({
          title: '获取失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 获取手机号
   */
  onGetPhoneNumber(e) {
    console.log('获取手机号结果：', e.detail);
    if (e.detail.code) {
      // 这里需要发送到后端解密获取真实手机号
      // 暂时使用模拟数据
      const userInfo = {
        ...this.data.userInfo,
        phoneNumber: '138****8888' // 实际应从后端解密获取
      };
      this.setData({
        userInfo
      });
      this.saveUserInfo();
      wx.showToast({
        title: '手机号获取成功',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '获取手机号失败',
        icon: 'none'
      });
    }
  },

  /**
   * 选择性别
   */
  onChooseGender() {
    this.setData({
      showGenderModal: true
    });
  },

  /**
   * 关闭性别选择弹窗
   */
  onCloseGenderModal() {
    this.setData({
      showGenderModal: false
    });
  },

  /**
   * 选择性别选项
   */
  onSelectGender(e) {
    const gender = parseInt(e.currentTarget.dataset.gender);
    const userInfo = {
      ...this.data.userInfo,
      gender
    };
    const genderText = this.getGenderText(gender);
    this.setData({
      userInfo,
      genderText,
      showGenderModal: false
    });
    this.saveUserInfo();
    wx.showToast({
      title: '性别设置成功',
      icon: 'success'
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止点击模态框内容时关闭弹窗
  }
}) 