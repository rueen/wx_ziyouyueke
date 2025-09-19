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
    availableOptions: [], // 可选择的教练或学员列表（包括课时为0的）
    selectedOption: null, // 已选择的教练或学员
    showOptionSelection: false, // 是否显示选择弹窗
    
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
        // 教练约学员：获取我的学员列表（包括剩余课时为0的）
        result = await api.relation.getMyStudents({
          limit: 200
        });
        if (result && result.data && result.data.list) {
          // API返回的数据在result.data.list中
          const dataArray = Array.isArray(result.data.list) ? result.data.list : [];
          const students = dataArray.map(item => ({
            id: item.id,
            name: (item.student && item.student.nickname) || '未知学员',
            avatar: (item.student && item.student.avatar_url) || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
            remainingLessons: item.remaining_lessons || 0,
            phone: (item.student && item.student.phone) || '',
            student_id: item.student_id,
            coach_id: item.coach_id,
            originalData: item // 保存原始数据
          }));
          
          this.setData({
            availableOptions: students
          });
        }
      } else {
        // 学员约教练：获取可约教练列表（包括剩余课时为0的）
        result = await api.relation.getMyCoachList();
        if (result && result.data && result.data.list) {
          // API返回的数据在result.data.list中
          const dataArray = Array.isArray(result.data.list) ? result.data.list : [];
          const coaches = dataArray.map(item => ({
            id: item.id,
            name: (item.coach && item.coach.nickname) || '未知教练',
            avatar: (item.coach && item.coach.avatar_url) || 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
            remainingLessons: item.remaining_lessons || 0,
            phone: (item.coach && item.coach.phone) || '',
            student_id: item.student_id,
            coach_id: item.coach_id,
            originalData: item // 保存原始数据
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
      const params = {
        limit: 200
      };
      if (coachId) {
        params.coach_id = coachId;
      }
      
      const result = await api.address.getList(params);
      if (result && result.data && result.data.list) {
        // API返回的数据在result.data.list中
        const addresses = Array.isArray(result.data.list) ? result.data.list : [];
        this.setData({
          addresses: addresses
        });
        
        // 自动选择默认地址
        this.autoSelectDefaultAddress(addresses);
      }
    } catch (error) {
      console.error('加载地址列表失败:', error);
      this.setData({
        addresses: []
      });
    }
  },

  /**
   * 自动选择默认地址
   * @param {Array} addresses 地址列表
   */
  autoSelectDefaultAddress(addresses) {
    if (!addresses || addresses.length === 0) {
      return;
    }
    
    let defaultAddress = null;
    
    // 首先查找标记为默认的地址
    defaultAddress = addresses.find(addr => !!addr.is_default);

    // 如果没有找到默认地址，选择第一个地址
    if (!defaultAddress && addresses.length > 0) {
      defaultAddress = addresses[0];
    }
    
    // 设置默认选中的地址
    if (defaultAddress) {
      this.setData({
        selectedAddress: defaultAddress
      });
      
      // 重新检查提交条件
      this.checkCanSubmit();
    }
  },

  /**
   * 处理预设选择
   */
  handlePresetSelection() {
    const { presetId, availableOptions, bookingType } = this.data;
    
    if (presetId && availableOptions.length > 0) {
      // 有预设ID，查找对应的选项
      let preset = null;
      
      if (bookingType === 'student-book-coach') {
        // 学员约教练：presetId是教练的用户ID，需要匹配coach_id字段
        preset = availableOptions.find(option => option.coach_id == presetId);
      } else {
        // 教练约学员：presetId是学员的用户ID，需要匹配student_id字段
        preset = availableOptions.find(option => option.student_id == presetId);
      }
      
      if (preset) {
        this.selectOption(preset);
        return;
      }
    }
    
    // 没有预设或找不到预设，选择第一个课时>0的选项
    if (availableOptions.length > 0) {
      const firstValidOption = availableOptions.find(option => option.remainingLessons > 0);
      if (firstValidOption) {
        this.selectOption(firstValidOption);
      } else {
        // 所有选项的课时都为0，显示提示但不自动选择
        wx.showToast({
          title: '暂无可用课时',
          icon: 'none'
        });
      }
    }
  },

  /**
   * 选择教练或学员
   */
  async selectOption(option) {
    const { bookingType } = this.data;
    
    // 检查课时是否充足
    if (option.remainingLessons <= 0) {
      wx.showToast({
        title: '该选项剩余课时不足',
        icon: 'none'
      });
      return;
    }
    
    // 获取当前用户信息，用于教练约学员时的时间选择器
    const userInfo = wx.getStorageSync('userInfo');
    const coachId = bookingType === 'student-book-coach' ? option.coach_id : (userInfo ? userInfo.id : '');

    // 根据约课类型决定是否重置地址
    const updateData = {
      selectedOption: option,
      showOptionSelection: false,
      selectedCoachId: coachId,
      selectedDate: '',
      selectedTimeSlot: '',
      remark: ''
    };
    
    // 如果是学员约教练，需要重置地址（因为教练变了）
    // 如果是教练约学员，不重置地址（因为教练没变）
    if (bookingType === 'student-book-coach') {
      updateData.selectedAddress = null;
    }
    
    this.setData(updateData);
    
    // 如果是学员约教练，选择教练后加载该教练的地址并自动选择默认地址
    if (bookingType === 'student-book-coach') {
      await this.loadAddresses(option.coach_id);
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
   * 更换选择 - 显示选择弹窗
   */
  onChangeSelection() {
    // 清理时间选择和备注，但保持地址选择（对于教练约学员场景）
    const { bookingType } = this.data;
    const updateData = {
      showOptionSelection: true,
      selectedDate: '',
      selectedTimeSlot: '',
      remark: ''
    };
    
    // 如果是学员约教练，需要清空地址相关数据（因为要重新选择教练）
    if (bookingType === 'student-book-coach') {
      updateData.selectedAddress = null;
      updateData.addresses = [];
    }
    
    this.setData(updateData);
    this.checkCanSubmit();
  },

  /**
   * 显示选择对象弹窗
   */
  onShowOptionSelection() {
    this.setData({
      showOptionSelection: true
    });
  },

  /**
   * 隐藏选择对象弹窗
   */
  onHideOptionSelection() {
    this.setData({
      showOptionSelection: false
    });
  },

  /**
   * 时间选择器事件 - 时间段被点击
   */
  onTimeSlotTap(e) {
    const { date, slot } = e.detail;

    if(slot.status === 'full'){
      wx.showToast({
        title: '该时段已满员',
        icon: 'none'
      });
      return;
    }
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
    const canSubmit = !!(selectedOption && selectedOption.remainingLessons > 0 && selectedDate && selectedTimeSlot && selectedAddress);
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
      
      // 检查必要的数据
      if (!selectedTimeSlot || !selectedTimeSlot.startTime || !selectedTimeSlot.endTime) {
        throw new Error('时间信息不完整，请重新选择时间');
      }
      
      if (!selectedOption.coach_id || !selectedOption.student_id) {
        throw new Error('师生关系数据不完整，请重新选择');
      }
      
      // 构建提交数据
      const bookingData = {
        course_date: selectedDate,
        start_time: selectedTimeSlot.startTime,
        end_time: selectedTimeSlot.endTime,
        address_id: selectedAddress.id,
        relation_id: selectedOption.id
      };
      
      // 添加备注
      if (remark && remark.trim()) {
        if (bookingType === 'coach-book-student') {
          // 教练约学员，备注作为教练备注
          bookingData.coach_remark = remark.trim();
        } else {
          // 学员约教练，备注作为学员备注
          bookingData.student_remark = remark.trim();
        }
      }
      
      // 直接从师生关系数据中获取coach_id和student_id
      if (bookingType === 'coach-book-student') {
        // 教练约学员
        bookingData.coach_id = selectedOption.coach_id;
        bookingData.student_id = selectedOption.student_id;
      } else {
        // 学员约教练  
        bookingData.student_id = selectedOption.student_id;
        bookingData.coach_id = selectedOption.coach_id;
      }
      
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