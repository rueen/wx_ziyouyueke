/**
 * pages/studentCards/studentCards.js
 * 学员卡片管理页面（教练视角）
 */

const api = require('../../utils/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    studentId: null,
    studentName: '',
    relationId: null,
    cardList: [], // 学员的卡片实例列表
    loading: false,
    
    showAddModal: false, // 显示添加卡片弹窗
    templateList: [], // 可用的卡片模板列表
    selectedTemplateId: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.studentId && options.relationId) {
      const studentName = options.studentName ? decodeURIComponent(options.studentName) : '';
      this.setData({
        studentId: parseInt(options.studentId),
        relationId: parseInt(options.relationId),
        studentName: studentName
      }, () => {
        this.loadCardList();
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 加载学员的卡片实例列表
   */
  async loadCardList() {
    const { studentId } = this.data;
    
    try {
      this.setData({ loading: true });
      
      const result = await api.card.getStudentCards(studentId);
      
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
  async onShowAddModal() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      // 获取启用的卡片模板列表
      const result = await api.card.getActiveTemplates();
      
      wx.hideLoading();
      
      if (result && result.data) {
        const templates = result.data.list || [];
        
        if (templates.length === 0) {
          wx.showModal({
            title: '提示',
            content: '暂无可用的卡片模板，请先在课程卡设置中创建并启用卡片模板',
            showCancel: false
          });
          return;
        }
        
        this.setData({
          showAddModal: true,
          templateList: templates,
          selectedTemplateId: templates[0]?.id || null
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载卡片模板失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 隐藏添加卡片弹窗
   */
  onHideAddModal() {
    this.setData({
      showAddModal: false,
      selectedTemplateId: null
    });
  },

  /**
   * 选择卡片模板
   */
  onSelectTemplate(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({
      selectedTemplateId: id
    });
  },

  /**
   * 确认添加卡片
   */
  async onConfirmAdd() {
    const { studentId, relationId, selectedTemplateId } = this.data;
    
    if (!selectedTemplateId) {
      wx.showToast({
        title: '请选择卡片模板',
        icon: 'none'
      });
      return;
    }
    
    try {
      wx.showLoading({ title: '添加中...' });
      
      const result = await api.card.createInstance({
        student_id: studentId,
        relation_id: relationId,
        coach_card_id: selectedTemplateId
      });
      
      wx.hideLoading();
      
      if (result && result.success) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
        
        this.onHideAddModal();
        this.loadCardList();
      }
    } catch (error) {
      wx.hideLoading();
      console.error('添加卡片失败:', error);
      wx.showToast({
        title: error.message || '添加失败',
        icon: 'none'
      });
    }
  },

  /**
   * 开卡
   */
  onActivateCard(e) {
    const { card } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认开卡',
      content: '开卡后，学员可以使用该卡片预约课程',
      confirmColor: '#007aff',
      success: async (res) => {
        if (res.confirm) {
          await this.handleCardAction(card.id, 'activate', '开卡');
        }
      }
    });
  },

  /**
   * 停卡
   */
  onDeactivateCard(e) {
    const { card } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认停卡',
      content: '停卡后，学员无法使用该卡片预约课程，但不影响已预约的课程',
      confirmColor: '#ff9500',
      success: async (res) => {
        if (res.confirm) {
          await this.handleCardAction(card.id, 'deactivate', '停卡');
        }
      }
    });
  },

  /**
   * 重新开启
   */
  onReactivateCard(e) {
    const { card } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认重新开启',
      content: '重新开启后，学员可以继续使用该卡片预约课程',
      confirmColor: '#007aff',
      success: async (res) => {
        if (res.confirm) {
          await this.handleCardAction(card.id, 'reactivate', '重新开启');
        }
      }
    });
  },

  /**
   * 删除卡片
   */
  onDeleteCard(e) {
    const { card } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定删除吗？',
      confirmColor: '#ff3b30',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' });
            
            const result = await api.card.deleteCard(card.id);
            
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
  },

  /**
   * 处理卡片操作（开卡/停卡/重新开启）
   */
  async handleCardAction(cardId, action, actionName) {
    try {
      wx.showLoading({ title: `${actionName}中...` });
      
      let result;
      switch(action) {
        case 'activate':
          result = await api.card.activateCard(cardId);
          break;
        case 'deactivate':
          result = await api.card.deactivateCard(cardId);
          break;
        case 'reactivate':
          result = await api.card.reactivateCard(cardId);
          break;
      }
      
      wx.hideLoading();
      
      if (result && result.success) {
        wx.showToast({
          title: `${actionName}成功`,
          icon: 'success'
        });
        
        this.loadCardList();
      }
    } catch (error) {
      wx.hideLoading();
      console.error(`${actionName}失败:`, error);
      wx.showToast({
        title: error.message || `${actionName}失败`,
        icon: 'none'
      });
    }
  },

  /**
   * 查看卡片详情
   */
  onViewDetail(e) {
    const { card } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/cardDetail/cardDetail?cardId=${card.id}`
    });
  },

  /**
   * 阻止事件冒泡
   */
  onPreventClose() {
    // 空函数，用于阻止事件冒泡
  },

  /**
   * 获取卡片状态文本
   */
  getStatusText(card) {
    if (card.is_expired) {
      return '已过期';
    }
    switch (card.card_status) {
      case 0:
        return '未开启';
      case 1:
        return '已开启';
      case 2:
        return '已停用';
      default:
        return '未知状态';
    }
  },

  /**
   * 获取卡片状态类名
   */
  getStatusClass(card) {
    if (card.is_expired) {
      return 'expired';
    }
    switch (card.card_status) {
      case 0:
        return 'inactive';
      case 1:
        return 'active';
      case 2:
        return 'deactivated';
      default:
        return '';
    }
  }
});
