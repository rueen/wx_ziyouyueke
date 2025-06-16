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
    isSubmitting: false // 是否正在提交
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    // 检查是否为编辑模式
    if (options.addressData) {
      try {
        const addressData = JSON.parse(decodeURIComponent(options.addressData));
        this.setData({
          isEdit: true,
          addressData: {
            id: addressData.id,
            name: addressData.name,
            address: addressData.address,
            latitude: addressData.latitude,
            longitude: addressData.longitude,
            is_default: addressData.isDefault
          }
        });
        
        // 设置导航栏标题
        wx.setNavigationBarTitle({
          title: '编辑地址'
        });
      } catch (error) {
        console.error('解析地址数据失败:', error);
        wx.showToast({
          title: '数据解析失败',
          icon: 'none'
        });
      }
    } else if (options.locationData) {
      // 新增模式，从位置选择器传来的数据
      try {
        const locationData = JSON.parse(decodeURIComponent(options.locationData));
        this.setData({
          isEdit: false,
          addressData: {
            id: null,
            name: locationData.name,
            address: locationData.address,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            is_default: false
          }
        });
        
        // 设置导航栏标题
        wx.setNavigationBarTitle({
          title: '新增地址'
        });
      } catch (error) {
        console.error('解析位置数据失败:', error);
        wx.showToast({
          title: '数据解析失败',
          icon: 'none'
        });
      }
    } else {
      // 新增模式，无预设数据
      wx.setNavigationBarTitle({
        title: '新增地址'
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
  async onChooseLocation() {
    try {
      // 显示加载提示
      wx.showLoading({
        title: '获取位置中...'
      });

      // 获取用户当前位置作为默认位置
      wx.getLocation({
        type: 'wgs84',
        success: (locationRes) => {
          wx.hideLoading();
          
          // 使用用户当前位置调用选择位置API
          wx.chooseLocation({
            latitude: locationRes.latitude,
            longitude: locationRes.longitude,
            success: (result) => {

              // 更新地址信息
              this.setData({
                'addressData.name': result.name || this.data.addressData.name,
                'addressData.address': result.address,
                'addressData.latitude': result.latitude,
                'addressData.longitude': result.longitude
              });
            },
            fail: (error) => {
              console.error('选择地点失败:', error);
              
              if (error.errMsg && error.errMsg.includes('cancel')) {
                return;
              }
              
              wx.showToast({
                title: '选择位置失败',
                icon: 'none'
              });
            }
          });
        },
        fail: (locationError) => {
          wx.hideLoading();
          console.error('获取当前位置失败:', locationError);
          
          // 如果获取当前位置失败，使用杭州市作为默认位置
          wx.chooseLocation({
            latitude: 30.2741,
            longitude: 120.1551,
            success: (result) => {

              this.setData({
                'addressData.name': result.name || this.data.addressData.name,
                'addressData.address': result.address,
                'addressData.latitude': result.latitude,
                'addressData.longitude': result.longitude
              });
            },
            fail: (error) => {
              console.error('选择地点失败:', error);
              
              if (error.errMsg && error.errMsg.includes('cancel')) {
                return;
              }
              
              wx.showToast({
                title: '选择位置失败',
                icon: 'none'
              });
            }
          });
        }
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('选择位置失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
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
  }
}); 