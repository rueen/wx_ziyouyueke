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
    genderText: '未设置'
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
      
      // 准备更新数据
      const updateData = {
        nickname: userInfo.nickName,
        gender: userInfo.gender,
        intro: userInfo.intro || ''
      };

      // 如果有手机号，添加到更新数据中
      if (userInfo.phoneNumber) {
        updateData.phone = userInfo.phoneNumber;
      }

      // 如果头像是本地路径（新选择的），需要先上传
      if (userInfo.avatarUrl && userInfo.avatarUrl.startsWith('http://tmp/') || userInfo.avatarUrl.startsWith('wxfile://')) {
        try {
          // 上传头像文件
          const uploadResult = await this.uploadAvatar(userInfo.avatarUrl);
          if (uploadResult && uploadResult.avatar_url) {
            updateData.avatar_url = uploadResult.avatar_url;
          }
        } catch (uploadError) {
          console.error('头像上传失败:', uploadError);
          // 头像上传失败但不阻止其他信息保存
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
   * 压缩图片
   * @param {string} filePath 图片文件路径
   * @returns {Promise} 压缩结果
   */
  async compressImage(filePath) {
    return new Promise((resolve, reject) => {
      // 先获取文件信息
      wx.getFileInfo({
        filePath: filePath,
        success: (fileInfo) => {
          const fileSizeKB = Math.round(fileInfo.size / 1024);
          console.log(`原图大小: ${fileSizeKB}KB`);
          
          // 如果文件小于200KB，不进行压缩
          if (fileInfo.size < 200 * 1024) {
            console.log('文件较小，无需压缩');
            resolve({ tempFilePath: filePath });
            return;
          }
          
          // 根据文件大小动态调整压缩质量
          let quality = 70;
          if (fileInfo.size > 1024 * 1024) { // 大于1MB
            quality = 50;
          } else if (fileInfo.size > 512 * 1024) { // 大于512KB
            quality = 60;
          }
          
          console.log(`开始压缩，质量设置为: ${quality}`);
          
          wx.compressImage({
            src: filePath,
            quality: quality,
            success: (res) => {
              // 获取压缩后文件信息
              wx.getFileInfo({
                filePath: res.tempFilePath,
                success: (compressedInfo) => {
                  const compressedSizeKB = Math.round(compressedInfo.size / 1024);
                  const compressionRatio = ((fileInfo.size - compressedInfo.size) / fileInfo.size * 100).toFixed(1);
                  
                  console.log('图片压缩成功:', {
                    原图大小: `${fileSizeKB}KB`,
                    压缩后大小: `${compressedSizeKB}KB`,
                    压缩率: `${compressionRatio}%`,
                    压缩质量: quality
                  });
                  
                  resolve(res);
                },
                fail: () => {
                  // 获取压缩后文件信息失败，但压缩成功
                  console.log('图片压缩成功（未获取到压缩后文件信息）');
                  resolve(res);
                }
              });
            },
            fail: (error) => {
              console.error('图片压缩失败:', error);
              reject(error);
            }
          });
        },
        fail: (error) => {
          console.error('获取文件信息失败:', error);
          reject(error);
        }
      });
    });
  },

  /**
   * 上传头像
   */
  async uploadAvatar(filePath) {
    try {
      const result = await api.upload.image(filePath);
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
      
      // 压缩图片
      const compressedResult = await this.compressImage(avatarUrl);
      
      wx.hideLoading();
      
      const userInfo = {
        ...this.data.userInfo,
        avatarUrl: compressedResult.tempFilePath
      };
      this.setData({
        userInfo
      });
      
      // 只有真正压缩了才显示压缩成功提示
      if (compressedResult.tempFilePath !== avatarUrl) {
        wx.showToast({
          title: '图片已压缩',
          icon: 'success',
          duration: 1000
        });
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('图片处理失败:', error);
      
      // 处理失败时使用原图
      const userInfo = {
        ...this.data.userInfo,
        avatarUrl: avatarUrl
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
  async onGetPhoneNumber(e) {
    console.log('获取手机号结果：', e.detail);
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
            phoneNumber: result.data.phone,
            phoneCode: e.detail.code // 保存加密的手机号code备用
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
  }
}) 