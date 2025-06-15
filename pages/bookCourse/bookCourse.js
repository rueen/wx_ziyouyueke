/**
 * pages/bookCourse/bookCourse.js
 * 统一约课页面 - 支持教练约学员和学员约教练
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 约课类型：'coach-book-student' 或 'student-book-coach'
    bookingType: '',
    
    // 来源信息
    from: '', // 'home', 'studentDetail', 'coachDetail', 'studentList', 'coachList'
    
    // 预设信息
    presetId: '', // 预设的教练ID或学员ID
    presetName: '', // 预设的教练名称或学员名称
    
    // 选择对象相关
    availableOptions: [], // 可选择的教练或学员列表
    selectedOption: null, // 已选择的教练或学员
    showSelection: false, // 是否显示选择界面
    showEmptyState: false, // 是否显示空状态
    
    // 时间选择相关
    selectedCoachId: '', // 用于时间选择器的教练ID
    selectedDate: '',
    selectedTimeSlot: '',
    
    // 地址相关
    addresses: [], // 地址列表
    selectedAddress: null, // 选择的地址
    showAddressSelection: false, // 是否显示地址选择
    
    // 表单数据
    remark: '', // 备注
    
    // 状态
    isLoading: false,
    canSubmit: false, // 是否可以提交
    isSubmitting: false // 是否正在提交
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('约课页面参数:', options);
    
    const { 
      type, 
      from, 
      coachId, 
      coachName, 
      studentId, 
      studentName 
    } = options;
    
    // 设置约课类型
    let bookingType = type;
    if (!bookingType) {
      // 根据参数推断约课类型
      if (coachId || coachName) {
        bookingType = 'student-book-coach';
      } else if (studentId || studentName) {
        bookingType = 'coach-book-student';
      } else {
        bookingType = 'coach-book-student'; // 默认
      }
    }
    
    this.setData({
      bookingType,
      from: from || 'home',
      presetId: coachId || studentId || '',
      presetName: decodeURIComponent(coachName || studentName || '')
    });
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: bookingType === 'coach-book-student' ? '约学员上课' : '约教练上课'
    });
    
    // 加载数据
    this.loadInitialData();
  },

  /**
   * 加载初始数据
   */
  async loadInitialData() {
    this.setData({ isLoading: true });
    
    try {
      // 先加载可选择的教练或学员
      await this.loadAvailableOptions();
      
      // 如果是教练约学员，直接加载地址
      // 如果是学员约教练，等选择教练后再加载对应教练的地址
      if (this.data.bookingType === 'coach-book-student') {
        await this.loadAddresses();
      }
      
      // 处理预设选择
      this.handlePresetSelection();
      
    } catch (error) {
      console.error('加载初始数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 加载可选择的教练或学员列表
   */
  async loadAvailableOptions() {
    const { bookingType } = this.data;
    
    try {
      let result;
      if (bookingType === 'coach-book-student') {
        // 教练约学员：获取我的学员列表（排除剩余课时为0的）
        result = await api.relation.getMyStudents();
        if (result && result.data && result.data.students) {
          // API返回的数据在result.data.students中
          const dataArray = Array.isArray(result.data.students) ? result.data.students : [];
          const students = dataArray
            .filter(item => item.remaining_lessons > 0) // 排除剩余课时为0的学员
            .map(item => ({
              id: item.id,
              name: (item.student && item.student.nickname) || '未知学员',
              avatar: (item.student && item.student.avatar_url) || '/images/defaultAvatar.png',
              remainingLessons: item.remaining_lessons || 0,
              phone: (item.student && item.student.phone) || ''
            }));
          
          this.setData({
            availableOptions: students
          });
        }
      } else {
        // 学员约教练：获取可约教练列表（排除剩余课时为0的）
        result = await api.relation.getMyCoaches();
        if (result && result.data && result.data.coaches) {
          // API返回的数据在result.data.coaches中
          const dataArray = Array.isArray(result.data.coaches) ? result.data.coaches : [];
          const coaches = dataArray
            .filter(item => item.remaining_lessons > 0) // 排除剩余课时为0的教练
            .map(item => ({
              id: item.id,
              name: (item.coach && item.coach.nickname) || '未知教练',
              avatar: (item.coach && item.coach.avatar_url) || '/images/defaultAvatar.png',
              remainingLessons: item.remaining_lessons || 0,
              phone: (item.coach && item.coach.phone) || ''
            }));
          
          this.setData({
            availableOptions: coaches
          });
        }
      }
    } catch (error) {
      console.error('加载可选对象失败:', error);
      this.setData({
        availableOptions: []
      });
    }
  },

  /**
   * 加载地址列表
   * @param {number} coachId 教练ID（可选，用于获取指定教练的地址）
   */
  async loadAddresses(coachId = null) {
    try {
      const params = {};
      if (coachId) {
        params.coach_id = coachId;
      }
      
      const result = await api.address.getList(params);
      if (result && result.data && result.data.addresses) {
        // API返回的数据在result.data.addresses中
        const addresses = Array.isArray(result.data.addresses) ? result.data.addresses : [];
        this.setData({
          addresses: addresses
        });
      }
    } catch (error) {
      console.error('加载地址列表失败:', error);
      this.setData({
        addresses: []
      });
    }
  },

  /**
   * 处理预设选择
   */
  handlePresetSelection() {
    const { presetId, availableOptions } = this.data;
    
    if (presetId && availableOptions.length > 0) {
      // 有预设ID，查找对应的选项
      const preset = availableOptions.find(option => option.id == presetId);
      if (preset) {
        this.selectOption(preset);
        return;
      }
    }
    
    // 没有预设或找不到预设，根据可选项数量决定
    if (availableOptions.length === 0) {
      // 没有可选项，显示空状态（不使用toast）
      this.setData({
        showSelection: true,
        showEmptyState: true
      });
    } else if (availableOptions.length === 1) {
      // 只有一个选项，直接选中
      this.selectOption(availableOptions[0]);
    } else {
      // 多个选项，显示选择界面
      this.setData({
        showSelection: true,
        showEmptyState: false
      });
    }
  },

  /**
   * 选择教练或学员
   */
  async selectOption(option) {
    const { bookingType } = this.data;
    
    // 获取当前用户信息，用于教练约学员时的时间选择器
    const userInfo = wx.getStorageSync('userInfo');
    const coachId = bookingType === 'student-book-coach' ? option.id : (userInfo ? userInfo.id : '');
    
    this.setData({
      selectedOption: option,
      showSelection: false,
      showEmptyState: false,
      selectedCoachId: coachId,
      selectedDate: '',
      selectedTimeSlot: '',
      selectedAddress: null,
      remark: ''
    });
    
    // 如果是学员约教练，选择教练后加载该教练的地址
    if (bookingType === 'student-book-coach') {
      await this.loadAddresses(option.id);
    }
    
    this.checkCanSubmit();
  },

  /**
   * 点击选择对象
   */
  onSelectOption(e) {
    const option = e.currentTarget.dataset.option;
    this.selectOption(option);
  },

  /**
   * 更换选择
   */
  onChangeSelection() {
    const { availableOptions } = this.data;
    
    this.setData({
      showSelection: true,
      showEmptyState: availableOptions.length === 0,
      selectedDate: '',
      selectedTimeSlot: '',
      selectedAddress: null,
      remark: '',
      addresses: [] // 清空地址列表，重新选择后再加载
    });
    this.checkCanSubmit();
  },

  /**
   * 时间选择器事件 - 时间段被点击
   */
  onTimeSlotTap(e) {
    const { date, slot } = e.detail;
    this.setData({
      selectedDate: date || '',
      selectedTimeSlot: slot || ''
    });
    this.checkCanSubmit();
  },

  /**
   * 时间选择器错误处理
   */
  onTimeSelectorError(e) {
    const { message } = e.detail;
    console.error('时间选择器错误:', message);
    wx.showToast({
      title: message || '时间加载失败',
      icon: 'none'
    });
  },

  /**
   * 选择地址
   */
  onSelectAddress(e) {
    const address = e.currentTarget.dataset.address;
    this.setData({
      selectedAddress: address,
      showAddressSelection: false
    });
    this.checkCanSubmit();
  },

  /**
   * 显示地址选择
   */
  onShowAddressSelection() {
    this.setData({
      showAddressSelection: true
    });
  },

  /**
   * 隐藏地址选择
   */
  onHideAddressSelection() {
    this.setData({
      showAddressSelection: false
    });
  },

  /**
   * 输入备注
   */
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    });
  },

  /**
   * 检查是否可以提交
   */
  checkCanSubmit() {
    const { selectedOption, selectedDate, selectedTimeSlot, selectedAddress } = this.data;
    const canSubmit = !!(selectedOption && selectedDate && selectedTimeSlot && selectedAddress);
    this.setData({
      canSubmit: canSubmit
    });
  },

  /**
   * 提交约课
   */
  async onSubmitBooking() {
    const { 
      bookingType, 
      selectedOption, 
      selectedDate, 
      selectedTimeSlot, 
      selectedAddress, 
      remark,
      isSubmitting 
    } = this.data;
    
    if (isSubmitting) {
      return; // 防止重复提交
    }
    
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请完善约课信息',
        icon: 'none'
      });
      return;
    }
    
    try {
      this.setData({ isSubmitting: true });
      
      wx.showLoading({
        title: '提交中...'
      });
      
      // 构建提交数据
      const bookingData = {
        date: selectedDate,
        time_slot: selectedTimeSlot,
        address_id: selectedAddress.id,
        remark: remark.trim()
      };
      
      if (bookingType === 'coach-book-student') {
        // 教练约学员
        bookingData.student_relation_id = selectedOption.id;
      } else {
        // 学员约教练
        bookingData.coach_relation_id = selectedOption.id;
      }
      
      console.log('提交约课数据:', bookingData);
      
      // 调用API提交约课
      const result = await api.course.create(bookingData);
      
      wx.hideLoading();
      
      if (result && result.success) {
        wx.showToast({
          title: '约课成功',
          icon: 'success',
          duration: 1500,
          success: () => {
            setTimeout(() => {
              wx.navigateBack({
                delta: 1
              });
            }, 1500);
          }
        });
        
        console.log('约课成功:', result.data);
      } else {
        throw new Error(result.message || '约课失败');
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('提交约课失败:', error);
      
      const errorMessage = error.message || '约课失败，请重试';
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
}) 