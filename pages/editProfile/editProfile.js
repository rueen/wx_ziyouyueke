/**
 * pages/editProfile/editProfile.js
 * 编辑个人资料页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

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
    // 编辑页面每次显示时都需要加载最新数据，不做优化
    // 因为用户可能在其他地方修改了信息
    this.loadUserInfo();
  },

  /**
   * 加载用户信息
   */
  async loadUserInfo() {
    try {
      // 从API获取最新用户信息
      const result = await api.user.getProfile();
      if (result && result.data) {
        const user = result.data;
        const userInfo = {
          avatarUrl: user.avatar_url || '/images/defaultAvatar.png',
          nickName: user.nickname || '未设置',
          phoneNumber: user.phone || '',
          gender: user.gender || 0,
          intro: user.intro || ''
        };
        const genderText = this.getGenderText(userInfo.gender);
        this.setData({
          userInfo,
          genderText
        });
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      // API调用失败时使用本地缓存
      const userInfo = wx.getStorageSync('userInfo') || this.data.userInfo;
      const genderText = this.getGenderText(userInfo.gender);
      this.setData({
        userInfo,
        genderText
      });
    }
  },

  /**
   * 保存用户信息到后端
   */
  async saveUserInfo() {
    try {
      wx.showLoading({
        title: '保存中...'
      });

      const { userInfo } = this.data;
      
      // 调用API更新用户信息
      const updateData = {
        nickname: userInfo.nickName,
        phone: userInfo.phoneNumber,
        gender: userInfo.gender,
        intro: userInfo.intro || ''
      };
      
      const result = await api.user.updateProfile(updateData);
      
      wx.hideLoading();
      
      if (result && result.data) {
        // 更新本地缓存
        wx.setStorageSync('userInfo', result.data);
        // 通知其他页面用户信息已更新
        wx.setStorageSync('userInfoUpdated', true);
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('保存用户信息失败:', error);
      
      let errorMessage = '保存失败，请重试';
      if (error.message) {
        errorMessage = error.message;
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none'
      });
    }
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
   * 昵称输入
   */
  onNicknameInput(e) {
    const userInfo = {
      ...this.data.userInfo,
      nickName: e.detail.value
    };
    this.setData({
      userInfo
    });
  },

  /**
   * 个人介绍输入
   */
  onIntroInput(e) {
    const userInfo = {
      ...this.data.userInfo,
      intro: e.detail.value
    };
    this.setData({
      userInfo
    });
  },

  /**
   * 保存修改
   */
  onSave() {
    // 验证必填项
    if (!this.data.userInfo.nickName || this.data.userInfo.nickName.trim() === '') {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    this.saveUserInfo();
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
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止点击模态框内容时关闭弹窗
  }
}) 