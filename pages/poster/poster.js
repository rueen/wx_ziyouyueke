// pages/poster/poster.js
const api = require('../../utils/api.js');
const posterUtil = require('../../utils/poster.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {},
    qrcode: null
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
    storedUserInfo.poster_image = storedUserInfo.poster_image || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/poster/default_poster.png';
    this.setData({
      userInfo: storedUserInfo || {}
    }, () => {
      this.generateQRCode();
    })
  },

   /**
   * 生成二维码
   */
  async generateQRCode() {
    const { userInfo } = this.data;
    
    const qrcodeBase64 = await posterUtil.generateQRCode({
      scene: `coachId=${userInfo.id}`,
      page: 'pages/bindCoach/bindCoach'
    });
    // 保存为临时文件
    const filePath = await posterUtil.saveBase64ToFile(qrcodeBase64, 'qrcode.png');
    this.setData({
      qrcode: filePath
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

  handleDownLoad(e){
    const { currentTarget: { dataset: {id} } } = e;

    wx.showLoading({
      title: '下载中...',
      mask: true
    });
    this.createSelectorQuery().select(`#${id}`)
      .node().exec(res => {
        const node = res[0].node
        node.takeSnapshot({
          type: 'file',
          format: 'png',
          success: (res) => {
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              complete(res) {
                wx.showToast({
                  title: '保存成功'
                })
              }
            })
          },
          fail(res) {
            wx.hideLoading();
            console.log("takeSnapshot fail:", res)
          }
        })
      })
  }

})