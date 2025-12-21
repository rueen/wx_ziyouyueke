/**
 * components/categorieSelector/categorieSelector.js
 * 课程类型/卡片选择器组件
 * 用于选择课程类型或卡片
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
    },
    // 课程类型列表
    categoriesList: {
      type: Array,
      value: []
    },
    // 卡片列表
    cardsList: {
      type: Array,
      value: []
    },
    // 已选中的课程类型
    selectedCategorie: {
      type: Object,
      value: null
    },
    // 已选中的卡片
    selectedCard: {
      type: Object,
      value: null
    },
    // 弹窗标题
    title: {
      type: String,
      value: '选择课程类型或卡片'
    },
    // 空状态提示文本
    emptyText: {
      type: String,
      value: '暂无可用课时'
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
     * 隐藏弹窗
     */
    onHide() {
      this.triggerEvent('hide');
    },

    /**
     * 阻止事件冒泡
     */
    onPreventClose() {
      // 空函数，用于阻止事件冒泡
    },

    /**
     * 选择课程类型
     */
    onSelectCategorie(e) {
      const item = e.currentTarget.dataset.item;
      this.triggerEvent('selectcategorie', { categorie: item });
    },

    /**
     * 选择卡片
     */
    onSelectCard(e) {
      const card = e.currentTarget.dataset.card;
      this.triggerEvent('selectcard', { card: card });
    }
  }
})

