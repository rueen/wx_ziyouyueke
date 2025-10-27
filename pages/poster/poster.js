// pages/poster/poster.js
const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {}
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserInfo();
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
    const storedUserInfo = wx.getStorageSync('userInfo');
    this.setData({
      userInfo: storedUserInfo || {}
    })
  },

  /**
   * 选择图片
   */
  onChooseImage() {
    const self = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];
        self.uploadImage(tempFilePath);
      }
    });
  },

  /**
   * 上传图片
   * @param {string} filePath 图片临时路径
   */
  async uploadImage(filePath) {
    wx.showLoading({
      title: '上传中...',
      mask: true
    });

    try {
      // 调用上传接口
      const uploadResult = await api.upload.poster(filePath);
      
      if (uploadResult.success && uploadResult.data && uploadResult.data.url) {
        // 构建更新数据
        const updateData = {
          poster_image: uploadResult.data.url
        };

        // 调用更新用户信息接口
        const updateResult = await api.user.updateProfile(updateData);
        
        if (updateResult.success) {
          // 更新本地缓存
          const storedUserInfo = wx.getStorageSync('userInfo');
          const updatedUserInfo = {
            ...storedUserInfo,
            poster_image: uploadResult.data.url
          };
          wx.setStorageSync('userInfo', updatedUserInfo);

          // 更新页面数据
          this.setData({
            userInfo: updatedUserInfo
          });

          wx.showToast({
            title: '上传成功',
            icon: 'success'
          });
        } else {
          throw new Error(updateResult.message || '更新用户信息失败');
        }
      } else {
        throw new Error('上传失败');
      }
    } catch (error) {
      console.error('上传图片失败:', error);
      wx.showToast({
        title: error.message || '上传失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 预览图片
   */
  onPreviewImage() {
    const { userInfo } = this.data;
    if (userInfo.poster_image) {
      wx.previewImage({
        urls: [userInfo.poster_image],
        current: userInfo.poster_image
      });
    }
  }
})