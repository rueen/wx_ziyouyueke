/**
 * components/emptyState/emptyState.js
 * 通用空状态组件
 */

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 空状态类型
    type: {
      type: String,
      value: 'default' // default, no-data, no-network, no-permission, search
    },
    // 自定义图标
    icon: {
      type: String,
      value: ''
    },
    // 主要文字
    title: {
      type: String,
      value: ''
    },
    // 描述文字
    description: {
      type: String,
      value: ''
    },
    // 是否显示操作按钮
    showButton: {
      type: Boolean,
      value: false
    },
    // 按钮文字
    buttonText: {
      type: String,
      value: '重试'
    },
    // 自定义样式类
    customClass: {
      type: String,
      value: ''
    },
    // 图标大小
    iconSize: {
      type: String,
      value: 'normal' // small, normal, large
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 预设的空状态配置
    presetConfigs: {
      'default': {
        icon: 'icon-empty',
        title: '暂无数据',
        description: ''
      },
      'no-data': {
        icon: 'icon-empty',
        title: '暂无数据',
        description: '当前没有相关数据'
      },
      'no-network': {
        icon: 'icon-wifi-off',
        title: '网络连接失败',
        description: '请检查网络设置后重试'
      },
      'no-permission': {
        icon: 'icon-lock',
        title: '暂无权限',
        description: '您没有访问此内容的权限'
      },
      'search': {
        icon: 'icon-search',
        title: '未找到相关内容',
        description: '试试其他关键词'
      },
      'no-student': {
        icon: 'icon-user',
        title: '暂无可约学员',
        description: '需要有剩余课时才能约课'
      },
      'no-coach': {
        icon: 'icon-user',
        title: '暂无可约教练',
        description: '需要有剩余课时才能约课'
      },
      'no-address': {
        icon: 'icon-location',
        title: '暂无地址',
        description: '请先添加上课地址'
      },
      'no-course': {
        icon: 'icon-calendar',
        title: '暂无课程',
        description: '还没有相关的课程记录'
      }
    }
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.updateConfig();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'type, title, description, icon': function() {
      this.updateConfig();
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 更新配置
     */
    updateConfig() {
      const { type, title, description, icon } = this.properties;
      const { presetConfigs } = this.data;
      
      // 获取预设配置
      const presetConfig = presetConfigs[type] || presetConfigs['default'];
      
      // 合并配置（自定义属性优先）
      const finalConfig = {
        icon: icon || presetConfig.icon,
        title: title || presetConfig.title,
        description: description || presetConfig.description
      };
      
      this.setData({
        finalConfig
      });
    },

    /**
     * 按钮点击事件
     */
    onButtonTap() {
      this.triggerEvent('buttonTap', {
        type: this.properties.type
      });
    },

    /**
     * 空状态区域点击事件
     */
    onEmptyTap() {
      this.triggerEvent('emptyTap', {
        type: this.properties.type
      });
    }
  }
}); 