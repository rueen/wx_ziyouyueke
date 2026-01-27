/**
 * pages/planDetail/planDetail.js
 * 训练计划详情页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    type: 'add', // add: 新增, edit: 编辑
    planId: null,
    studentId: null,
    coachId: null,
    isStudent: false,
    plan: {},
    planName: '',
    planContent: '', // 文本内容
    images: [], // 图片列表
    isVisible: 1, // 是否对学员可见
    isFirstLoad: true, // 标记是否首次加载
    isLoading: false, // 加载状态
    isEditing: false, // 是否处于编辑状态
    isSaving: false // 是否正在保存
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const type = options.type || 'edit';
    const planId = options.planId ? parseInt(options.planId) : null;
    const studentId = options.studentId ? parseInt(options.studentId) : null;
    const coachId = options.coachId ? parseInt(options.coachId) : null;
    const isStudent = !!options.isStudent;
    
    this.setData({
      type: type,
      planId: planId,
      studentId: studentId,
      coachId: coachId,
      isStudent: isStudent,
      isEditing: type === 'add',
      isFirstLoad: false
    }, () => {
      if (type === 'edit' && planId) {
        this.loadPlanDetail();
      }
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 只有非首次加载时才刷新数据（从其他页面返回时）
    if (!this.data.isFirstLoad && this.data.type === 'edit' && this.data.planId) {
      this.loadPlanDetail();
    }
  },

  /**
   * 加载计划详情
   */
  async loadPlanDetail() {
    if (this.data.isLoading) return;
    
    try {
      this.setData({ isLoading: true });

      const result = await api.plan.getDetail(this.data.planId);
      
      if (result && result.data) {
        const plan = result.data;
        const planContent = plan.plan_content || {};
        
        this.setData({
          plan: plan,
          planName: plan.plan_name || '',
          planContent: planContent.content || '',
          images: planContent.images || [],
          isVisible: plan.is_visible !== undefined ? plan.is_visible : 1,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('加载计划详情失败:', error);
      this.setData({
        isLoading: false
      });
      
      wx.showToast({
        title: error.message || '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 开始编辑
   */
  onStartEdit() {
    this.setData({
      isEditing: true
    });
  },

  /**
   * 取消编辑
   */
  onCancelEdit() {
    const { plan } = this.data;
    const planContent = plan.plan_content || {};
    
    this.setData({
      isEditing: false,
      planName: plan.plan_name || '',
      planContent: planContent.content || '',
      images: planContent.images || [],
      isVisible: plan.is_visible !== undefined ? plan.is_visible : 1
    });
  },

  /**
   * 输入计划名称
   */
  onPlanNameInput(e) {
    this.setData({
      planName: e.detail.value
    });
  },

  /**
   * 输入计划内容
   */
  onPlanContentInput(e) {
    this.setData({
      planContent: e.detail.value
    });
  },

  /**
   * 选择图片
   */
  onChooseImage() {
    const maxCount = 4 - this.data.images.length;
    
    if (maxCount <= 0) {
      wx.showToast({
        title: '最多只能上传4张图片',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImages(res.tempFilePaths);
      }
    });
  },

  /**
   * 上传图片
   */
  async uploadImages(filePaths) {
    wx.showLoading({
      title: '上传中...'
    });
    
    try {
      const uploadPromises = filePaths.map(filePath => {
        return api.upload.image(filePath, 'images');
      });
      
      const responses = await Promise.all(uploadPromises);
      const urls = responses.map(res => res.data.url);
      
      this.setData({
        images: [...this.data.images, ...urls]
      });
      
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('图片上传失败:', err);
      wx.showToast({
        title: err.message || '上传失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 删除图片
   */
  onDeleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({
      images: images
    });
  },

  /**
   * 预览图片
   */
  onPreviewImage(e) {
    const { index } = e.currentTarget.dataset;
    const { images } = this.data;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  /**
   * 切换可见性
   */
  onVisibleChange(e) {
    this.setData({
      isVisible: e.detail.value ? 1 : 0
    });
  },

  /**
   * 保存计划
   */
  async onSave() {
    const { planName, planContent, images, studentId, coachId, type, planId, isSaving } = this.data;

    if (isSaving) {
      return; // 防止重复提交
    }

    // 验证计划名称
    if (!planName || !planName.trim()) {
      wx.showToast({
        title: '请输入计划名称',
        icon: 'none'
      });
      return;
    }

    // 验证学员ID（新增时必填）
    if (type === 'add' && !studentId) {
      wx.showToast({
        title: '学员ID不能为空',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({
        isSaving: true
      });

      wx.showLoading({
        title: '保存中...'
      });

      // 构建 plan_content
      const plan_content = {
        content: planContent.trim(),
        images: images
      };

      let result;
      if (type === 'add') {
        // 创建新计划
        result = await api.plan.create({
          student_id: studentId,
          coachId: coachId,
          plan_name: planName.trim(),
          plan_content: plan_content,
          is_visible: this.data.isVisible
        });
      } else {
        // 更新计划
        result = await api.plan.update(planId, {
          plan_name: planName.trim(),
          plan_content: plan_content,
          is_visible: this.data.isVisible
        });
      }
      
      wx.hideLoading();

      if (result && result.success) {
        this.setData({
          isEditing: false,
          isSaving: false
        });

        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1500
        });

        // 如果是新增，跳转到编辑模式并刷新数据
        if (type === 'add' && result.data) {
          setTimeout(() => {
            this.setData({
              type: 'edit',
              planId: result.data.id,
              plan: result.data
            });
            this.loadPlanDetail();
          }, 1500);
        } else {
          // 编辑模式，刷新数据
          setTimeout(() => {
            this.loadPlanDetail();
          }, 1500);
        }
      } else {
        throw new Error(result.message || '保存失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('保存计划失败:', error);
      
      this.setData({
        isSaving: false
      });

      const errorMessage = error.message || '保存失败，请重试';
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    }
  },

  /**
   * 删除计划
   */
  handleDelete() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个训练计划吗？删除后无法恢复。',
      success: (res) => {
        if (res.confirm) {
          this.onDelete();
        }
      }
    });
  },

  /**
   * 执行删除
   */
  async onDelete() {
    const { planId, isSaving } = this.data;

    if (isSaving) {
      return;
    }

    try {
      this.setData({
        isSaving: true
      });

      wx.showLoading({
        title: '删除中...'
      });

      const result = await api.plan.delete(planId);
      
      wx.hideLoading();

      if (result && result.success) {
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(result.message || '删除失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('删除计划失败:', error);
      
      this.setData({
        isSaving: false
      });

      const errorMessage = error.message || '删除失败，请重试';
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    }
  }
});
