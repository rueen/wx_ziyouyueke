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
    userRole: '', // 用户身份
    userInfo: {
      avatar_url: 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
      nickname: '',
      phone: '',
      gender: 0, // 0:未知 1:男 2:女
      intro: '',
      certification: '',
      motto: ''
    },
    genderText: '未设置',
    isShowPoster: false, // 是否显示宣传海报入口
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
    const appBaseInfo = wx.getAppBaseInfo()
    this.setData({
      isShowPoster: parseInt(appBaseInfo.SDKVersion.replace(/\./g, '')) >= 229
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    const userRole = wx.getStorageSync('userRole');
    this.setData({
      userRole: userRole
    });
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
          ...user,
          nickname: user.nickname || '未设置',
          gender: user.gender || 0,
          intro: user.intro || '',
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
      // 准备更新数据
      const updateData = {
        nickname: userInfo.nickname,
        gender: userInfo.gender,
        intro: userInfo.intro || '',
        certification: userInfo.certification || '',
        motto: userInfo.motto || '',
        is_show: userInfo.is_show
      };

      // 如果有手机号，添加到更新数据中
      if (userInfo.phone) {
        updateData.phone = userInfo.phone;
      }

      // 处理头像逻辑
      if (userInfo.avatar_url) {
        // 判断是否为本地临时文件（新选择的头像）
        const isLocalFile = userInfo.avatar_url.includes('tmp') || 
                           userInfo.avatar_url.startsWith('wxfile://') || 
                           userInfo.avatar_url.startsWith('http://tmp/') ||
                           userInfo.avatar_url.startsWith('store://');
        
        if (isLocalFile) {
          try {
            // 上传头像文件
            const uploadResult = await this.uploadAvatar(userInfo.avatar_url);
            if (uploadResult && uploadResult.url) {
              updateData.avatar_url = uploadResult.url;
            }
          } catch (uploadError) {
            console.error('头像上传失败:', uploadError);
            // 头像上传失败但不阻止其他信息保存
            wx.showToast({
              title: '头像上传失败，其他信息已保存',
              icon: 'none',
              duration: 2000
            });
          }
        } else {
          // 如果是网络URL（现有头像），直接传递
          updateData.avatar_url = userInfo.avatar_url;
        }
      }
      // 调用API更新用户信息
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

        // 保存成功后返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
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
   * 上传头像
   */
  async uploadAvatar(filePath) {
    try {
      const result = await api.upload.avatar(filePath);
      return result.data;
    } catch (error) {
      throw new Error(error.message || '上传失败');
    }
  },

  /**
   * 选择头像（使用新的chooseAvatar方式）
   */
  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    
    try {
      // 显示处理提示
      wx.showLoading({
        title: '处理图片中...'
      });
      
      const userInfo = {
        ...this.data.userInfo,
        avatar_url: avatarUrl
      };
      this.setData({
        userInfo
      });
      
      wx.hideLoading();
      
    } catch (error) {
      wx.hideLoading();
      console.error('图片处理失败:', error);
      
      // 处理失败时使用原图
      const userInfo = {
        ...this.data.userInfo,
        avatar_url: avatarUrl
      };
      this.setData({
        userInfo
      });
      
      wx.showToast({
        title: '图片处理失败，使用原图',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 昵称输入
   */
  onNicknameInput(e) {
    const userInfo = {
      ...this.data.userInfo,
      nickname: e.detail.value
    };
    this.setData({
      userInfo
    });
  },

  /**
   * 个人介绍输入
   */
  onInput(e) {
    const { target: { dataset: { type } } } = e;
    const userInfo = {
      ...this.data.userInfo,
      [type]: e.detail.value
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
    if (!this.data.userInfo.nickname || this.data.userInfo.nickname.trim() === '') {
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
  async onGetPhoneNumber(e) {
    if (e.detail.code) {
      try {
        wx.showLoading({
          title: '解密手机号中...'
        });

        // 调用后端API解密手机号
        const result = await api.user.decryptPhone(e.detail.code);
        
        wx.hideLoading();

        if (result && result.success && result.data && result.data.phone) {
          const userInfo = {
            ...this.data.userInfo,
            phone: result.data.phone
          };
          this.setData({
            userInfo
          });
        } else {
          throw new Error(result.message || '手机号解密失败');
        }
      } catch (error) {
        wx.hideLoading();
        console.error('解密手机号失败:', error);
        
        let errorMessage = '获取手机号失败，请重试';
        if (error.message) {
          errorMessage = error.message;
        }
        
        wx.showToast({
          title: errorMessage,
          icon: 'none'
        });
      }
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
    const self = this;
    wx.showActionSheet({
      itemList: ['男', '女'],
      success: function (res) {
        let gender;
        if (res.tapIndex === 0) {
          gender = 1; // 男
        } else if (res.tapIndex === 1) {
          gender = 2; // 女
        }
        
        const userInfo = {
          ...self.data.userInfo,
          gender
        };
        const genderText = self.getGenderText(gender);
        self.setData({
          userInfo,
          genderText
        });
      },
      fail: function (res) {
        console.log('用户取消选择');
      }
    });
  },

  // 是否在教练大厅展示
  isShowSwitchChange(e) {
    const userInfo = {
      ...this.data.userInfo,
      is_show: e.detail.value - 0
    };
    this.setData({
      userInfo
    });
  },

  // 打开海报宣传页
  openPoster() {
    wx.navigateTo({
      url: '/pages/poster/poster'
    });
  },

  openBindPage() {
    const { userInfo } = this.data;
    wx.navigateTo({
      url: `/pages/bindCoach/bindCoach?coachId=${userInfo.id}`
    });
  }

}) 