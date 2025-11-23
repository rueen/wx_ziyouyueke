/**
 * pages/donation/donation.js
 * 友情赞助页面
 */

const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 固定金额选项
    fixedAmounts: [
      { id: 1, name: '一份心意', icon: 'icon-aixin', amount: 9.9 },
      { id: 2, name: '一杯咖啡', icon: 'icon-coffee', amount: 19.9 },
      { id: 3, name: '一份下午茶', icon: 'icon-xiawucha', amount: 29.9 },
      { id: 4, name: '一份鼓励', icon: 'icon-guzhang', amount: 49.9 }
    ],
    
    // 选中的金额ID
    selectedAmountId: null,
    
    // 自定义金额
    customAmount: '',
    isCustom: false,
    
    // 留言
    message: '',
    
    // 是否匿名
    isAnonymous: false,
    
    // 提交状态
    isSubmitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 选择固定金额
   */
  onSelectAmount(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({
      selectedAmountId: id,
      isCustom: false,
      customAmount: ''
    });
  },

  /**
   * 切换自定义金额模式
   */
  onToggleCustom() {
    this.setData({
      isCustom: !this.data.isCustom,
      selectedAmountId: null
    });
  },

  /**
   * 输入自定义金额
   */
  onCustomAmountInput(e) {
    let value = e.detail.value;
    // 只允许数字和小数点
    value = value.replace(/[^\d.]/g, '');
    // 只保留第一个小数点
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    // 小数点后最多两位
    if (parts.length === 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    this.setData({
      customAmount: value
    });
  },

  /**
   * 输入留言
   */
  onMessageInput(e) {
    this.setData({
      message: e.detail.value
    });
  },

  /**
   * 切换匿名状态
   */
  onToggleAnonymous() {
    this.setData({
      isAnonymous: !this.data.isAnonymous
    });
  },

  /**
   * 提交赞助
   */
  async onSubmit() {
    if (this.data.isSubmitting) {
      return;
    }

    // 获取金额
    let amount = 0;
    if (this.data.isCustom) {
      // 自定义金额
      const customAmount = parseFloat(this.data.customAmount);
      if (!customAmount || isNaN(customAmount)) {
        wx.showToast({
          title: '请输入赞助金额',
          icon: 'none'
        });
        return;
      }
      if (customAmount < 1 || customAmount > 500) {
        wx.showToast({
          title: '金额范围：1-500元',
          icon: 'none'
        });
        return;
      }
      amount = Math.round(customAmount * 100); // 转换为分
    } else {
      // 固定金额
      if (!this.data.selectedAmountId) {
        wx.showToast({
          title: '请选择赞助金额',
          icon: 'none'
        });
        return;
      }
      const selected = this.data.fixedAmounts.find(item => item.id === this.data.selectedAmountId);
      amount = Math.round(selected.amount * 100); // 转换为分
    }

    this.setData({
      isSubmitting: true
    });

    try {
      wx.showLoading({
        title: '处理中...'
      });

      // 创建赞助订单
      const result = await api.donation.create({
        amount: amount,
        message: this.data.message.trim(),
        is_anonymous: this.data.isAnonymous ? 1 : 0
      });

      if (!result || !result.data) {
        throw new Error('创建订单失败：返回数据为空');
      }

      // 根据 API 文档，支付参数在 result.data 中
      const paymentData = result.data;

      // 验证必要参数
      if (!paymentData.timeStamp || !paymentData.nonceStr || !paymentData.package || !paymentData.signType || !paymentData.paySign) {
        throw new Error('支付参数不完整，请重试');
      }

      // 发起微信支付（所有参数必须为字符串类型）
      await wx.requestPayment({
        timeStamp: String(paymentData.timeStamp),
        nonceStr: String(paymentData.nonceStr),
        package: String(paymentData.package),
        signType: String(paymentData.signType),
        paySign: String(paymentData.paySign)
      });

      // 支付成功
      wx.hideLoading();
      wx.showToast({
        title: '感谢您的支持！',
        icon: 'success',
        duration: 2000
      });

      // 延迟跳转
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);

    } catch (error) {
      wx.hideLoading();
      
      // 用户取消支付，静默处理
      if (error.errMsg && error.errMsg.includes('cancel')) {
        return;
      }

      // 其他错误
      wx.showToast({
        title: error.message || '赞助失败，请重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({
        isSubmitting: false
      });
    }
  },

  /**
   * 查看赞助墙
   */
  onViewDonationList() {
    wx.navigateTo({
      url: '/pages/donationList/donationList'
    });
  },

  /**
   * 查看我的赞助记录
   */
  onViewMyDonations() {
    wx.navigateTo({
      url: '/pages/myDonations/myDonations'
    });
  }
});

