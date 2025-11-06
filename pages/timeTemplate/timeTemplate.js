/**
 * pages/timeTemplate/timeTemplate.js
 * 时间模板页面 - 支持添加/删除时间段并实时同步到后端API
 */

// 引入API工具类
const api = require('../../utils/api.js');
const { weekSlotTemplateDefault } = require('../../utils/consts.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    template: {}, // 存储原始数据
    // 预约设置
    bookingSettings: {
      minAdvanceDays: 1, // 最少需要提前几天预约
      maxAdvanceDays: 30, // 最多可预约未来几天
      maxAdvanceNums: 1, // 同时段最多可预约人数
    },
    
    // 模板启用状态
    templateEnabled: true, // 默认启用
    templateId: null, // 模板ID
    
    //日期模板（一周的日期模板）
    dateSlotTemplate: [{
      id: 0,
      text: '周日',
      checked: true
    }, {
      id: 1,
      text: '周一',
      checked: true
    }, {
      id: 2,
      text: '周二',
      checked: true
    }, {
      id: 3,
      text: '周三',
      checked: true
    }, {
      id: 4,
      text: '周四',
      checked: true
    }, {
      id: 5,
      text: '周五',
      checked: true
    }, {
      id: 6,
      text: '周六',
      checked: true
    }],

    // 时间段模板（一天的时间段模板）
    timeSlotTemplate: [],
    
    // 添加时间段的表单数据
    showAddForm: false,
    newStartTime: '',
    newEndTime: '',
    currentWeekIndex: null, // 当前选中的星期几索引（用于按周历循环模板）
    
    // 设置表单数据
    showSettingsForm: false,
    tempMinAdvanceDays: 1,
    tempMaxAdvanceDays: 30,
    tempMaxAdvanceNums: 1,

    // 时间类型
    timeTypeArr: [{
      type: 0,
      text: '全日程统一模板(每天一样)'
    }, {
      type: 1,
      text: '按周历循环模板(每周几一样)'
    },
    // {
    //   type: 2,
    //   text: '自由日程模板(每个日期都可以不一样)'
    // }
    ],
    time_type: 0, // 0：全日程统一模板(每天一样)；1:按周历循环模板(每周几一样)；2:自由日程模板(每个日期都可以不一样)
    isEditTimeType: false,
    // 按周历循环模板
    weekSlotTemplate: weekSlotTemplateDefault,
    isSaving: false
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
        
        // 解析时间段数据（全日程统一模板）
        let timeSlots = [];
        try {
          timeSlots = template.time_slots || [];
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
        
        // 解析按周历循环模板数据
        let weekSlots = [];
        try {
          if (template.week_slots && Array.isArray(template.week_slots) && template.week_slots.length > 0) {
            weekSlots = template.week_slots.map(week => ({
              id: week.id,
              text: week.text,
              checked: week.checked !== undefined ? week.checked : true,
              time_slots: (week.time_slots || []).map((slot, index) => ({
                id: index + 1,
                startTime: slot.startTime,
                endTime: slot.endTime
              }))
            }));
          } else {
            // 如果没有数据，使用默认的周历模板
            weekSlots = this.data.weekSlotTemplate;
          }
        } catch (e) {
          console.error('解析周历模板数据失败:', e);
          weekSlots = this.data.weekSlotTemplate;
        }
        
        this.setData({
          template: template,
          bookingSettings: {
            minAdvanceDays: template.min_advance_days,
            maxAdvanceDays: template.max_advance_days,
            maxAdvanceNums: template.max_advance_nums
          },
          timeSlotTemplate: timeSlots,
          weekSlotTemplate: weekSlots,
          dateSlotTemplate: template.date_slots || this.data.dateSlotTemplate,
          time_type: template.time_type !== undefined ? template.time_type : 0,
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
      tempMaxAdvanceDays: bookingSettings.maxAdvanceDays,
      tempMaxAdvanceNums: bookingSettings.maxAdvanceNums
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
      tempMinAdvanceDays: parseInt(e.detail.value) || ''
    });
  },

  /**
   * 最多提前天数变化
   */
  onMaxAdvanceDaysChange(e) {
    this.setData({
      tempMaxAdvanceDays: parseInt(e.detail.value) || ''
    });
  },

  onMaxAdvanceNumsChange(e) {
    this.setData({
      tempMaxAdvanceNums: parseInt(e.detail.value) || ''
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
    const { tempMinAdvanceDays, tempMaxAdvanceDays, tempMaxAdvanceNums, timeSlotTemplate, templateId } = this.data;
    
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

    if(!tempMaxAdvanceNums) {
      wx.showToast({
        title: '请输入有效的人数',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '保存中...'
      });

      const templateData = {
        min_advance_days: tempMinAdvanceDays,
        max_advance_days: tempMaxAdvanceDays,
        max_advance_nums: tempMaxAdvanceNums,
        is_active: 1
      };

      // 调用API保存
      if (templateId) {
        // 更新现有模板
        await api.timeTemplate.update(templateId, templateData);
      }

      wx.hideLoading();

      this.setData({
        bookingSettings: {
          minAdvanceDays: tempMinAdvanceDays,
          maxAdvanceDays: tempMaxAdvanceDays,
          maxAdvanceNums: tempMaxAdvanceNums
        },
        templateEnabled: true,
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
   * @param {Object} e 事件对象，可能包含星期几的索引
   */
  onShowAddForm(e) {
    const weekIndex = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.weekIndex : undefined;
    this.setData({
      showAddForm: true,
      newStartTime: '',
      newEndTime: '',
      currentWeekIndex: weekIndex !== undefined ? weekIndex : null
    });
  },

  /**
   * 隐藏添加表单
   */
  onHideAddForm() {
    this.setData({
      showAddForm: false,
      newStartTime: '',
      newEndTime: '',
      currentWeekIndex: null
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
    const { newStartTime, newEndTime, time_type } = this.data;
    
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

    if(time_type === 0) {
      const { timeSlotTemplate } = this.data;

      // 检查时间重叠
      const hasOverlap = this.checkTimeOverlap(newStartTime, newEndTime, timeSlotTemplate);
      
      if (hasOverlap) {
        wx.showToast({
          title: '时间段重叠，请重新选择',
          icon: 'none'
        });
        return;
      }

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

      this.setData({
        timeSlotTemplate: updatedTemplate,
        showAddForm: false,
        newStartTime: '',
        newEndTime: ''
      });
    } else if(time_type === 1) {
      const { weekSlotTemplate, currentWeekIndex } = this.data;
      
      // 检查是否选中了星期几
      if (currentWeekIndex === null || currentWeekIndex === undefined) {
        wx.showToast({
          title: '请先选择星期几',
          icon: 'none'
        });
        return;
      }

      // 获取当前星期几的时间段列表
      const currentWeekSlots = weekSlotTemplate[currentWeekIndex].time_slots || [];

      // 检查时间重叠
      const hasOverlap = this.checkTimeOverlap(newStartTime, newEndTime, currentWeekSlots);
      
      if (hasOverlap) {
        wx.showToast({
          title: '时间段重叠，请重新选择',
          icon: 'none'
        });
        return;
      }

      // 生成新的时间段
      const newTimeSlot = {
        id: Date.now(), // 简单的ID生成
        startTime: newStartTime,
        endTime: newEndTime
      };

      // 更新对应星期几的时间段列表
      const updatedWeekSlotTemplate = [...weekSlotTemplate];
      const updatedTimeSlots = [...currentWeekSlots, newTimeSlot];
      
      // 按时间排序
      updatedTimeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      updatedWeekSlotTemplate[currentWeekIndex].time_slots = updatedTimeSlots;

      this.setData({
        weekSlotTemplate: updatedWeekSlotTemplate,
        showAddForm: false,
        newStartTime: '',
        newEndTime: '',
        currentWeekIndex: null
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
   * @param {Object} e 事件对象
   */
  onDeleteTimeSlot(e) {
    const { slotIndex, weekIndex } = e.currentTarget.dataset;
    const { time_type } = this.data;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个时间段吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '删除中...'
            });

            if (time_type === 0) {
              // 全日程统一模板
              const { timeSlotTemplate } = this.data;
              const updatedTemplate = [...timeSlotTemplate];
              
              updatedTemplate.splice(slotIndex, 1);
              
              this.setData({
                timeSlotTemplate: updatedTemplate
              });
            } else if (time_type === 1) {
              // 按周历循环模板
              const { weekSlotTemplate } = this.data;
              
              if (weekIndex === undefined || weekIndex === null) {
                wx.hideLoading();
                wx.showToast({
                  title: '删除失败，参数错误',
                  icon: 'none'
                });
                return;
              }

              const updatedWeekSlotTemplate = [...weekSlotTemplate];
              const currentWeekSlots = [...updatedWeekSlotTemplate[weekIndex].time_slots];
              
              currentWeekSlots.splice(slotIndex, 1);
              
              updatedWeekSlotTemplate[weekIndex].time_slots = currentWeekSlots;
              
              this.setData({
                weekSlotTemplate: updatedWeekSlotTemplate
              });
            }

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
   * 日期模板
   */
  switchDateChange(e) {
    const { target: { dataset: { index } }, detail: { value } } = e;
    const _dateSlotTemplate = [...this.data.dateSlotTemplate];
    _dateSlotTemplate[index].checked = value;
    this.setData({
      dateSlotTemplate: _dateSlotTemplate
    })
  },

  // 时间类型
  timeTypeRadioChange(e) {
    this.setData({
      time_type: e.detail.value - 0
    })
  },
  handleEditTimeType() {
    this.setData({
      isEditTimeType: true
    })
  },
  handleCancelTimeType() {
    const { template } = this.data;
    
    // 重新加载数据以恢复原始状态
    this.loadTimeSettings().then(() => {
      this.setData({
        isEditTimeType: false
      });
    });
  },
  async handleSaveTimeType() {
    const { templateId, time_type, timeSlotTemplate, dateSlotTemplate, weekSlotTemplate } = this.data;
    
    try {
      wx.showLoading({
        title: '保存中...'
      });
      this.setData({
        isSaving: true
      })
      
      let templateData = {
        time_type
      };

      if (time_type === 0) {
        // 全日程统一模板：准备时间段数据（移除ID字段，只保留时间）
        const timeSlotData = timeSlotTemplate.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime
        }));
        templateData.time_slots = timeSlotData;
        templateData.date_slots = dateSlotTemplate;
      } else if (time_type === 1) {
        // 按周历循环模板：准备周历时间段数据
        const weekSlotData = weekSlotTemplate.map(week => ({
          id: week.id,
          text: week.text,
          checked: week.checked,
          time_slots: (week.time_slots || []).map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime
          }))
        }));
        templateData.week_slots = weekSlotData;
      }
      console.log(JSON.stringify(templateData.week_slots))

      if (templateId) {
        // 更新现有模板
        await api.timeTemplate.update(templateId, templateData);
      }
      
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      this.setData({
        'template.time_type': time_type,
        isSaving: false,
        isEditTimeType: false
      });
    } catch (e) {
      wx.hideLoading();
      console.error('保存时间模板失败:', e);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
      this.setData({
        isSaving: false
      });
    }
  },
  switchWeekSlotChange(e) {
    const { target: { dataset: { index } }, detail: { value } } = e;
    const _weekSlotTemplate = [...this.data.weekSlotTemplate];
    _weekSlotTemplate[index].checked = value;
    this.setData({
      weekSlotTemplate: _weekSlotTemplate
    })
  },
  
}) 