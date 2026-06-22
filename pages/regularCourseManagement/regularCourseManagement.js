/**
 * pages/regularCourseManagement/regularCourseManagement.js
 * 常规课管理页面
 */

// 引入API工具类
const api = require('../../utils/api.js');
const { parseUnitPriceInput, formatUnitPrice, getEffectiveUnitPrice } = require('../../utils/unitPrice.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    relationId: null,
    studentId: null,
    categoryLessons: [], // 课程类别课时列表
    lessons: [], // 编辑时的课时数据
    isEditing: false, // 是否处于编辑状态
    isSaving: false, // 是否正在保存
    bookingStatus: true // 约课状态
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 只设置参数，不加载数据
    if (options.relationId && options.studentId) {
      this.setData({
        studentId: options.studentId - 0,
        relationId: options.relationId - 0
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 统一在 onShow 中加载数据（首次进入和从其他页面返回都会触发）
    if (this.data.relationId) {
      // 如果处于编辑状态，先取消编辑
      if (this.data.isEditing) {
        this.onCancelEdit();
      }
      // 加载数据
      this.loadStudentDetail();
    }
  },

  /**
   * 加载学员详情数据
   */
  async loadStudentDetail() {
    const { relationId } = this.data;
    try {
      wx.showLoading({
        title: '加载中...'
      });

      const result = await api.relation.getMyStudentsDetail(relationId);
      
      wx.hideLoading();

      if (result && result.data) {
        const studentData = result.data || {};
        const lessons = studentData.lessons || []
        const categoryLessons = (studentData.category_lessons || []).map(item => {
          const category = item.category || {};
          const lessonItem = lessons.find(i => i.category_id === category.id) || {};
          const unit_price = lessonItem.unit_price ? lessonItem.unit_price : (category.unit_price ?? null);
          item.unit_price = unit_price;
          return {
            ...item,
            unitPriceDisplay: this.buildUnitPriceDisplay(item)
          }
        });
        this.setData({
          categoryLessons,
          lessons: lessons,
          bookingStatus: studentData.booking_status
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载学员详情失败:', error);
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 构建课单价展示文案
   * @param {Object} item 分类课时项
   * @returns {string}
   */
  buildUnitPriceDisplay(item) {
    const effectivePrice = getEffectiveUnitPrice(item.unit_price, item.category && item.category.unit_price);
    if (item.unit_price != null) {
      return formatUnitPrice(item.unit_price);
    }
    if (item.category && item.category.unit_price != null) {
      return `${formatUnitPrice(item.category.unit_price)}`;
    }
    return formatUnitPrice(effectivePrice);
  },

  /**
   * 构建编辑态课时数据
   * @param {Array} categoryLessons 分类课时列表
   * @returns {Array}
   */
  buildEditableLessons(categoryLessons) {
    const { lessons } = this.data;
    return categoryLessons.map(item => {
      const category = item.category || {};
      const lessonItem = lessons.find(i => i.category_id === category.id) || {};
      const unit_price = lessonItem.unit_price ? lessonItem.unit_price : (category.unit_price ?? null);

      return {
        category_id: item.category.id,
        remaining_lessons: item.remaining_lessons || 0,
        expire_date: item.expire_date || null,
        unit_price: unit_price,
        unit_price_input: unit_price != null ? String(unit_price) : ''
      }
    });
  },

  /**
   * 开始编辑
   */
  onStartEdit() {
    const { categoryLessons } = this.data;
    this.setData({
      isEditing: true,
      lessons: this.buildEditableLessons(categoryLessons)
    });
  },

  /**
   * 取消编辑
   */
  onCancelEdit() {
    const { categoryLessons } = this.data;
    this.setData({
      isEditing: false,
      lessons: this.buildEditableLessons(categoryLessons)
    });
  },

  /**
   * 输入课时数
   */
  onLessonsInput(e) {
    const { currentTarget: { dataset: { id, index } }, detail: { value } } = e;
    const lessons = [...this.data.lessons];
    // 通过索引或category_id找到对应的lesson项
    if (index !== undefined && lessons[index]) {
      lessons[index].remaining_lessons = parseInt(value) || 0;
    } else {
      lessons.map(item => {
        if (item.category_id === id) {
          item.remaining_lessons = parseInt(value) || 0;
        }
      });
    }
    this.setData({
      lessons: lessons
    });
  },

  /**
   * 输入课单价
   * @param {Object} e 输入事件
   */
  onUnitPriceInput(e) {
    const { index } = e.currentTarget.dataset;
    const lessons = [...this.data.lessons];
    if (index !== undefined && lessons[index]) {
      lessons[index].unit_price_input = e.detail.value;
    }
    this.setData({ lessons });
  },

  /**
   * 清除到期时间
   */
  handleClearExpireDate(e) {
    const { currentTarget: { dataset: { id, index } } } = e;
    const lessons = [...this.data.lessons];
    // 优先使用索引，确保数据同步
    if (index !== undefined && lessons[index]) {
      lessons[index].expire_date = null;
    } else {
      lessons.map(item => {
        if (item.category_id === id) {
          item.expire_date = null;
        }
      });
    }
    this.setData({
      lessons: lessons
    });
  },

  /**
   * 选择到期时间
   */
  bindPickerChange(e) {
    const { currentTarget: { dataset: { id, index } }, detail: { value } } = e;
    const lessons = [...this.data.lessons];
    // 优先使用索引，确保数据同步
    if (index !== undefined && lessons[index]) {
      lessons[index].expire_date = value;
    } else {
      lessons.map(item => {
        if (item.category_id === id) {
          item.expire_date = value;
        }
      });
    }
    this.setData({
      lessons: lessons
    });
  },

  /**
   * 保存修改
   */
  async onSave() {
    const { lessons, relationId, isSaving } = this.data;

    if (isSaving) {
      return; // 防止重复提交
    }

    try {
      this.setData({
        isSaving: true
      });

      wx.showLoading({
        title: '保存中...'
      });

      for (const lesson of lessons) {
        const unit_price = parseUnitPriceInput(lesson.unit_price_input);
        if (Number.isNaN(unit_price)) {
          wx.hideLoading();
          this.setData({ isSaving: false });
          wx.showToast({
            title: '请输入有效的课单价',
            icon: 'none'
          });
          return;
        }
        lesson.unit_price = unit_price;
      }

      const updateData = {
        category_lessons: lessons.map(lesson => ({
          category_id: lesson.category_id,
          expire_date: lesson.expire_date,
          remaining_lessons: lesson.remaining_lessons,
          unit_price: lesson.unit_price
        }))
      };

      const result = await api.relation.update(relationId, updateData);
      
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
        
        setTimeout(() => {
          this.loadStudentDetail();
        }, 1500);
      } else {
        throw new Error(result.message || '保存失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('保存课时信息失败:', error);
      
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
   * 跳转到课程设置页面
   */
  handleCategoriesList() {
    wx.navigateTo({
      url: '/pages/categoriesList/categoriesList'
    });
  },

  /**
   * 跳转到课时变更明细
   */
  handleLessonChangeLogs() {
    const { relationId, studentId } = this.data;
    wx.navigateTo({
      url: `/pages/lessonChangeLogs/lessonChangeLogs?relationId=${relationId}&studentId=${studentId}`
    });
  }
});

