/**
 * components/phoneVerify/phoneVerify.js
 * 手机号验证组件
 * 用法：将需要验证手机号的按钮或内容放入 slot 中
 * 组件会自动判断用户是否有手机号，如果没有则先获取手机号再执行操作
 */

const api = require('../../utils/api.js');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    isNeedLogin: false,
    hasPhone: false, // 用户是否已有手机号
    isLoading: false, // 是否正在加载
    userInfo: null
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.onShow();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    onShow() {
      this.setData({
        isNeedLogin: false
      })
      // 检查登录状态
      const loginType = wx.getStorageSync('loginType');
      const isLoggedIn = wx.getStorageSync('isLoggedIn');

      // 如果未登录或是游客模式，跳转到登录页面
      if (!isLoggedIn || loginType === 'guest') {
        this.setData({
          isNeedLogin: true
        })
        return;
      }
      this.checkUserPhone();
    },
    /**
     * 检查用户是否已有手机号
     */
    async checkUserPhone() {
      try {
        // 先从缓存获取用户信息
        let userInfo = wx.getStorageSync('userInfo');
        
        // 如果缓存中没有，或者缓存中没有phone字段，则从接口获取
        if (!userInfo || userInfo.phone === undefined) {
          const result = await api.user.getProfile();
          if (result && result.success && result.data) {
            userInfo = result.data;
            // 更新缓存
            wx.setStorageSync('userInfo', userInfo);
          }
        }
        
        // 判断是否有手机号
        const hasPhone = !!(userInfo && userInfo.phone);
        
        this.setData({
          hasPhone: hasPhone,
          userInfo: userInfo
        });
        
      } catch (error) {
        console.error('检查用户手机号失败:', error);
        // 出错时默认认为没有手机号
        this.setData({
          hasPhone: false
        });
      }
    },

    /**
     * 用户已有手机号时的点击事件
     */
    onVerifiedClick() {
      if (this.properties.disabled) {
        return;
      }
      if(this.data.isNeedLogin){
        this.triggerEvent('needLogin', {
          message: '请先登录后再进行操作'
        });
        return;
      }
      
      // 触发验证通过事件，让父组件执行业务逻辑
      this.triggerEvent('verified', {
        userInfo: this.data.userInfo
      });
    },

    /**
     * 获取手机号按钮点击事件
     */
    async onGetPhoneNumber(e) {
      if (this.properties.disabled) {
        return;
      }
      
      if (e.detail.code) {
        try {
          wx.showLoading({
            title: '解密手机号中...'
          });

          // 调用后端API解密手机号
          const result = await api.user.decryptPhone(e.detail.code);
          
          wx.hideLoading();

          if (result && result.success && result.data && result.data.phone) {
            // 更新用户信息，添加手机号
            const userInfo = {
              ...this.data.userInfo,
              phone: result.data.phone
            };
            
            // 更新本地缓存
            wx.setStorageSync('userInfo', userInfo);
            
            // 更新组件状态
            this.setData({
              hasPhone: true,
              userInfo: userInfo,
              isLoading: false
            });
            
            wx.showToast({
              title: '手机号获取成功',
              icon: 'success'
            });
            
            // 触发验证通过事件
            setTimeout(() => {
              this.triggerEvent('verified', {
                userInfo: userInfo
              });
            }, 500);
            
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
          title: '需要手机号才能继续',
          icon: 'none'
        });
      }
    },

    /**
     * 刷新用户信息
     */
    async refresh() {
      await this.checkUserPhone();
    }
  }
});
