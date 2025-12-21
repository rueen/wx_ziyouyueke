/**
 * components/addressSelector/addressSelector.js
 * 地址选择器组件
 * 用于选择上课地点
 */

const api = require('../../utils/api.js');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示弹窗
    show: {
      type: Boolean,
      value: false,
      observer: 'onShowChange'
    },
    // 地址列表（可选，如果不传则组件内部自动加载）
    addressList: {
      type: Array,
      value: null
    },
    // 已选中的地址
    selectedAddress: {
      type: Object,
      value: null
    },
    // 弹窗标题
    title: {
      type: String,
      value: '选择上课地点'
    },
    // 空状态提示文本
    emptyText: {
      type: String,
      value: '暂无地址，请先添加地址'
    },
    // 教练ID（可选，用于加载指定教练的地址）
    coachId: {
      type: Number,
      value: null
    },
    // 是否自动加载地址（当 addressList 为空时）
    autoLoad: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 内部地址列表
    internalAddressList: [],
    // 加载状态
    loading: false,
    // 当前显示的地址列表
    displayAddressList: []
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 监听 show 属性变化
     */
    onShowChange(newVal, oldVal) {
      if (newVal && !oldVal) {
        // 弹窗打开时，检查是否需要加载地址
        this.checkAndLoadAddresses();
      }
    },

    /**
     * 检查并加载地址列表
     */
    async checkAndLoadAddresses() {
      // 如果父组件传入了地址列表，使用父组件的数据
      if (this.properties.addressList !== null) {
        this.setData({
          internalAddressList: this.properties.addressList,
          displayAddressList: this.properties.addressList
        });
        return;
      }

      // 如果不自动加载，直接返回
      if (!this.properties.autoLoad) {
        return;
      }

      // 组件内部加载地址列表
      await this.loadAddresses();
    },

    /**
     * 加载地址列表
     */
    async loadAddresses() {
      try {
        this.setData({ loading: true });

        const params = {
          limit: 200
        };

        // 如果指定了教练ID，加载该教练的地址
        if (this.properties.coachId) {
          params.coach_id = this.properties.coachId;
        }

        const result = await api.address.getList(params);
        
        if (result && result.data) {
          let addresses = [];
          
          // 处理不同的API返回格式
          if (result.data.list && Array.isArray(result.data.list)) {
            addresses = result.data.list;
          } else if (Array.isArray(result.data)) {
            addresses = result.data;
          }

          this.setData({
            internalAddressList: addresses,
            displayAddressList: addresses,
            loading: false
          });

          // 触发加载完成事件
          this.triggerEvent('loaded', { addresses: addresses });
        }
      } catch (error) {
        console.error('加载地址列表失败:', error);
        this.setData({
          internalAddressList: [],
          displayAddressList: [],
          loading: false
        });

        // 触发加载失败事件
        this.triggerEvent('loaderror', { error: error });
      }
    },

    /**
     * 隐藏弹窗
     */
    onHide() {
      this.triggerEvent('hide');
    },

    /**
     * 阻止事件冒泡
     */
    onPreventClose(e) {
      // 空函数，用于阻止事件冒泡
    },

    /**
     * 选择地址
     */
    onSelectAddress(e) {
      const address = e.currentTarget.dataset.address;
      this.triggerEvent('select', { address: address });
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件实例被放入页面节点树后执行
    },
    detached() {
      // 组件实例被从页面节点树移除后执行
    }
  }
})

