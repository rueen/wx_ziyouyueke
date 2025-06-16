/**
 * pages/timeTemplate/timeTemplate.js
 * 时间模板页面 - 支持添加/删除时间段并实时同步到后端API
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 预约设置
    bookingSettings: {
      minAdvanceDays: 1, // 最少需要提前几天预约
      maxAdvanceDays: 30 // 最多可预约未来几天
    },
    
    // 模板启用状态
    templateEnabled: true, // 默认启用
    templateId: null, // 模板ID
    
    // 时间段模板（一天的时间段模板）
    timeSlotTemplate: [],
    
    // 添加时间段的表单数据
    showAddForm: false,
    newStartTime: '',
    newEndTime: '',
    
    // 设置表单数据
    showSettingsForm: false,
    tempMinAdvanceDays: 1,
    tempMaxAdvanceDays: 30
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadTimeSettings();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 加载时间设置数据
   */
  async loadTimeSettings() {
    try {
      wx.showLoading({
        title: '加载中...'
      });
      
      // 从API获取时间模板数据
      const result = await api.timeTemplate.getList();
      
      wx.hideLoading();
      
      if (result && result.data && result.data.length > 0) {
        const template = result.data[0]; // 使用第一个模板
        
        // 解析时间段数据
        let timeSlots = [];
        try {
          timeSlots = template.time_slots;
        } catch (e) {
          console.error('解析时间段数据失败:', e);
          timeSlots = [];
        }
        
        // 为每个时间段添加ID
        timeSlots = timeSlots.map((slot, index) => ({
          id: index + 1,
          startTime: slot.startTime,
          endTime: slot.endTime
        }));
        
        this.setData({
          bookingSettings: {
            minAdvanceDays: template.min_advance_days,
            maxAdvanceDays: template.max_advance_days
          },
          timeSlotTemplate: timeSlots,
          templateId: template.id, // 保存模板ID用于更新
          templateEnabled: template.is_active === 1 // 设置启用状态
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载时间设置失败:', error);
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 阻止弹窗关闭（用于阻止点击弹窗内容区域时关闭弹窗）
   */
  onPreventClose(e) {
    // 阻止事件冒泡，防止触发遮罩层的点击事件
    // 这个方法什么都不做，只是用来阻止事件冒泡
  },

  /**
   * 显示预约设置表单
   */
  onShowSettingsForm() {
    const { bookingSettings } = this.data;
    this.setData({
      showSettingsForm: true,
      tempMinAdvanceDays: bookingSettings.minAdvanceDays,
      tempMaxAdvanceDays: bookingSettings.maxAdvanceDays
    });
  },

  /**
   * 隐藏预约设置表单
   */
  onHideSettingsForm() {
    this.setData({
      showSettingsForm: false
    });
  },

  /**
   * 最少提前天数变化
   */
  onMinAdvanceDaysChange(e) {
    this.setData({
      tempMinAdvanceDays: parseInt(e.detail.value) || 1
    });
  },

  /**
   * 最多提前天数变化
   */
  onMaxAdvanceDaysChange(e) {
    this.setData({
      tempMaxAdvanceDays: parseInt(e.detail.value) || 30
    });
  },

  /**
   * 切换模板启用状态
   */
  async onTemplateToggle(e) {
    const { templateId } = this.data;
    const enabled = e.detail.value;
    
    if (!templateId) {
      wx.showToast({
        title: '请先保存时间模板',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: enabled ? '启用中...' : '禁用中...'
      });

      // 调用切换API
      await api.timeTemplate.toggle(templateId);
      
      wx.hideLoading();
      
      this.setData({
        templateEnabled: enabled
      });
      
      wx.showToast({
        title: enabled ? '已启用' : '已禁用',
        icon: 'success'
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('切换模板状态失败:', error);
      
      // 恢复开关状态
      this.setData({
        templateEnabled: !enabled
      });
      
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 保存预约设置
   */
  async onSaveSettings() {
    const { tempMinAdvanceDays, tempMaxAdvanceDays, timeSlotTemplate, templateId } = this.data;
    
    if (tempMinAdvanceDays >= tempMaxAdvanceDays) {
      wx.showToast({
        title: '最少提前天数不能大于等于最多天数',
        icon: 'none'
      });
      return;
    }
    
    if (tempMinAdvanceDays < 0 || tempMaxAdvanceDays <= 0) {
      wx.showToast({
        title: '请输入有效的天数',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '保存中...'
      });

      // 准备时间段数据
      const timeSlots = timeSlotTemplate.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime
      }));

      const templateData = {
        min_advance_days: tempMinAdvanceDays,
        max_advance_days: tempMaxAdvanceDays,
        time_slots: timeSlots,
        is_active: 1
      };

      // 调用API保存
      if (templateId) {
        // 更新现有模板
        await api.timeTemplate.update(templateId, templateData);
      } else {
        // 创建新模板
        const result = await api.timeTemplate.create(templateData);
        this.setData({
          templateId: result.data.id
        });
      }

      wx.hideLoading();

      this.setData({
        bookingSettings: {
          minAdvanceDays: tempMinAdvanceDays,
          maxAdvanceDays: tempMaxAdvanceDays
        },
        showSettingsForm: false
      });
      
      wx.showToast({
        title: '设置保存成功',
        icon: 'success'
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('保存预约设置失败:', error);
      
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 显示添加时间段表单
   */
  onShowAddForm() {
    this.setData({
      showAddForm: true,
      newStartTime: '',
      newEndTime: ''
    });
  },

  /**
   * 隐藏添加表单
   */
  onHideAddForm() {
    this.setData({
      showAddForm: false,
      newStartTime: '',
      newEndTime: ''
    });
  },

  /**
   * 输入开始时间
   */
  onStartTimeChange(e) {
    this.setData({
      newStartTime: e.detail.value
    });
  },

  /**
   * 输入结束时间
   */
  onEndTimeChange(e) {
    this.setData({
      newEndTime: e.detail.value
    });
  },

  /**
   * 确认添加时间段
   */
  async onConfirmAdd() {
    const { newStartTime, newEndTime, timeSlotTemplate } = this.data;
    
    if (!newStartTime || !newEndTime) {
      wx.showToast({
        title: '请选择时间',
        icon: 'none'
      });
      return;
    }

    if (newStartTime >= newEndTime) {
      wx.showToast({
        title: '结束时间必须晚于开始时间',
        icon: 'none'
      });
      return;
    }

    // 检查时间重叠
    const hasOverlap = this.checkTimeOverlap(newStartTime, newEndTime, timeSlotTemplate);
    
    if (hasOverlap) {
      wx.showToast({
        title: '时间段重叠，请重新选择',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '添加中...'
      });

      // 生成新的时间段
      const newTimeSlot = {
        id: Date.now(), // 简单的ID生成
        startTime: newStartTime,
        endTime: newEndTime
      };

      // 更新时间段模板
      const updatedTemplate = [...timeSlotTemplate, newTimeSlot];
      
      // 按时间排序
      updatedTemplate.sort((a, b) => a.startTime.localeCompare(b.startTime));

      // 调用API保存到后端
      await this.saveTimeTemplate(updatedTemplate);

      this.setData({
        timeSlotTemplate: updatedTemplate,
        showAddForm: false,
        newStartTime: '',
        newEndTime: ''
      });

      wx.hideLoading();
      
      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('添加时间段失败:', error);
      
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 检查时间重叠
   * @param {string} newStart 新时间段开始时间
   * @param {string} newEnd 新时间段结束时间
   * @param {Array} existingSlots 已有时间段数组
   * @returns {boolean} 是否有重叠
   */
  checkTimeOverlap(newStart, newEnd, existingSlots) {
    for (let slot of existingSlots) {
      const existingStart = slot.startTime;
      const existingEnd = slot.endTime;
      
      // 判断两个时间段是否重叠
      // 重叠条件：新开始时间 < 已有结束时间 且 已有开始时间 < 新结束时间
      if (newStart < existingEnd && existingStart < newEnd) {
        return true; // 有重叠
      }
    }
    return false; // 无重叠
  },

  /**
   * 删除时间段
   */
  onDeleteTimeSlot(e) {
    const { slotIndex } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个时间段吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '删除中...'
            });

            const { timeSlotTemplate } = this.data;
            const updatedTemplate = [...timeSlotTemplate];
            const deletedSlot = updatedTemplate.splice(slotIndex, 1)[0];
            
            // 调用API保存到后端
            await this.saveTimeTemplate(updatedTemplate);
            
            this.setData({
              timeSlotTemplate: updatedTemplate
            });

            wx.hideLoading();
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
          } catch (error) {
            wx.hideLoading();
            console.error('删除时间段失败:', error);
            
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 保存时间模板到后端
   * @param {Array} timeSlots 时间段数组
   */
  async saveTimeTemplate(timeSlots) {
    const { bookingSettings, templateId } = this.data;
    
    // 准备时间段数据（移除ID字段，只保留时间）
    const timeSlotData = timeSlots.map(slot => ({
      startTime: slot.startTime,
      endTime: slot.endTime
    }));

    const templateData = {
      min_advance_days: bookingSettings.minAdvanceDays,
      max_advance_days: bookingSettings.maxAdvanceDays,
      time_slots: timeSlotData,
      is_active: 1
    };

    // 调用API保存
    if (templateId) {
      // 更新现有模板
      await api.timeTemplate.update(templateId, templateData);
    } else {
      // 创建新模板
      const result = await api.timeTemplate.create(templateData);
      this.setData({
        templateId: result.data.id
      });
    }
  }
}) 