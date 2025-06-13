/**
 * pages/addressList/addressList.js
 * 常用地址列表页面
 */

Page({
  /**
   * 页面的初始数据
   */
  data: {
    addresses: [], // 地址列表
    isLoading: false, // 加载状态
    hasMore: true, // 是否还有更多数据
    page: 1, // 当前页码
    limit: 20 // 每页数量
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

      // 暂时使用假数据，等API开发完成后替换
      const mockAddresses = [
        {
          id: 1,
          name: '万达广场健身房',
          address: '北京市朝阳区建国路93号万达广场B1层',
          latitude: 39.9042,
          longitude: 116.4074,
          isDefault: true,
          createTime: '2024-01-15 10:30:00'
        },
        {
          id: 2,
          name: '中心广场健身房',
          address: '北京市海淀区中关村大街1号中心广场3层',
          latitude: 39.9826,
          longitude: 116.3066,
          isDefault: false,
          createTime: '2024-01-10 14:20:00'
        },
        {
          id: 3,
          name: '舞蹈工作室',
          address: '北京市西城区西单北大街120号舞蹈工作室',
          latitude: 39.9139,
          longitude: 116.3831,
          isDefault: false,
          createTime: '2024-01-08 16:45:00'
        },
        {
          id: 4,
          name: '体育馆',
          address: '北京市东城区体育馆路9号国家体育馆',
          latitude: 39.9289,
          longitude: 116.3883,
          isDefault: false,
          createTime: '2024-01-05 09:15:00'
        }
      ];

      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      this.setData({
        addresses: mockAddresses,
        isLoading: false,
        hasMore: false // 假数据没有更多页
      });

      console.log('加载地址列表成功:', mockAddresses);

    } catch (error) {
      console.error('加载地址列表失败:', error);
      
      this.setData({
        isLoading: false
      });

      wx.showToast({
        title: '加载失败，请重试',
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

    // 暂时不实现分页，等API开发完成后添加
    console.log('暂无更多数据');
  },

  /**
   * 设置默认地址
   */
  async onSetDefault(e) {
    const { id } = e.currentTarget.dataset;
    const { addresses } = this.data;

    try {
      wx.showLoading({
        title: '设置中...'
      });

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 800));

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

      wx.showToast({
        title: '设置失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 编辑地址
   */
  onEditAddress(e) {
    const { address } = e.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/addressEdit/addressEdit?addressData=${encodeURIComponent(JSON.stringify(address))}`
    });
  },

  /**
   * 删除地址
   */
  onDeleteAddress(e) {
    const { id, name } = e.currentTarget.dataset;

    wx.showModal({
      title: '删除地址',
      content: `确定要删除"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '删除中...'
            });

            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 500));

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

            wx.showToast({
              title: '删除失败，请重试',
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
      // 调用微信小程序地点选择API
      const result = await wx.chooseLocation({
        latitude: 39.9042, // 默认位置（北京）
        longitude: 116.4074
      });

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

    } catch (error) {
      console.error('选择地点失败:', error);
      
      if (error.errMsg && error.errMsg.includes('cancel')) {
        // 用户取消选择
        return;
      }

      wx.showToast({
        title: '获取位置失败',
        icon: 'none'
      });
    }
  }
}); 