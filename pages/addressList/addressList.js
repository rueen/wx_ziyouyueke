/**
 * pages/addressList/addressList.js
 * 常用地址列表页面
 */

const API = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    addresses: [], // 地址列表
    isLoading: false, // 加载状态
    hasMore: true, // 是否还有更多数据
    page: 1, // 当前页码
    limit: 20, // 每页数量
    // 左滑相关
    touchStartX: 0, // 触摸开始X坐标
    touchStartY: 0, // 触摸开始Y坐标
    swipeThreshold: 60, // 左滑阈值
    actionWidth: 240 // 操作按钮总宽度 (2个按钮 * 120rpx)
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadAddresses();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 从添加地址页面返回时刷新列表
    const shouldRefresh = wx.getStorageSync('addressListNeedRefresh');
    if (shouldRefresh) {
      wx.removeStorageSync('addressListNeedRefresh');
      this.refreshAddresses();
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.refreshAddresses();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    this.loadMoreAddresses();
  },

  /**
   * 加载地址列表
   */
  async loadAddresses() {
    if (this.data.isLoading) return;

    try {
      this.setData({
        isLoading: true
      });

      // 调用API获取地址列表
      const result = await API.request({
        url: '/api/h5/addresses',
        method: 'GET',
        data: {
          page: this.data.page,
          limit: this.data.limit
        }
      });

      // 处理API返回的数据格式
      const addresses = result.data.addresses.map(item => ({
        id: item.id,
        name: item.name,
        address: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
        isDefault: item.is_default,
        createTime: item.created_at
      }));

      this.setData({
        addresses: this.data.page === 1 ? addresses : [...this.data.addresses, ...addresses],
        isLoading: false,
        hasMore: result.data.pagination.current_page < result.data.pagination.total_pages
      });

      console.log('加载地址列表成功:', addresses);

    } catch (error) {
      console.error('加载地址列表失败:', error);
      
      this.setData({
        isLoading: false
      });

      // 显示具体的错误信息
      const errorMsg = error.message || '加载失败，请重试';
      wx.showToast({
        title: errorMsg,
        icon: 'none'
      });
    }
  },

  /**
   * 刷新地址列表
   */
  async refreshAddresses() {
    this.setData({
      page: 1,
      hasMore: true,
      addresses: []
    });

    await this.loadAddresses();
    wx.stopPullDownRefresh();
  },

  /**
   * 加载更多地址
   */
  async loadMoreAddresses() {
    if (!this.data.hasMore || this.data.isLoading) return;

    this.setData({
      page: this.data.page + 1
    });

    await this.loadAddresses();
  },

  /**
   * 设置默认地址
   */
  async onSetDefault(e) {
    const { id } = e.currentTarget.dataset;
    const { addresses } = this.data;
    console.log('设置默认地址被点击:', id);

    // 先收起所有滑动项
    this.resetAllItems();

    try {
      wx.showLoading({
        title: '设置中...'
      });

      // 调用API设置默认地址
      await API.request({
        url: `/api/h5/addresses/${id}/default`,
        method: 'PUT'
      });

      // 更新本地数据
      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === id
      }));

      this.setData({
        addresses: updatedAddresses
      });

      wx.hideLoading();

      wx.showToast({
        title: '设置成功',
        icon: 'success'
      });

      console.log('设置默认地址成功:', id);

    } catch (error) {
      wx.hideLoading();
      console.error('设置默认地址失败:', error);

      const errorMsg = error.message || '设置失败，请重试';
      wx.showToast({
        title: errorMsg,
        icon: 'none'
      });
    }
  },

  /**
   * 触摸开始
   */
  onTouchStart(e) {
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.pageX,
      touchStartY: touch.pageY
    });
  },

  /**
   * 触摸移动
   */
  onTouchMove(e) {
    const touch = e.touches[0];
    const { touchStartX, touchStartY, swipeThreshold, actionWidth } = this.data;
    
    const deltaX = touchStartX - touch.pageX;
    const deltaY = Math.abs(touch.pageY - touchStartY);
    
    // 如果垂直滑动距离太大，不处理左滑
    if (deltaY > 50) return;
    
    const { id } = e.currentTarget.dataset;
    const { addresses } = this.data;
    
    // 计算滑动距离，限制在0到actionWidth之间
    let translateX = 0;
    if (deltaX > swipeThreshold) {
      translateX = Math.min(deltaX - swipeThreshold, actionWidth);
    }
    
    // 更新当前项的位移，重置其他项
    const updatedAddresses = addresses.map(item => ({
      ...item,
      translateX: item.id === id ? translateX : 0
    }));
    
    this.setData({
      addresses: updatedAddresses
    });
  },

  /**
   * 触摸结束
   */
  onTouchEnd(e) {
    const { id } = e.currentTarget.dataset;
    const { addresses, actionWidth } = this.data;
    
    const currentItem = addresses.find(item => item.id === id);
    if (!currentItem) return;
    
    // 根据滑动距离决定最终状态
    const finalTranslateX = currentItem.translateX > actionWidth / 2 ? actionWidth : 0;
    
    const updatedAddresses = addresses.map(item => ({
      ...item,
      translateX: item.id === id ? finalTranslateX : 0
    }));
    
    this.setData({
      addresses: updatedAddresses
    });
  },

  /**
   * 编辑地址
   */
  onEditAddress(e) {
    const { address } = e.currentTarget.dataset;
    
    // 先收起所有滑动的项
    this.resetAllItems();
    
    wx.navigateTo({
      url: `/pages/addressEdit/addressEdit?addressData=${encodeURIComponent(JSON.stringify(address))}`
    });
  },

  /**
   * 重置所有项的滑动状态
   */
  resetAllItems() {
    const { addresses } = this.data;
    const updatedAddresses = addresses.map(item => ({
      ...item,
      translateX: 0
    }));

    this.setData({
      addresses: updatedAddresses
    });
  },

  /**
   * 删除地址
   */
  onDeleteAddress(e) {
    const { id, name } = e.currentTarget.dataset;
    console.log('删除地址被点击:', id, name);

    // 先收起所有滑动项
    this.resetAllItems();

    wx.showModal({
      title: '删除地址',
      content: `确定要删除"${name}"吗？删除后无法恢复。`,
      confirmText: '删除',
      confirmColor: '#ff3b30',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '删除中...'
            });

            // 调用API删除地址
            await API.request({
              url: `/api/h5/addresses/${id}`,
              method: 'DELETE'
            });

            // 更新本地数据
            const { addresses } = this.data;
            const updatedAddresses = addresses.filter(addr => addr.id !== id);

            this.setData({
              addresses: updatedAddresses
            });

            wx.hideLoading();

            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });

            console.log('删除地址成功:', id);

          } catch (error) {
            wx.hideLoading();
            console.error('删除地址失败:', error);

            const errorMsg = error.message || '删除失败，请重试';
            wx.showToast({
              title: errorMsg,
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 新增地址
   */
  async onAddAddress() {
    try {
      // 首先检查位置权限
      const authResult = await wx.getSetting();
      
      if (!authResult.authSetting['scope.userLocation']) {
        // 如果没有位置权限，先申请权限
        try {
          await wx.authorize({
            scope: 'scope.userLocation'
          });
        } catch (authError) {
          // 用户拒绝授权，引导用户手动开启
          wx.showModal({
            title: '位置权限',
            content: '需要获取您的位置信息来选择地址，请在设置中开启位置权限',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
          return;
        }
      }

      // 显示加载提示
      wx.showLoading({
        title: '获取位置中...'
      });

      // 获取用户当前位置作为默认位置
      wx.getLocation({
        type: 'wgs84',
        success: (locationRes) => {
          wx.hideLoading();
          console.log('获取当前位置成功:', locationRes);
          
          // 使用用户当前位置调用选择位置API
          wx.chooseLocation({
            latitude: locationRes.latitude,
            longitude: locationRes.longitude,
            success: (result) => {
              console.log('选择的地点:', result);

              // 跳转到地址编辑页面，传递选择的地点信息
              const locationData = {
                name: result.name || '',
                address: result.address || '',
                latitude: result.latitude,
                longitude: result.longitude
              };

              wx.navigateTo({
                url: `/pages/addressEdit/addressEdit?locationData=${encodeURIComponent(JSON.stringify(locationData))}`
              });
            },
            fail: (error) => {
              console.error('选择地点失败:', error);
              
              if (error.errMsg && error.errMsg.includes('cancel')) {
                // 用户取消选择，不显示错误提示
                return;
              }
              
              let errorMsg = '获取位置失败';
              if (error.errMsg && error.errMsg.includes('auth')) {
                errorMsg = '位置权限被拒绝，请在设置中开启';
              }
              
              wx.showToast({
                title: errorMsg,
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
              console.log('选择的地点:', result);

              const locationData = {
                name: result.name || '',
                address: result.address || '',
                latitude: result.latitude,
                longitude: result.longitude
              };

              wx.navigateTo({
                url: `/pages/addressEdit/addressEdit?locationData=${encodeURIComponent(JSON.stringify(locationData))}`
              });
            },
            fail: (error) => {
              console.error('选择地点失败:', error);
              
              if (error.errMsg && error.errMsg.includes('cancel')) {
                return;
              }
              
              wx.showToast({
                title: '获取位置失败',
                icon: 'none'
              });
            }
          });
        }
      });
      
    } catch (error) {
      console.error('新增地址失败:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  }
}); 