// pages/groupCourseAdd/groupCourseAdd.js
const api = require('../../utils/api.js')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 页面模式：add-新增，edit-编辑
    mode: 'add',
    courseId: null,
    
    // 表单数据
    formData: {
      title: '',
      content: '',
      course_date: '',
      start_time: '',
      end_time: '',
      duration: 90,
      max_participants: 10,
      min_participants: 1,
      price_type: 1, // 1-扣课时，2-金额展示，3-免费
      category_id: 0, // 课程分类ID
      lesson_cost: 1,
      price_amount: 0,
      enrollment_scope: 1, // 1-仅学员，2-所有人
      address_id: null,
      is_show: null,
    },
    
    // 图片相关
    cover_images: [],
    images: [],
    
    // 选项数据
    priceTypes: [
      { value: 1, label: '扣课时（1课时）' },
      { value: 2, label: '线下收费' },
      { value: 3, label: '免费' }
    ],
    
    enrollmentScopes: [
      { value: 1, label: '仅学员' },
      { value: 2, label: '所有人' }
    ],

    // 课程分类
    categoryList: [],
    
    // 地址列表
    addresses: [],
    selectedAddress: null,
    showAddressSelection: false,
    
    // 时间选择器相关
    selectedTimeSlot: null,
    currentUserId: null,
    
    
    // 页面状态
    loading: false,
    saving: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 判断是新增还是编辑模式
    if (options.id) {
      this.setData({
        mode: 'edit',
        courseId: parseInt(options.id)
      })
      this.loadCourseDetail()
    } else {
      this.setData({
        mode: 'add'
      })
      this.initFormData()
    }
    
    // 加载地址列表
    this.loadAddresses()
    // 加载课程分类列表
    this.loadCategoryList()
    // 获取当前用户ID
    this.getCurrentUserId()
  },

  /**
   * 初始化表单数据
   */
  initFormData() {
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
    
    this.setData({
      'formData.course_date': this.formatDate(tomorrow)
    })
  },

  async loadCategoryList() {
    try {
      const res = await api.categories.getList();
      if(res.success) {
        const list = res.data || [];
        this.setData({
          categoryList: list.map(item => ({...item, value: item.id}))
        })
      }
    } catch (error) {

    }
  },

  getTimeSlot(time) {
    return `${time.split(':')[0]}:${time.split(':')[1]}`
  },
  /**
   * 加载课程详情（编辑模式）
   */
  loadCourseDetail() {
    const { courseId } = this.data
    
    wx.showLoading({
      title: '加载中...'
    })
    
    this.setData({
      loading: true
    })

    api.groupCourse.getDetail(courseId)
      .then(res => {
        if (res.success && res.data) {
          const course = {
            ...res.data,
            start_time: this.getTimeSlot(res.data.start_time),
            end_time: this.getTimeSlot(res.data.end_time)
          }
          
          // 填充表单数据
          this.setData({
            formData: {
              title: course.title,
              content: course.content,
              course_date: course.course_date,
              start_time: course.start_time,
              end_time: course.end_time,
              duration: course.duration,
              max_participants: course.max_participants,
              min_participants: course.min_participants,
              price_type: course.price_type, // 1-扣课时，2-金额展示，3-免费
              category_id: course.category_id, // 课程分类ID
              lesson_cost: course.lesson_cost,
              price_amount: course.price_amount,
              enrollment_scope: course.enrollment_scope, // 1-仅学员，2-所有人
              address_id: course.address_id,
              is_show: course.is_show
            },
            cover_images: course.cover_images || [],
            images: course.images || [],
            selectedAddress: course.address || null
          })
          // 如果有选中的时间，构造时间选择器数据
          if (course.course_date && course.start_time && course.end_time) {
            this.setData({
              selectedTimeSlot: {
                id: `${course.course_date}_${course.start_time}_${course.end_time}`,
                course_date: course.course_date,
                start_time: course.start_time,
                end_time: course.end_time
              }
            })
          }
        }
      })
      .catch(err => {
        console.error('加载课程详情失败:', err)
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        })
      })
      .finally(() => {
        wx.hideLoading()
        this.setData({
          loading: false
        })
      })
  },

  /**
   * 加载地址列表
   */
  async loadAddresses() {
    try {
      const params = {
        limit: 200
      }
      
      const result = await api.address.getList(params)
      if (result && result.data) {
        let addresses = []
        
        // 处理不同的API返回格式
        if (result.data.list && Array.isArray(result.data.list)) {
          // API返回的数据在result.data.list中
          addresses = result.data.list
        } else if (Array.isArray(result.data)) {
          // API直接返回数组
          addresses = result.data
        }
        
        this.setData({
          addresses: addresses
        })
        
        // 自动选择默认地址
        this.autoSelectDefaultAddress(addresses)
      }
    } catch (error) {
      console.error('加载地址列表失败:', error)
      this.setData({
        addresses: []
      })
    }
  },

  /**
   * 自动选择默认地址
   * @param {Array} addresses 地址列表
   */
  autoSelectDefaultAddress(addresses) {
    if (!addresses || addresses.length === 0) {
      return
    }
    
    let defaultAddress = null
    
    // 首先查找标记为默认的地址
    defaultAddress = addresses.find(addr => !!addr.is_default)

    // 如果没有找到默认地址，选择第一个地址
    if (!defaultAddress && addresses.length > 0) {
      defaultAddress = addresses[0]
    }
    
    // 设置默认选中的地址
    if (defaultAddress) {
      this.setData({
        selectedAddress: defaultAddress,
        'formData.address_id': defaultAddress.id
      })
    }
  },

  /**
   * 输入框变化事件
   */
  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    
    this.setData({
      [`formData.${field}`]: value
    })
  },

  /**
   * 选择器变化事件
   */
  priceTypeOnPickerChange(e) {
    const { priceTypes } = this.data;
    const { value } = e.detail

    this.setData({
      ['formData.price_type']: priceTypes[value].value
    })
  },
  categoryIdOnPickerChange(e) {
    const { categoryList } = this.data;
    const { value } = e.detail

    this.setData({
      ['formData.category_id']: categoryList[value].value
    })
  },
  enrollmentScopeOnPickerChange(e){
    const { enrollmentScopes } = this.data;
    const { value } = e.detail

    this.setData({
      ['formData.enrollment_scope']: enrollmentScopes[value].value
    })
  },

  /**
   * 计算课程时长
   */
  calculateDuration() {
    const { start_time, end_time } = this.data.formData
    
    if (start_time && end_time) {
      const start = new Date(`2000-01-01T${start_time}:00`)
      const end = new Date(`2000-01-01T${end_time}:00`)
      const duration = Math.max(0, (end - start) / (1000 * 60))
      
      this.setData({
        'formData.duration': Math.round(duration)
      })
    }
  },

  /**
   * 获取当前用户ID
   */
  getCurrentUserId() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.id) {
      this.setData({
        currentUserId: userInfo.id
      })
    }
  },

  /**
   * 显示地址选择弹窗
   */
  onShowAddressSelection() {
    this.setData({
      showAddressSelection: true
    })
  },

  /**
   * 隐藏地址选择弹窗
   */
  onHideAddressSelection() {
    this.setData({
      showAddressSelection: false
    })
  },

  /**
   * 选择地址
   */
  onSelectAddress(e) {
    const { address } = e.currentTarget.dataset
    
    this.setData({
      selectedAddress: address,
      'formData.address_id': address.id,
      showAddressSelection: false
    })
  },

  /**
   * 时间选择器事件处理
   */
  onTimeSlotTap(e) {
    const { date, slot } = e.detail

    if (slot && slot.status === 'full') {
      wx.showToast({
        title: '该时段已满员',
        icon: 'none'
      })
      return
    }

    if (date && slot) {
      this.setData({
        selectedTimeSlot: slot,
        'formData.course_date': date,
        'formData.start_time': slot.startTime,
        'formData.end_time': slot.endTime
      })
      
      // 自动计算课程时长
      this.calculateDuration()
    }
  },

  /**
   * 时间选择器错误处理
   */
  onTimeSelectorError(e) {
    const { message } = e.detail
    console.error('时间选择器错误:', message)
    wx.showToast({
      title: message || '时间加载失败',
      icon: 'none'
    })
  },

  /**
   * 选择封面图片
   */
  onChooseCoverImage() {
    const maxCount = 3 - this.data.cover_images.length
    
    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImages(res.tempFilePaths, 'cover')
      }
    })
  },

  /**
   * 选择详情图片
   */
  onChooseDetailImage() {
    const maxCount = 9 - this.data.images.length
    
    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadImages(res.tempFilePaths, 'detail')
      }
    })
  },

  /**
   * 上传图片
   */
  uploadImages(filePaths, type) {
    wx.showLoading({
      title: '上传中...'
    })
    
    const uploadPromises = filePaths.map(filePath => {
      return api.upload.groupCourse(filePath)
    })
    
    Promise.all(uploadPromises)
      .then(responses => {
        const urls = responses.map(res => res.data.url)
        
        if (type === 'cover') {
          this.setData({
            cover_images: [...this.data.cover_images, ...urls]
          })
        } else {
          this.setData({
            images: [...this.data.images, ...urls]
          })
        }
        
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        })
      })
      .catch(err => {
        console.error('图片上传失败:', err)
        wx.showToast({
          title: '上传失败',
          icon: 'error'
        })
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  /**
   * 删除图片
   */
  onDeleteImage(e) {
    const { type, index } = e.currentTarget.dataset
    
    if (type === 'cover') {
      const cover_images = [...this.data.cover_images]
      cover_images.splice(index, 1)
      this.setData({
        cover_images
      })
    } else {
      const images = [...this.data.images]
      images.splice(index, 1)
      this.setData({
        images
      })
    }
  },

  /**
   * 预览图片
   */
  onPreviewImage(e) {
    const { type, index, urls } = e.currentTarget.dataset
    
    wx.previewImage({
      current: urls[index],
      urls: urls
    })
  },

  /**
   * 表单验证
   */
  validateForm() {
    const { formData, cover_images } = this.data
    
    if (!formData.title.trim()) {
      wx.showToast({
        title: '请输入课程标题',
        icon: 'none'
      })
      return false
    }
    
    
    if (!this.data.selectedTimeSlot || !formData.course_date || !formData.start_time || !formData.end_time) {
      wx.showToast({
        title: '请选择上课时间',
        icon: 'none'
      })
      return false
    }

    if(formData.max_participants > 100) {
      wx.showToast({
        title: '最大参与人数不可超过100人',
        icon: 'none'
      })
      return false;
    }
    
    if (formData.price_type === 2 && formData.price_amount <= 0) {
      wx.showToast({
        title: '请输入费用金额',
        icon: 'none'
      })
      return false
    }

    return true
  },

  isShowChange(e) {
    this.setData({
      'formData.is_show': e.detail.value - 0
    })
  },

  /**
   * 仅保存课程（不跳转）
   */
  onSaveOnly() {
    this.saveCourse(false)
  },

  /**
   * 保存并预览课程
   */
  onSaveAndPreview() {
    this.saveCourse(true)
  },

  /**
   * 保存课程
   * @param {boolean} shouldPreview 是否跳转到预览页面
   */
  saveCourse(shouldPreview = false) {
    if (!this.validateForm()) {
      return
    }
    
    this.setData({
      saving: true
    })
    
    const { formData, cover_images, images, mode, courseId } = this.data
    
    const params = {
      ...formData,
      cover_images,
      images
    }
    
    const apiCall = mode === 'add' 
      ? api.groupCourse.create(params)
      : api.groupCourse.update(courseId, params)
    
    apiCall
      .then(res => {
        if (res.success) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          
          if (shouldPreview) {
            // 跳转到预览页面
            const id = mode === 'add' ? res.data.id : courseId
            wx.redirectTo({
              url: `/pages/groupCourseDetail/groupCourseDetail?courseId=${id}&mode=preview`
            })
          } else {
            // 仅保存，不跳转，更新模式为编辑
            if (mode === 'add' && res.data && res.data.id) {
              this.setData({
                mode: 'edit',
                courseId: res.data.id
              })
            }
          }
        } else {
          wx.showToast({
            title: res.message || '保存失败',
            icon: 'error'
          })
        }
      })
      .catch(err => {
        console.error('保存失败:', err)
        wx.showToast({
          title: '保存失败',
          icon: 'error'
        })
      })
      .finally(() => {
        this.setData({
          saving: false
        })
      })
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  /**
   * 格式化日期时间
   */
  formatDateTime(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    return `${year}-${month}-${day}T${hour}:${minute}:00`
  }
})
