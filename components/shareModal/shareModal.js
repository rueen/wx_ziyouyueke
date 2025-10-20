/**
 * 分享弹窗组件
 */
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示弹窗
    show: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    shareOptions: [
      { id: 'friend', name: '发送好友', icon: 'icon-wechat' },
      { id: 'poster', name: '生成海报', icon: 'icon-image' },
      { id: 'qrcode', name: '生成二维码', icon: 'icon-qrcode' },
      { id: 'link', name: '复制链接', icon: 'icon-link' }
    ]
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 点击遮罩层关闭
     */
    onMaskTap() {
      this.close();
    },

    /**
     * 关闭弹窗
     */
    close() {
      this.triggerEvent('close');
    },

    /**
     * 点击分享选项（除发送好友外的其他选项）
     */
    onShareOptionTap(e) {
      const { type } = e.currentTarget.dataset;
      this.triggerEvent('select', { type });
    }
  }
});

