/**
 * components/courseContentDisplay/courseContentDisplay.js
 * 课程内容展示组件
 */

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 课程内容数据
    courseContent: {
      type: Object,
      value: null
    },
    // 是否显示编辑按钮
    showEditButton: {
      type: Boolean,
      value: false
    },
    // 标题文本
    title: {
      type: String,
      value: '上课内容'
    },
    // 课程类型：1-一对一，2-团课
    courseType: {
      type: Number,
      value: 1
    },
    // 编辑按钮文本
    editButtonText: {
      type: String,
      value: '编辑'
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    playingAudioContext: null, // 当前播放的音频上下文
    playingAudioIndex: -1 // 当前播放的音频索引
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    detached() {
      // 清理音频播放
      if (this.data.playingAudioContext) {
        this.data.playingAudioContext.stop();
        this.data.playingAudioContext.destroy();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 点击编辑按钮
     */
    onEdit() {
      this.triggerEvent('edit');
    },

    /**
     * 预览图片
     */
    onPreviewImage(e) {
      const { url } = e.currentTarget.dataset;
      const { courseContent } = this.properties;
      
      wx.previewImage({
        current: url,
        urls: courseContent.images || []
      });
    },

    /**
     * 播放/停止音频
     */
    onPlayAudio(e) {
      const { url, index } = e.currentTarget.dataset;
      const { playingAudioContext, playingAudioIndex } = this.data;
      
      // 如果点击的是正在播放的音频，则停止
      if (playingAudioIndex === index && playingAudioContext) {
        playingAudioContext.stop();
        playingAudioContext.destroy();
        this.setData({
          playingAudioContext: null,
          playingAudioIndex: -1
        });
        return;
      }
      
      // 如果有其他音频在播放，先停止
      if (playingAudioContext) {
        playingAudioContext.stop();
        playingAudioContext.destroy();
      }
      
      // 开始播放新的音频
      const innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.src = url;
      
      this.setData({
        playingAudioContext: innerAudioContext,
        playingAudioIndex: index
      });
      
      innerAudioContext.play();
      
      wx.showToast({
        title: '播放中...',
        icon: 'none',
        duration: 1000
      });
      
      // 播放结束
      innerAudioContext.onEnded(() => {
        innerAudioContext.destroy();
        this.setData({
          playingAudioContext: null,
          playingAudioIndex: -1
        });
      });
      
      // 播放错误
      innerAudioContext.onError((err) => {
        console.error('音频播放失败:', err);
        innerAudioContext.destroy();
        this.setData({
          playingAudioContext: null,
          playingAudioIndex: -1
        });
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        });
      });
    },

    /**
     * 格式化时长（秒转分:秒）
     */
    formatDuration(seconds) {
      if (!seconds) return '00:00';
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }
});

