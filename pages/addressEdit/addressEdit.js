/**
 * pages/addressEdit/addressEdit.js
 * 地址编辑页面
 */

const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isEdit: false, // 是否为编辑模式
    addressData: {
      id: null,
      name: '',
      address: '',
      latitude: null,
      longitude: null,
      is_default: false
    },
    isSubmitting: false, // 是否正在提交
    addressId: null, // 地址ID
    formData: {
      latitude: null,
      longitude: null,
      name: '',
      address: '',
      is_default: false
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取页面参数
    const { id, latitude, longitude, name, address } = options;
    
    if (id) {
      // 编辑模式
      this.setData({
        isEdit: true,
        addressId: parseInt(id)
      });
      this.loadAddressDetail();
    } else if (latitude && longitude) {
      // 新增模式，从地图选择位置
      this.setData({
        formData: {
          ...this.data.formData,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          name: decodeURIComponent(name || ''),
          address: decodeURIComponent(address || '')
        }
      });
    }
  },

  /**
   * 输入地址名称
   */
  onNameInput(e) {
    this.setData({
      'addressData.name': e.detail.value
    });
  },

  /**
   * 输入详细地址
   */
  onAddressInput(e) {
    this.setData({
      'addressData.address': e.detail.value
    });
  },

  /**
   * 切换默认地址状态
   */
  onDefaultToggle(e) {
    this.setData({
      'addressData.is_default': e.detail.value
    });
  },

  /**
   * 重新选择位置
   */
  onChooseLocation() {
    wx.chooseLocation({
      success: (locationRes) => {
        this.setData({
          'formData.latitude': locationRes.latitude,
          'formData.longitude': locationRes.longitude,
          'formData.name': locationRes.name,
          'formData.address': locationRes.address
        });
      },
      fail: (error) => {
        if (error.errMsg.includes('cancel')) {
          return; // 用户取消选择
        }
        
        wx.showToast({
          title: '获取位置失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 选择地图位置
   */
  onMapLocation() {
    wx.chooseLocation({
      success: (result) => {
        this.setData({
          'formData.latitude': result.latitude,
          'formData.longitude': result.longitude,
          'formData.name': result.name || '',
          'formData.address': result.address || ''
        });
      },
      fail: (error) => {
        if (error.errMsg.includes('cancel')) {
          return;
        }
        
        wx.showToast({
          title: '选择位置失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 保存地址
   */
  async onSave() {
    const { addressData, isEdit, isSubmitting } = this.data;

    if (isSubmitting) return;

    // 验证必填字段
    if (!addressData.name.trim()) {
      wx.showToast({
        title: '请输入地址名称',
        icon: 'none'
      });
      return;
    }

    if (!addressData.address.trim()) {
      wx.showToast({
        title: '请输入详细地址',
        icon: 'none'
      });
      return;
    }

    if (!addressData.latitude || !addressData.longitude) {
      wx.showToast({
        title: '请选择地址位置',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({
        isSubmitting: true
      });

      wx.showLoading({
        title: isEdit ? '更新中...' : '保存中...'
      });

      if (isEdit) {
        // 更新地址
        await api.address.update(addressData.id, {
          name: addressData.name.trim(),
          address: addressData.address.trim(),
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          is_default: addressData.is_default
        });
      } else {
        // 新增地址
        await api.address.create({
          name: addressData.name.trim(),
          address: addressData.address.trim(),
          latitude: addressData.latitude,
          longitude: addressData.longitude,
          is_default: addressData.is_default
        });
      }

      wx.hideLoading();

      wx.showToast({
        title: isEdit ? '更新成功' : '保存成功',
        icon: 'success'
      });

      // 设置刷新标记
      wx.setStorageSync('addressListNeedRefresh', true);

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      console.error('保存地址失败:', error);

      const errorMsg = error.message || (isEdit ? '更新失败，请重试' : '保存失败，请重试');
      wx.showToast({
        title: errorMsg,
        icon: 'none'
      });
    } finally {
      this.setData({
        isSubmitting: false
      });
    }
  },

  /**
   * 删除地址
   */
  async onDelete() {
    const { addressData, isSubmitting } = this.data;

    if (isSubmitting || !addressData.id) return;

    wx.showModal({
      title: '删除地址',
      content: `确定要删除"${addressData.name}"吗？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#ff3b30',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            this.setData({
              isSubmitting: true
            });

            wx.showLoading({
              title: '删除中...'
            });

            // 调用API删除地址
            await api.address.delete(addressData.id);

            wx.hideLoading();

            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });

            // 设置刷新标记
            wx.setStorageSync('addressListNeedRefresh', true);

            // 延迟返回上一页
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);

          } catch (error) {
            wx.hideLoading();
            console.error('删除地址失败:', error);

            const errorMsg = error.message || '删除失败，请重试';
            wx.showToast({
              title: errorMsg,
              icon: 'none'
            });
          } finally {
            this.setData({
              isSubmitting: false
            });
          }
        }
      }
    });
  },

  loadAddressDetail() {
    // Implementation of loadAddressDetail method
  }
}); 