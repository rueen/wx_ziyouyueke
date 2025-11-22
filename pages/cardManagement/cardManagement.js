/**
 * pages/cardManagement/cardManagement.js
 * 卡片设置页面（教练端 - 卡片模板管理）
 */

const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    cardList: [], // 卡片模板列表
    loading: false,
    showAddModal: false, // 显示添加/编辑卡片弹窗
    editingCard: null, // 当前编辑的卡片
    
    // 表单数据
    formData: {
      card_name: '',
      card_color: '#007aff',
      card_lessons: '',
      valid_days: '',
      card_desc: '',
      is_unlimited: false // 是否无限次数
    },
    
    // 可选颜色列表
    colorList: ['#dfb247', '#65a7b5', '#bc8f8f', '#a2845e', '#c1cbd7', '#d2b48c'
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadCardList();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 加载卡片模板列表
   */
  async loadCardList() {
    try {
      this.setData({ loading: true });
      
      const result = await api.card.getTemplateList();
      
      if (result && result.data) {
        this.setData({
          cardList: result.data.list || []
        });
      }
    } catch (error) {
      console.error('加载卡片列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /**
   * 显示添加卡片弹窗
   */
  onShowAddModal() {
    this.setData({
      showAddModal: true,
      editingCard: null,
      formData: {
        card_name: '',
        card_color: '#007aff',
        card_lessons: '',
        valid_days: '',
        card_desc: '',
        is_unlimited: false
      }
    });
  },

  /**
   * 显示编辑卡片弹窗
   */
  onShowEditModal(e) {
    const { card } = e.currentTarget.dataset;
    this.setData({
      showAddModal: true,
      editingCard: card,
      formData: {
        card_name: card.card_name,
        card_color: card.card_color,
        card_lessons: card.is_unlimited ? '' : String(card.card_lessons || ''),
        valid_days: String(card.valid_days),
        card_desc: card.card_desc || '',
        is_unlimited: card.is_unlimited
      }
    });
  },

  /**
   * 隐藏弹窗
   */
  onHideModal() {
    this.setData({
      showAddModal: false,
      editingCard: null
    });
  },

  /**
   * 阻止弹窗关闭（阻止事件冒泡）
   */
  onPreventClose() {
    // 空函数，用于阻止事件冒泡到遮罩层
  },

  /**
   * 表单输入处理
   */
  onFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  /**
   * 选择颜色
   */
  onSelectColor(e) {
    const { color } = e.currentTarget.dataset;
    this.setData({
      'formData.card_color': color
    });
  },

  /**
   * 切换无限次数
   */
  onToggleUnlimited(e) {
    const { value } = e.detail;
    this.setData({
      'formData.is_unlimited': value
    });
  },

  /**
   * 保存卡片
   */
  async onSaveCard() {
    const { formData, editingCard } = this.data;
    
    // 验证表单
    if (!formData.card_name.trim()) {
      wx.showToast({
        title: '请输入卡片名称',
        icon: 'none'
      });
      return;
    }
    
    if (!formData.is_unlimited && !formData.card_lessons) {
      wx.showToast({
        title: '请输入课时数或选择无限次数',
        icon: 'none'
      });
      return;
    }
    
    if (!formData.valid_days) {
      wx.showToast({
        title: '请输入有效天数',
        icon: 'none'
      });
      return;
    }
    
    try {
      wx.showLoading({ title: '保存中...' });
      
      const requestData = {
        card_name: formData.card_name.trim(),
        card_color: formData.card_color,
        card_lessons: formData.is_unlimited ? null : parseInt(formData.card_lessons),
        valid_days: parseInt(formData.valid_days),
        card_desc: formData.card_desc.trim()
      };
      
      let result;
      if (editingCard) {
        // 编辑
        result = await api.card.updateTemplate(editingCard.id, requestData);
      } else {
        // 新增
        result = await api.card.createTemplate(requestData);
      }
      
      wx.hideLoading();
      
      if (result && result.success) {
        wx.showToast({
          title: editingCard ? '保存成功' : '创建成功',
          icon: 'success'
        });
        
        this.onHideModal();
        this.loadCardList();
      }
    } catch (error) {
      wx.hideLoading();
      console.error('保存卡片失败:', error);
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      });
    }
  },

  /**
   * 启用/禁用卡片
   */
  async onToggleActive(e) {
    const { card } = e.currentTarget.dataset;
    
    try {
      wx.showLoading({ title: '操作中...' });
      
      const result = await api.card.toggleTemplate(card.id);
      
      wx.hideLoading();
      
      if (result && result.success) {
        wx.showToast({
          title: card.is_active ? '已禁用' : '已启用',
          icon: 'success'
        });
        
        this.loadCardList();
      }
    } catch (error) {
      wx.hideLoading();
      console.error('切换状态失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  /**
   * 删除卡片
   */
  onDeleteCard(e) {
    const { card } = e.currentTarget.dataset;
    
    if (card.is_active) {
      wx.showToast({
        title: '请先禁用卡片',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '删除后不影响已发放的卡片实例，确定删除吗？',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });
            
            const result = await api.card.deleteTemplate(card.id);
            
            wx.hideLoading();
            
            if (result && result.success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              this.loadCardList();
            }
          } catch (error) {
            wx.hideLoading();
            console.error('删除卡片失败:', error);
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
});
