const api = require('../../utils/api');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    loading: true,
    isSubmitting: false,
    templates: [],
    templateItems: [],
    errorMessage: ''
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadSubscribeData();
  },

  /**
   * 加载订阅消息模板与配额数据
   * @returns {Promise<void>}
   */
  async loadSubscribeData() {
    this.setData({
      loading: true,
      errorMessage: ''
    });

    try {
      const [templatesRes, quotasRes] = await Promise.all([
        api.subscribeMessage.getTemplates(),
        api.subscribeMessage.getQuotas()
      ]);

      const templates = (templatesRes && templatesRes.data && templatesRes.data.list) || [];
      const quotas = (quotasRes && quotasRes.data && quotasRes.data.list) || [];

      const { items } = this.formatTemplatesWithQuotas(templates, quotas);

      this.setData({
        loading: false,
        templates,
        templateItems: items,
        errorMessage: ''
      });
    } catch (error) {
      console.error('[SubscribeMessage] 加载数据失败', error);
      const message = (error && (error.message || (error.data && error.data.message))) || '加载失败，请稍后重试';
      this.setData({
        loading: false,
        errorMessage: message
      });
    }
  },

  /**
   * 根据模板与配额数据生成展示信息
   * @param {Array<Object>} templates 模板列表
   * @param {Array<Object>} quotas 配额列表
   * @returns {{items: Array<Object>}}
   */
  formatTemplatesWithQuotas(templates = [], quotas = []) {
    const quotaMap = {};
    quotas.forEach((quota) => {
      if (quota.templateType) {
        quotaMap[quota.templateType] = quota;
      }
      if (quota.templateId) {
        quotaMap[quota.templateId] = quota;
      }
    });

    let totalRemaining = 0;
    let totalQuota = 0;

    const items = templates.map((template) => {
      const quotaRecord = quotaMap[template.templateType] || quotaMap[template.templateId] || {};
      const remainingQuota = quotaRecord.remainingQuota !== undefined ? quotaRecord.remainingQuota : 0;
      const totalQuotaCount = quotaRecord.totalQuota !== undefined ? quotaRecord.totalQuota : 0;

      totalRemaining += remainingQuota;
      totalQuota += totalQuotaCount;

      return {
        ...template,
        remainingQuota,
        totalQuota: totalQuotaCount
      };
    });

    return {
      items,
    };
  },

  /**
   * 订阅全部模板
   */
  handleSubscribeAll() {
    if (!this.data.templateItems.length) {
      wx.showToast({
        title: '暂无可订阅的消息',
        icon: 'none'
      });
      return;
    }
    if (this.data.isSubmitting) {
      return;
    }

    this.setData({
      isSubmitting: true
    });

    const tmplIds = this.data.templateItems.map((item) => item.templateId);

    wx.requestSubscribeMessage({
      tmplIds,
      success: (res) => {
        this.handleSubscribeResponse(res, this.data.templateItems);
      },
      fail: (error) => {
        console.error('[SubscribeMessage] 批量订阅失败', error);
        wx.showToast({
          title: '订阅请求失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          isSubmitting: false
        });
      }
    });
  },

  /**
   * 订阅单个模板
   * @param {Object} event 事件对象
   */
  handleSubscribeSingle(event) {
    if (this.data.isSubmitting) {
      return;
    }

    const { templateId, templateType } = event.currentTarget.dataset;
    const targetTemplate = this.data.templates.find((item) => item.templateId === templateId && item.templateType === templateType);

    if (!targetTemplate) {
      wx.showToast({
        title: '未找到对应的模板',
        icon: 'none'
      });
      return;
    }

    this.setData({
      isSubmitting: true
    });

    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: (res) => {
        this.handleSubscribeResponse(res, [targetTemplate]);
      },
      fail: (error) => {
        console.error('[SubscribeMessage] 单个订阅失败', error);
        wx.showToast({
          title: '订阅请求失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          isSubmitting: false
        });
      }
    });
  },

  /**
   * 处理订阅授权结果
   * @param {Object} result 微信订阅回调结果
   * @param {Array<Object>} templates 关联模板列表
   */
  async handleSubscribeResponse(result, templates) {
    const payload = [];
    let acceptCount = 0;

    templates.forEach((template) => {
      const status = result && result[template.templateId];
      if (status === undefined) {
        return;
      }
      if (status === 'accept') {
        acceptCount += 1;
      }
      payload.push({
        templateType: template.templateType,
        status
      });
    });

    if (!payload.length) {
      if (acceptCount === 0) {
        wx.showToast({
          title: '未授权订阅',
          icon: 'none'
        });
      }
      return;
    }

    try {
      await api.subscribeMessage.reportResults(payload);
      await this.refreshQuotas();

      if (acceptCount > 0) {
        wx.showToast({
          title: `订阅成功${acceptCount}条`,
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '已更新订阅状态',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('[SubscribeMessage] 上报订阅结果失败', error);
      const message = (error && (error.message || (error.data && error.data.message))) || '更新失败，请稍后重试';
      wx.showToast({
        title: message,
        icon: 'none'
      });
    }
  },

  /**
   * 刷新配额数据
   * @returns {Promise<void>}
   */
  async refreshQuotas() {
    try {
      const res = await api.subscribeMessage.getQuotas();
      const quotas = (res && res.data && res.data.list) || [];
      const { items } = this.formatTemplatesWithQuotas(this.data.templates, quotas);
      this.setData({
        templateItems: items,
      });
    } catch (error) {
      console.error('[SubscribeMessage] 刷新配额失败', error);
    }
  },
});