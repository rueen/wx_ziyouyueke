/**
 * components/studentAvatar/studentAvatar.js
 * 学员头像组件：自定义头像 / 姓名文字头像 / 默认头像
 */
const { DEFAULT_AVATAR_URL, resolveStudentAvatar } = require('../../utils/avatar.js');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    /** 头像地址 */
    avatarUrl: {
      type: String,
      value: ''
    },
    /** 教练设置的学员姓名 */
    studentName: {
      type: String,
      value: ''
    },
    /** 头像尺寸（rpx） */
    size: {
      type: Number,
      value: 100
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    mode: 'default',
    imageUrl: DEFAULT_AVATAR_URL,
    text: '',
    bgColor: '#5B8FF9',
    defaultAvatarUrl: DEFAULT_AVATAR_URL,
    containerStyle: '',
    fontSize: 28
  },

  observers: {
    'avatarUrl, studentName, size': function(avatarUrl, studentName, size) {
      this.updateAvatar(avatarUrl, studentName, size);
    }
  },

  lifetimes: {
    attached() {
      this.updateAvatar(this.data.avatarUrl, this.data.studentName, this.data.size);
    }
  },

  methods: {
    /**
     * 更新头像展示状态
     * @param {string} avatarUrl 头像地址
     * @param {string} studentName 学员姓名
     * @param {number} size 尺寸
     */
    updateAvatar(avatarUrl, studentName, size) {
      const avatarSize = size || 100;
      const resolved = resolveStudentAvatar({ avatarUrl, studentName });

      this.setData({
        mode: resolved.mode,
        imageUrl: resolved.imageUrl || DEFAULT_AVATAR_URL,
        text: resolved.text || '',
        bgColor: resolved.bgColor || '#5B8FF9',
        containerStyle: `width: ${avatarSize}rpx; height: ${avatarSize}rpx;`,
        fontSize: avatarSize >= 120 ? 32 : 28
      });
    }
  }
});
