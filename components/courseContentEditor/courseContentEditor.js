/**
 * components/courseContentEditor/courseContentEditor.js
 * 课程内容编辑组件
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
      value: false
    },
    // 课程类型：1-一对一，2-团课
    courseType: {
      type: Number,
      value: 1
    },
    // 课程ID（一对一课程为booking_id，团课为group_course_id）
    courseId: {
      type: Number,
      value: null
    },
    // 已有的课程内容
    courseContent: {
      type: Object,
      value: null
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 表单数据
    contentForm: {
      text_content: '',
      images: [],
      audios: [],
      videos: []
    },
    
    // 录音相关
    isRecording: false,
    recordingDuration: 0,
    recordTimer: null,
    recorderManager: null,
    currentRecordPath: '',
    showRecordPreview: false,
    playingAudioContext: null,
    isPlayingPreview: false,
    
    uploadingMedia: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 初始化录音管理器
      this.initRecorderManager();
    },
    
    detached() {
      // 清理资源
      this.cleanup();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'show, courseContent': function(show, courseContent) {
      if (show) {
        // 弹窗打开时，初始化表单数据
        if (courseContent) {
          this.setData({
            contentForm: {
              text_content: courseContent.text_content || '',
              images: courseContent.images || [],
              audios: courseContent.audios || [],
              videos: courseContent.videos || []
            }
          });
        } else {
          this.setData({
            contentForm: {
              text_content: '',
              images: [],
              audios: [],
              videos: []
            }
          });
        }
        // 重置录音状态
        this.resetRecordState();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化录音管理器
     */
    initRecorderManager() {
      const recorderManager = wx.getRecorderManager();
      
      // 录音开始事件
      recorderManager.onStart(() => {
        console.log('录音开始');
        this.setData({
          isRecording: true,
          recordingDuration: 0
        });
        this.startRecordTimer();
      });
      
      // 录音结束事件
      recorderManager.onStop((res) => {
        console.log('录音结束', res);
        this.stopRecordTimer();
        this.setData({
          isRecording: false,
          currentRecordPath: res.tempFilePath,
          showRecordPreview: true
        });
      });
      
      // 录音错误事件
      recorderManager.onError((err) => {
        console.error('录音错误:', err);
        this.stopRecordTimer();
        this.setData({
          isRecording: false
        });
        wx.showToast({
          title: '录音失败，请重试',
          icon: 'none'
        });
      });
      
      this.setData({
        recorderManager: recorderManager
      });
    },

    /**
     * 关闭弹窗
     */
    onClose() {
      this.cleanup();
      this.triggerEvent('close');
    },

    /**
     * 清理资源
     */
    cleanup() {
      // 停止录音
      if (this.data.isRecording && this.data.recorderManager) {
        this.data.recorderManager.stop();
      }
      this.stopRecordTimer();
      
      // 停止音频播放
      if (this.data.playingAudioContext) {
        this.data.playingAudioContext.stop();
        this.data.playingAudioContext.destroy();
      }
      
      // 重置状态
      this.resetRecordState();
    },

    /**
     * 重置录音状态
     */
    resetRecordState() {
      this.setData({
        isRecording: false,
        recordingDuration: 0,
        currentRecordPath: '',
        showRecordPreview: false,
        playingAudioContext: null,
        isPlayingPreview: false
      });
    },

    /**
     * 开始录音计时
     */
    startRecordTimer() {
      const timer = setInterval(() => {
        const duration = this.data.recordingDuration + 1;
        this.setData({
          recordingDuration: duration
        });
        
        // 录音最长60秒，自动停止
        if (duration >= 60) {
          this.onStopRecord();
        }
      }, 1000);
      
      this.setData({
        recordTimer: timer
      });
    },

    /**
     * 停止录音计时
     */
    stopRecordTimer() {
      if (this.data.recordTimer) {
        clearInterval(this.data.recordTimer);
        this.setData({
          recordTimer: null
        });
      }
    },

    /**
     * 文本内容输入
     */
    onContentTextInput(e) {
      this.setData({
        'contentForm.text_content': e.detail.value
      });
    },

    /**
     * 选择图片
     */
    onChooseImage() {
      const { images } = this.data.contentForm;
      const maxCount = 9 - images.length;
      
      if (maxCount <= 0) {
        wx.showToast({
          title: '最多上传9张图片',
          icon: 'none'
        });
        return;
      }
      
      wx.chooseImage({
        count: maxCount,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          wx.showLoading({ title: '上传中...' });
          
          try {
            const uploadPromises = res.tempFilePaths.map(filePath => 
              api.upload.courseContent(filePath)
            );
            
            const results = await Promise.all(uploadPromises);
            const newImages = results.map(r => r.data.url);
            
            this.setData({
              'contentForm.images': [...images, ...newImages]
            });
            
            wx.hideLoading();
            wx.showToast({
              title: '上传成功',
              icon: 'success'
            });
          } catch (error) {
            wx.hideLoading();
            wx.showToast({
              title: error.message || '上传失败',
              icon: 'error'
            });
          }
        }
      });
    },

    /**
     * 删除图片
     */
    onDeleteImage(e) {
      const { index } = e.currentTarget.dataset;
      const { images } = this.data.contentForm;
      
      images.splice(index, 1);
      this.setData({
        'contentForm.images': images
      });
    },

    /**
     * 预览图片
     */
    onPreviewImage(e) {
      const { url } = e.currentTarget.dataset;
      const { images } = this.data.contentForm;
      
      wx.previewImage({
        current: url,
        urls: images
      });
    },

    /**
     * 开始录音
     */
    onStartRecord() {
      const { audios } = this.data.contentForm;
      
      if (audios.length >= 3) {
        wx.showToast({
          title: '最多录制3个音频',
          icon: 'none'
        });
        return;
      }
      
      // 请求录音权限并开始录音
      wx.authorize({
        scope: 'scope.record',
        success: () => {
          this.startRecording();
        },
        fail: () => {
          wx.showModal({
            title: '需要录音权限',
            content: '请在设置中开启录音权限',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      });
    },

    /**
     * 开始录音
     */
    startRecording() {
      const { recorderManager } = this.data;
      
      recorderManager.start({
        duration: 60000,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 48000,
        format: 'mp3'
      });
    },

    /**
     * 停止录音
     */
    onStopRecord() {
      const { recorderManager, isRecording } = this.data;
      
      if (!isRecording) {
        return;
      }
      
      recorderManager.stop();
    },

    /**
     * 播放录音预览
     */
    onPlayRecordPreview() {
      const { currentRecordPath, playingAudioContext, isPlayingPreview } = this.data;
      
      // 如果正在播放，则停止
      if (isPlayingPreview && playingAudioContext) {
        playingAudioContext.stop();
        playingAudioContext.destroy();
        this.setData({
          playingAudioContext: null,
          isPlayingPreview: false
        });
        return;
      }
      
      // 开始播放
      const innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.src = currentRecordPath;
      
      this.setData({
        playingAudioContext: innerAudioContext,
        isPlayingPreview: true
      });
      
      innerAudioContext.play();
      
      wx.showToast({
        title: '播放中...',
        icon: 'none',
        duration: 1000
      });
      
      innerAudioContext.onEnded(() => {
        innerAudioContext.destroy();
        this.setData({
          playingAudioContext: null,
          isPlayingPreview: false
        });
      });
      
      innerAudioContext.onError((err) => {
        console.error('音频播放失败:', err);
        innerAudioContext.destroy();
        this.setData({
          playingAudioContext: null,
          isPlayingPreview: false
        });
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        });
      });
    },

    /**
     * 重新录音
     */
    onReRecord() {
      if (this.data.playingAudioContext) {
        this.data.playingAudioContext.stop();
        this.data.playingAudioContext.destroy();
      }
      
      this.setData({
        showRecordPreview: false,
        currentRecordPath: '',
        recordingDuration: 0,
        playingAudioContext: null,
        isPlayingPreview: false
      });
    },

    /**
     * 提交录音
     */
    async onSubmitRecord() {
      if (this.data.playingAudioContext) {
        this.data.playingAudioContext.stop();
        this.data.playingAudioContext.destroy();
      }
      
      const { currentRecordPath, recordingDuration } = this.data;
      const { audios } = this.data.contentForm;
      
      if (recordingDuration < 1) {
        wx.showToast({
          title: '录音时长太短',
          icon: 'none'
        });
        return;
      }
      
      wx.showLoading({ title: '上传中...' });
      
      try {
        const result = await api.courseContent.uploadAudio(currentRecordPath);
        
        this.setData({
          'contentForm.audios': [...audios, {
            url: result.data.url,
            duration: recordingDuration
          }],
          showRecordPreview: false,
          currentRecordPath: '',
          recordingDuration: 0,
          playingAudioContext: null,
          isPlayingPreview: false
        });
        
        wx.hideLoading();
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        });
      } catch (error) {
        wx.hideLoading();
        wx.showToast({
          title: error.message || '上传失败',
          icon: 'error'
        });
      }
    },

    /**
     * 删除音频
     */
    onDeleteAudio(e) {
      const { index } = e.currentTarget.dataset;
      const { audios } = this.data.contentForm;
      
      audios.splice(index, 1);
      this.setData({
        'contentForm.audios': audios
      });
    },

    /**
     * 播放已上传的音频
     */
    onPlayAudio(e) {
      const { url, index } = e.currentTarget.dataset;
      const { playingAudioContext } = this.data;
      
      // 如果有正在播放的音频，先停止
      if (playingAudioContext) {
        playingAudioContext.stop();
        playingAudioContext.destroy();
        
        // 如果点击的是同一个音频，则只停止不重新播放
        if (playingAudioContext.src === url) {
          this.setData({
            playingAudioContext: null
          });
          return;
        }
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
      
      innerAudioContext.onEnded(() => {
        innerAudioContext.destroy();
        this.setData({
          playingAudioContext: null
        });
      });
      
      innerAudioContext.onError((err) => {
        console.error('音频播放失败:', err);
        innerAudioContext.destroy();
        this.setData({
          playingAudioContext: null
        });
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        });
      });
    },

    /**
     * 选择视频
     */
    onChooseVideo() {
      console.log('点击了添加视频按钮');
      const { videos } = this.data.contentForm;
      
      if (videos.length >= 1) {
        wx.showToast({
          title: '最多上传1个视频',
          icon: 'none'
        });
        return;
      }
      
      wx.authorize({
        scope: 'scope.camera',
        success: () => {
          this.chooseVideoFile();
        },
        fail: () => {
          this.chooseVideoFile();
        }
      });
    },

    /**
     * 选择视频文件
     */
    chooseVideoFile() {
      console.log('开始选择视频');
      wx.chooseVideo({
        sourceType: ['album', 'camera'],
        maxDuration: 60,
        camera: 'back',
        success: async (res) => {
          console.log('视频选择成功:', res);
          
          if (res.size > 100 * 1024 * 1024) {
            wx.showToast({
              title: '视频文件不能超过100MB',
              icon: 'none'
            });
            return;
          }
          
          wx.showLoading({ title: '上传中...' });
          
          try {
            const result = await api.courseContent.uploadVideo(res.tempFilePath);
            
            const { videos } = this.data.contentForm;
            this.setData({
              'contentForm.videos': [...videos, {
                url: result.data.url,
                duration: Math.round(res.duration)
              }]
            });
            
            wx.hideLoading();
            wx.showToast({
              title: '上传成功',
              icon: 'success'
            });
          } catch (error) {
            console.error('视频上传失败:', error);
            wx.hideLoading();
            wx.showToast({
              title: error.message || '上传失败',
              icon: 'error'
            });
          }
        },
        fail: (error) => {
          console.error('选择视频失败:', error);
          if (error.errMsg && error.errMsg.includes('cancel')) {
            console.log('用户取消选择视频');
            return;
          }
          wx.showToast({
            title: '选择视频失败',
            icon: 'none'
          });
        }
      });
    },

    /**
     * 删除视频
     */
    onDeleteVideo(e) {
      const { index } = e.currentTarget.dataset;
      const { videos } = this.data.contentForm;
      
      videos.splice(index, 1);
      this.setData({
        'contentForm.videos': videos
      });
    },

    /**
     * 保存课程内容
     */
    async onSave() {
      const { contentForm } = this.data;
      const { courseType, courseId, courseContent } = this.properties;
      
      // 验证至少有一项内容
      if (!contentForm.text_content && 
          contentForm.images.length === 0 && 
          contentForm.audios.length === 0 && 
          contentForm.videos.length === 0) {
        wx.showToast({
          title: '请至少添加一项内容',
          icon: 'none'
        });
        return;
      }
      
      try {
        wx.showLoading({ title: '保存中...' });
        
        const params = {
          course_type: courseType,
          text_content: contentForm.text_content || null,
          images: contentForm.images.length > 0 ? contentForm.images : null,
          audios: contentForm.audios.length > 0 ? contentForm.audios : null,
          videos: contentForm.videos.length > 0 ? contentForm.videos : null
        };
        
        // 根据课程类型设置对应的ID
        if (courseType === 1) {
          params.booking_id = courseId;
        } else {
          params.group_course_id = courseId;
        }
        
        let result;
        if (courseContent && courseContent.id) {
          // 更新课程内容
          result = await api.courseContent.update(courseContent.id, params);
        } else {
          // 创建课程内容
          result = await api.courseContent.create(params);
        }
        
        wx.hideLoading();
        
        if (result && result.success) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          
          // 触发成功事件，传递课程内容数据
          this.triggerEvent('success', { courseContent: result.data });
          
          // 延迟关闭弹窗
          setTimeout(() => {
            this.onClose();
          }, 500);
        }
      } catch (error) {
        wx.hideLoading();
        wx.showToast({
          title: error.message || '保存失败',
          icon: 'error'
        });
      }
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

