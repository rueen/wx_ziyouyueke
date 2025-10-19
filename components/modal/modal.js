Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示模态框
    show: {
      type: Boolean,
      value: false
    },
    // 模态框标题
    title: {
      type: String,
      value: ''
    },
    // 显示位置：center-居中，bottom-底部
    position: {
      type: String,
      value: 'center'
    },
    // 是否点击遮罩层关闭
    maskClosable: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 点击遮罩层
     */
    onMaskTap() {
      if (this.properties.maskClosable) {
        this.close()
      }
    },

    /**
     * 点击关闭按钮
     */
    onClose() {
      this.close()
    },

    /**
     * 关闭模态框
     */
    close() {
      this.triggerEvent('close')
    }
  }
})
