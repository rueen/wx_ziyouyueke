/**
 * pages/coachSettings/coachSettings.js
 * 教练更多设置页面 - 取消次数限制、课程完成方式等
 */

const api = require('../../utils/api.js');

/** 统计周期选项 */
const TIME_WINDOW_OPTIONS = [
  { value: 'day',     label: '每自然日' },
  { value: 'week',    label: '每自然周' },
  { value: 'month',   label: '每自然月' },
  { value: 'quarter', label: '每自然季度' },
  { value: 'year',    label: '每自然年' }
];

Page({
  data: {
    loading: true,
    saving: false,

    // 取消次数限制
    isEnabled: false,
    timeWindowIndex: 1, // 默认：每自然周
    maxCount: 3,

    // 课程完成方式
    completionMethod: 'scan', // scan | manual

    // 活动签到方式
    groupCheckinMethod: 'scan', // scan | button

    // 选项数据
    timeWindowOptions: TIME_WINDOW_OPTIONS,
    timeWindowLabels: TIME_WINDOW_OPTIONS.map(o => o.label)
  },

  onLoad() {
    this.loadSettings();
  },

  /**
   * 从接口加载当前设置（取消次数限制 + 课程完成方式并行加载）
   */
  async loadSettings() {
    try {
      this.setData({ loading: true });

      const [cancellationRes, coachSettingsRes] = await Promise.all([
        api.cancellationSettings.get(),
        api.coachSettings.get()
      ]);

      const update = {};

      if (cancellationRes && cancellationRes.data) {
        const { is_enabled, time_window, max_count } = cancellationRes.data;
        const index = TIME_WINDOW_OPTIONS.findIndex(o => o.value === time_window);
        update.isEnabled = !!is_enabled;
        update.timeWindowIndex = index >= 0 ? index : 1;
        update.maxCount = max_count || 3;
      }

      if (coachSettingsRes && coachSettingsRes.data) {
        update.completionMethod = coachSettingsRes.data.completion_method || 'scan';
        update.groupCheckinMethod = coachSettingsRes.data.group_checkin_method || 'scan';
      }

      this.setData(update);
    } catch (error) {
      console.error('加载设置失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 切换「开启取消次数限制」开关
   */
  onToggleEnabled(e) {
    this.setData({ isEnabled: e.detail.value });
  },

  /**
   * 统计周期 picker 变化
   */
  onTimeWindowChange(e) {
    this.setData({ timeWindowIndex: parseInt(e.detail.value) });
  },

  /**
   * 最大取消次数输入
   */
  onMaxCountInput(e) {
    const val = parseInt(e.detail.value);
    this.setData({ maxCount: isNaN(val) || val < 1 ? '' : val });
  },

  /**
   * 课程完成方式变更
   * @param {Object} e radio-group change 事件
   */
  onCompletionMethodChange(e) {
    this.setData({ completionMethod: e.detail.value });
  },

  /**
   * 活动签到方式变更
   * @param {Object} e radio-group change 事件
   */
  onGroupCheckinMethodChange(e) {
    this.setData({ groupCheckinMethod: e.detail.value });
  },

  /**
   * 保存所有设置（取消次数限制 + 课程完成方式并行保存）
   */
  async onSave() {
    const { isEnabled, timeWindowIndex, maxCount, timeWindowOptions, completionMethod, groupCheckinMethod, saving } = this.data;
    if (saving) return;

    if (isEnabled) {
      if (!maxCount || maxCount < 1) {
        wx.showToast({ title: '请输入有效的取消次数', icon: 'none' });
        return;
      }
    }

    try {
      this.setData({ saving: true });
      wx.showLoading({ title: '保存中...' });

      await Promise.all([
        api.cancellationSettings.save({
          is_enabled: isEnabled ? 1 : 0,
          time_window: timeWindowOptions[timeWindowIndex].value,
          max_count: maxCount || 3
        }),
        api.coachSettings.save({
          completion_method: completionMethod,
          group_checkin_method: groupCheckinMethod
        })
      ]);

      // 同步更新 globalData，使修改立即生效
      const app = getApp();
      app.globalData.coachSettings.completion_method = completionMethod;
      app.globalData.coachSettings.group_checkin_method = groupCheckinMethod;

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (error) {
      wx.hideLoading();
      console.error('保存设置失败:', error);
      wx.showToast({ title: error.message || '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
