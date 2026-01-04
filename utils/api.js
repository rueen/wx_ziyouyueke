/**
 * API接口调用工具类
 * 基于API文档的接口封装
 */

// 引入工具类
const { compressImage } = require('./util.js');

// API基础配置
const API_CONFIG = {
  // baseUrl: 'http://localhost:3000',
  baseUrl: 'https://api.rueen.cn',
  timeout: 10000
};

/**
 * 发起HTTP请求的通用方法
 * @param {Object} options 请求配置
 * @returns {Promise} 请求结果
 */
function request(options) {
  return new Promise((resolve, reject) => {
    // 获取Token
    const token = wx.getStorageSync('token');
    
    // 构建请求头
    const header = {
      'Content-Type': 'application/json',
      ...options.header
    };
    
    // 如果有token且需要认证，添加Authorization头
    if (token && options.auth !== false) {
      header.Authorization = `Bearer ${token}`;
    }
    
    // 构建完整URL
    const url = options.url.startsWith('http') 
      ? options.url 
      : `${API_CONFIG.baseUrl}${options.url}`;
    
    wx.request({
      url,
      method: options.method || 'GET',
      data: options.data || {},
      header,
      timeout: options.timeout || API_CONFIG.timeout,
      success(res) {
        
        // 检查HTTP状态码
        if (res.statusCode !== 200) {
          // 处理HTTP层面的认证失败
          if (res.statusCode === 401 || res.statusCode === 403) {
            handleTokenExpired();
            return; // 直接返回，不再reject，因为已经处理跳转
          }
          
          // 尝试从响应数据中获取具体错误信息
          let errorMessage = `HTTP ${res.statusCode}`;
          if (res.data && res.data.message) {
            errorMessage = res.data.message;
          } else if (res.data && typeof res.data === 'string') {
            errorMessage = res.data;
          }
          
          reject({
            code: res.data && res.data.code ? res.data.code : res.statusCode,
            message: errorMessage,
            data: res.data
          });
          return;
        }
        
        // 检查业务状态码
        if (res.data && res.data.success === false) {
          // Token过期处理 - 扩展处理更多token过期相关的错误码
          if (res.data.code === 1002 || res.data.code === 2002 || 
              res.data.code === 401 || res.data.code === 403 || 
              res.data.message === 'Token已过期' || 
              res.data.message === 'Token无效' ||
              res.data.message === '未授权访问') {
            handleTokenExpired();
            return; // 直接返回，不再reject，因为已经处理跳转
          }
          reject(res.data);
          return;
        }
        
        resolve(res.data);
      },
      fail(err) {
        console.error(`[API Error] ${url}`, err);
        reject({
          code: -1,
          message: '网络请求失败',
          error: err
        });
      }
    });
  });
}

// 防止重复处理token过期
let isHandlingTokenExpired = false;

/**
 * 处理Token过期
 */
function handleTokenExpired() {
  // 防止重复处理
  if (isHandlingTokenExpired) {
    return;
  }
  isHandlingTokenExpired = true;
  
  // 清除登录相关的本地存储
  wx.removeStorageSync('token');
  wx.removeStorageSync('userInfo');
  wx.removeStorageSync('isLoggedIn');
  wx.removeStorageSync('loginType');
  wx.removeStorageSync('userRole');
  
  // 重新设置为游客模式
  const guestUserInfo = {
    id: null,
    nickname: '游客用户',
    avatar_url: 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
    loginType: 'guest'
  };
  
  wx.setStorageSync('userInfo', guestUserInfo);
  wx.setStorageSync('isLoggedIn', true);
  wx.setStorageSync('loginType', 'guest');
  wx.setStorageSync('userRole', 'student');
  
  // 显示提示并跳转到首页（而不是登录页）
  wx.showToast({
    title: '登录已过期，已切换为游客模式',
    icon: 'none',
    duration: 2000,
    success() {
      // 延迟跳转到首页
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index',
          success() {
            isHandlingTokenExpired = false;
          },
          fail() {
            console.error('[API] 跳转首页失败');
            isHandlingTokenExpired = false;
          }
        });
      }, 1500);
    }
  });
}

// ========== 认证模块 ==========

/**
 * 用户登录
 * @param {Object} params 登录参数
 * @param {string} params.code 微信登录凭证
 * @param {Object} params.userInfo 用户信息
 * @param {number} params.coach_id 教练ID（可选）
 * @returns {Promise}
 */
function login(params) {
  return request({
    url: '/api/h5/auth/login',
    method: 'POST',
    data: params,
    auth: false // 登录接口不需要认证
  });
}

/**
 * 用户登出
 * @returns {Promise}
 */
function logout() {
  return request({
    url: '/api/h5/auth/logout',
    method: 'POST'
  });
}

/**
 * 刷新Token
 * @param {string} token 当前Token
 * @returns {Promise}
 */
function refreshToken(token) {
  return request({
    url: '/api/h5/auth/refresh',
    method: 'POST',
    data: { token },
    auth: false
  });
}

/**
 * 验证Token
 * @returns {Promise}
 */
function verifyToken() {
  return request({
    url: '/api/h5/auth/verify',
    method: 'GET'
  });
}

// ========== 用户信息模块 ==========

/**
 * 获取用户信息
 * @returns {Promise}
 */
function getUserProfile() {
  return request({
    url: '/api/h5/user/profile',
    method: 'GET'
  });
}

/**
 * 更新用户信息
 * @param {Object} userInfo 用户信息
 * @returns {Promise}
 */
function updateUserProfile(userInfo) {
  return request({
    url: '/api/h5/user/profile',
    method: 'PUT',
    data: userInfo
  });
}

/**
 * 解密微信手机号
 * @param {string} code 微信手机号加密数据
 * @returns {Promise}
 */
function decryptPhoneNumber(code) {
  return request({
    url: '/api/h5/user/decrypt-phone',
    method: 'POST',
    data: { code }
  });
}

// ========== 时间模板模块 ==========

/**
 * 获取时间模板列表
 * @param {number} coach_id 教练ID（可选）
 * @returns {Promise}
 */
function getTimeTemplates(coach_id) {
  const params = coach_id ? { coach_id } : {};
  return request({
    url: '/api/h5/time-templates',
    method: 'GET',
    data: params
  });
}

/**
 * 更新时间模板
 * @param {number} id 模板ID
 * @param {Object} template 时间模板数据
 * @returns {Promise}
 */
function updateTimeTemplate(id, template) {
  return request({
    url: `/api/h5/time-templates/${id}`,
    method: 'PUT',
    data: template
  });
}

/**
 * 启用/禁用时间模板
 * @param {number} id 模板ID
 * @returns {Promise}
 */
function toggleTimeTemplate(id) {
  return request({
    url: `/api/h5/time-templates/${id}/toggle`,
    method: 'PUT'
  });
}

/**
 * 获取订阅消息模板列表
 * @returns {Promise}
 */
function getSubscribeTemplates() {
  return request({
    url: '/api/h5/wechat/subscribe-templates',
    method: 'GET'
  });
}

/**
 * 获取订阅消息配额信息
 * @returns {Promise}
 */
function getSubscribeQuotas() {
  return request({
    url: '/api/h5/wechat/subscribe-quotas',
    method: 'GET'
  });
}

/**
 * 上报订阅消息授权结果
 * @param {Array<Object>} results 授权结果列表
 * @returns {Promise}
 */
function reportSubscribeResults(results = []) {
  return request({
    url: '/api/h5/wechat/subscribe-quotas',
    method: 'POST',
    data: {
      results
    }
  });
}

// ========== 师生关系模块 ==========
/**
 * 绑定师生关系
 * @param {Object} relation 师生关系数据
 * @returns {Promise}
 */
function createRelation(relation) {
  return request({
    url: '/api/h5/relations',
    method: 'POST',
    data: relation
  });
}

/**
 * 获取我的学员列表
 * @param {Object} params 查询参数
 * @param {number} params.page 页码，默认1
 * @param {number} params.limit 每页数量，默认10
 * @returns {Promise}
 */
function getMyStudents(params = {}) {
  return request({
    url: '/api/h5/relations/my-students',
    method: 'GET',
    data: params
  });
}

/**
 * 更新师生关系
 * @param {number} id 关系ID
 * @param {Object} relation 师生关系数据
 * @returns {Promise}
 */
function updateRelation(id, relation) {
  return request({
    url: `/api/h5/relations/${id}`,
    method: 'PUT',
    data: relation
  });
}

/**
 * 解除师生关系
 * @param {number} id 关系ID
 * @returns {Promise}
 */
function deleteRelation(id) {
  return request({
    url: `/api/h5/relations/${id}`,
    method: 'DELETE'
  });
}

// ========== 课程管理模块 ==========

/**
 * 获取课程列表
 * @param {Object} params 查询参数
 * @returns {Promise}
 */
function getCourses(params = {}) {
  return request({
    url: '/api/h5/courses',
    method: 'GET',
    data: params
  });
}

/**
 * 预约课程
 * @param {Object} course 课程数据
 * @returns {Promise}
 */
function bookCourse(course) {
  return request({
    url: '/api/h5/courses',
    method: 'POST',
    data: course
  });
}

/**
 * 确认课程
 * @param {number} courseId 课程ID
 * @param {Object} data 确认数据
 * @returns {Promise}
 */
function confirmCourse(courseId, data = {}) {
  return request({
    url: `/api/h5/courses/${courseId}/confirm`,
    method: 'PUT',
    data: data
  });
}

/**
 * 取消课程
 * @param {number} courseId 课程ID
 * @param {Object} data 取消数据
 * @returns {Promise}
 */
function cancelCourse(courseId, data = {}) {
  return request({
    url: `/api/h5/courses/${courseId}/cancel`,
    method: 'PUT',
    data: data
  });
}

/**
 * 完成课程
 * @param {number} courseId 课程ID
 * @param {Object} data 完成数据
 * @returns {Promise}
 */
function completeCourse(courseId, data = {}) {
  return request({
    url: `/api/h5/courses/${courseId}/complete`,
    method: 'PUT',
    data: data
  });
}

// 删除课程
function deleteCourse(courseId, data = {}){
  return request({
    url: `/api/h5/courses/${courseId}`,
    method: 'DELETE',
    data: data
  });
}

/**
 * 获取课程详情
 * @param {number} courseId 课程ID
 * @returns {Promise}
 */
function getCourseDetail(courseId) {
  return request({
    url: `/api/h5/courses/${courseId}`,
    method: 'GET'
  });
}

// ========== 教练模块 ==========

/**
 * 获取我的教练列表（当前学员绑定的教练列表）
 * @param {Object} params 查询参数
 * @param {number} params.page 页码，默认1
 * @param {number} params.limit 每页数量，默认20
 * @returns {Promise}
 */
function getMyCoachList(params = {}) {
  return request({
    url: '/api/h5/relations/my-coaches',
    method: 'GET',
    data: params
  });
}

/**
 * 获取用户详情（通用接口，可用于获取教练或学员详情）
 * @param {number} userId 用户ID
 * @returns {Promise}
 */
function getUserDetail(userId) {
  return request({
    url: `/api/h5/user/${userId}`,
    method: 'GET',
    auth: false // 该接口为公开接口，无需认证
  });
}

// ========== 地址管理模块 ==========

/**
 * 获取地址列表
 * @param {Object} params 查询参数
 * @returns {Promise}
 */
function getAddressList(params = {}) {
  return request({
    url: '/api/h5/addresses',
    method: 'GET',
    data: params
  });
}

/**
 * 创建地址
 * @param {Object} address 地址信息
 * @returns {Promise}
 */
function createAddress(address) {
  return request({
    url: '/api/h5/addresses',
    method: 'POST',
    data: address
  });
}

/**
 * 更新地址
 * @param {number} id 地址ID
 * @param {Object} address 地址信息
 * @returns {Promise}
 */
function updateAddress(id, address) {
  return request({
    url: `/api/h5/addresses/${id}`,
    method: 'PUT',
    data: address
  });
}

/**
 * 删除地址
 * @param {number} id 地址ID
 * @returns {Promise}
 */
function deleteAddress(id) {
  return request({
    url: `/api/h5/addresses/${id}`,
    method: 'DELETE'
  });
}

// ========== 文件上传模块 ==========

/**
 * 上传图片（自动压缩）
 * @param {string} filePath 本地文件路径
 * @param {string} directory 上传目录，支持：images、avatar、documents、temp，默认为images
 * @param {Object} compressOptions 压缩选项
 * @returns {Promise}
 */
async function uploadImage(filePath, directory = 'images', compressOptions = {}) {
  try {
    // 先压缩图片
    console.log(`[API Upload] 开始压缩图片: ${filePath}`);
    const compressResult = await compressImage(filePath, compressOptions);
    const compressedFilePath = compressResult.tempFilePath;
    
    console.log(`[API Upload] 图片压缩完成，开始上传到目录: ${directory}`);
    
    // 上传压缩后的图片
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token');
      
      wx.uploadFile({
        url: `${API_CONFIG.baseUrl}/api/upload/image`,
        filePath: compressedFilePath,
        name: 'file',
        formData: {
          directory: directory
        },
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              // 在返回数据中添加压缩信息
              data.compressInfo = {
                originalSize: compressResult.originalSize,
                compressedSize: compressResult.compressedSize,
                compressionRatio: Math.round((1 - compressResult.compressedSize / compressResult.originalSize) * 100)
              };
              console.log(`[API Upload] 上传成功，压缩率: ${data.compressInfo.compressionRatio}%`);
              resolve(data);
            } else {
              // Token过期处理
              if (data.code === 1002 || data.code === 2002) {
                handleTokenExpired();
              }
              reject(data);
            }
          } catch (e) {
            reject({
              code: -1,
              message: '响应解析失败',
              error: e
            });
          }
        },
        fail: (error) => {
          console.error(`[API Upload Error] /api/upload/image (directory: ${directory})`, error);
          reject({
            code: -1,
            message: '上传失败',
            error: error
          });
        }
      });
    });
  } catch (error) {
    console.error('[API Upload] 图片压缩失败，使用原图上传:', error);
    
    // 压缩失败时，使用原图上传
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('token');
      
      wx.uploadFile({
        url: `${API_CONFIG.baseUrl}/api/upload/image`,
        filePath: filePath,
        name: 'file',
        formData: {
          directory: directory
        },
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success) {
              resolve(data);
            } else {
              // Token过期处理
              if (data.code === 1002 || data.code === 2002) {
                handleTokenExpired();
              }
              reject(data);
            }
          } catch (e) {
            reject({
              code: -1,
              message: '响应解析失败',
              error: e
            });
          }
        },
        fail: (error) => {
          console.error(`[API Upload Error] /api/upload/image (directory: ${directory})`, error);
          reject({
            code: -1,
            message: '上传失败',
            error: error
          });
        }
      });
    });
  }
}



// ========== 健康检查 ==========

/**
 * 服务健康检查
 * @returns {Promise}
 */
function healthCheck() {
  return request({
    url: '/health',
    method: 'GET',
    auth: false
  });
}

// 导出API方法
module.exports = {
  // 基础方法
  request,
  
  // 认证模块
  auth: {
    login,
    logout,
    refreshToken,
    verifyToken
  },
  
  // 用户信息模块
  user: {
    getProfile: getUserProfile,
    updateProfile: updateUserProfile,
    decryptPhone: decryptPhoneNumber,
    getDetail: getUserDetail
  },
  
  // 时间模板模块
  timeTemplate: {
    getList: getTimeTemplates,
    update: updateTimeTemplate,
    toggle: toggleTimeTemplate
  },

  // 订阅消息模块
  subscribeMessage: {
    getTemplates: getSubscribeTemplates,
    getQuotas: getSubscribeQuotas,
    reportResults: reportSubscribeResults
  },
  
  // 师生关系模块
  relation: {
    create: createRelation,
    getMyStudents,
    getMyStudentsDetail: function(id, params = {}) {
      return request({
        url: `/api/h5/relations/my-students/${id}`,
        method: 'GET',
        data: params
      });
    },
    getMyCoachList,
    getMyCoachDetail: function(id, params = {}) {
      return request({
        url: `/api/h5/relations/my-coaches/${id}`,
        method: 'GET',
        data: params
      });
    },
    update: updateRelation,
    delete: deleteRelation,
    // 切换约课状态
    switchBookingStatus: function(id, params = {}) {
      return request({
        url: `/api/h5/relations/${id}/booking-status`,
        method: 'PUT',
        data: params
      });
    },
    // 编辑师生关系权限
    permissions: function(id, params = {}) {
      return request({
        url: `/api/h5/relations/${id}/permissions`,
        method: 'PATCH',
        data: params
      });
    },
  },

  // 课程管理模块
  course: {
    getList: getCourses,
    create: bookCourse, // 创建课程的别名
    book: bookCourse,
    confirm: confirmCourse,
    cancel: cancelCourse,
    complete: completeCourse,
    delete: deleteCourse,
    getDetail: getCourseDetail,
    edit: function(id, params = {}) {
      return request({
        url: `/api/h5/courses/${id}`,
        method: 'PUT',
        data: params
      });
    }
  },

  // 地址管理模块
  address: {
    getList: getAddressList,
    create: createAddress,
    update: updateAddress,
    delete: deleteAddress
  },

  // 课程类型
  categories: {
    getList: function(params = {}) {
      return request({
        url: '/api/h5/categories',
        method: 'GET',
        data: params
      });
    },
    add: function(params = {}) {
      return request({
        url: '/api/h5/categories',
        method: 'POST',
        data: params
      });
    },
    edit: function(id, params = {}) {
      return request({
        url: `/api/h5/categories/${id}`,
        method: 'PUT',
        data: params
      });
    },
    delete: function(id, params = {}) {
      return request({
        url: `/api/h5/categories/${id}`,
        method: 'DELETE',
        data: params
      });
    },
    getDetail: function(id, params = {}) {
      return request({
        url: `/api/h5/categories/${id}`,
        method: 'GET',
        data: params
      });
    }
  },

  // 活动管理模块
  groupCourse: {
    // 获取活动列表
    getList: function(params = {}) {
      return request({
        url: '/api/h5/group-courses',
        method: 'GET',
        data: params
      });
    },
    
    // 创建活动
    create: function(params = {}) {
      return request({
        url: '/api/h5/group-courses',
        method: 'POST',
        data: params
      });
    },
    
    // 获取活动详情
    getDetail: function(id, params = {}) {
      return request({
        url: `/api/h5/group-courses/${id}`,
        method: 'GET',
        data: params
      });
    },
    
    // 更新活动
    update: function(id, params = {}) {
      return request({
        url: `/api/h5/group-courses/${id}`,
        method: 'PUT',
        data: params
      });
    },
    
    // 报名活动
    register: function(id, params = {}) {
      return request({
        url: `/api/h5/group-courses/${id}/register`,
        method: 'POST',
        data: params
      });
    },
    
    // 取消报名
    unregister: function(id, params = {}) {
      return request({
        url: `/api/h5/group-courses/${id}/register`,
        method: 'DELETE',
        data: params
      });
    },
    
    // 获取我的活动报名列表（学员视角）
    getMyRegistrations: function(params = {}) {
      return request({
        url: '/api/h5/group-courses/my-registrations',
        method: 'GET',
        data: params
      });
    },
    
    // 获取活动报名列表（教练视角）
    getRegistrations: function(id, params = {}) {
      return request({
        url: `/api/h5/group-courses/${id}/registrations`,
        method: 'GET',
        data: params
      });
    },
    
    // 签到活动
    checkIn: function(courseId, registrationId, params = {}) {
      return request({
        url: `/api/h5/group-courses/${courseId}/registrations/${registrationId}/check-in`,
        method: 'POST',
        data: params
      });
    },

    // 取消活动
    cancel: function(id, params = {}) {
      return request({
        url: `/api/h5/group-courses/${id}/cancel`,
        method: 'PUT',
        data: params
      });
    },

    // 删除活动
    del: function(id, params = {}) {
      return request({
        url: `/api/h5/group-courses/${id}`,
        method: 'DELETE',
        data: params
      });
    },

    // 发布活动
    publish: function(id, params = {}) {
      return request({
        url: `/api/h5/group-courses/${id}/publish`,
        method: 'PUT',
        data: params
      });
    },

    // 完成活动
    complete: function(id, params = {}) {
      return request({
        url: `/api/h5/group-courses/${id}/complete`,
        method: 'PUT',
        data: params
      });
    }
  },

  // 所有教练
  coaches: {
    getList: function(params = {}) {
      return request({
        url: '/api/h5/coaches',
        method: 'GET',
        data: params
      });
    },
  },

  // 文件上传模块
  upload: {
    image: uploadImage,
    groupCourse: (filePath) => uploadImage(filePath, 'groupCourse'),
    avatar: (filePath) => uploadImage(filePath, 'avatar'),
    poster: (filePath) => uploadImage(filePath, 'poster'),
    courseContent: (filePath) => uploadImage(filePath, 'course_contents/images'),
    // document: (filePath) => uploadImage(filePath, 'documents'),
    // temp: (filePath) => uploadImage(filePath, 'temp')
  },

  // 小程序码模块
  qrcode: {
    /**
     * 生成小程序码（返回Base64）
     * @param {Object} params - 参数对象
     * @param {string} params.scene - 场景值，最大32个可见字符
     * @param {string} params.page - 页面路径
     * @param {number} params.width - 二维码宽度，默认430
     * @param {boolean} params.auto_color - 自动配置线条颜色，默认false
     * @param {Object} params.line_color - 线条颜色
     * @param {boolean} params.is_hyaline - 是否透明底色，默认false
     * @returns {Promise}
     */
    generateBase64: function(params = {}) {
      return request({
        url: '/api/h5/qrcode/generate-base64',
        method: 'POST',
        data: params
      });
    },

    /**
     * 生成小程序码（返回图片）
     * @param {Object} params - 参数对象
     * @returns {Promise}
     */
    generate: function(params = {}) {
      return request({
        url: '/api/h5/qrcode/generate',
        method: 'POST',
        data: params
      });
    }
  },

  // 卡片管理模块
  card: {
    // 卡片模板相关
    getTemplateList: function(params = {}) {
      return request({
        url: '/api/h5/coach-cards',
        method: 'GET',
        data: params
      });
    },
    createTemplate: function(params = {}) {
      return request({
        url: '/api/h5/coach-cards',
        method: 'POST',
        data: params
      });
    },
    updateTemplate: function(id, params = {}) {
      return request({
        url: `/api/h5/coach-cards/${id}`,
        method: 'PUT',
        data: params
      });
    },
    toggleTemplate: function(id) {
      return request({
        url: `/api/h5/coach-cards/${id}/toggle-active`,
        method: 'PUT'
      });
    },
    deleteTemplate: function(id) {
      return request({
        url: `/api/h5/coach-cards/${id}`,
        method: 'DELETE'
      });
    },
    getActiveTemplates: function() {
      return request({
        url: '/api/h5/coach-cards/active-list',
        method: 'GET'
      });
    },
    
    // 卡片实例相关
    createInstance: function(params = {}) {
      return request({
        url: '/api/h5/card-instances',
        method: 'POST',
        data: params
      });
    },
    getStudentCards: function(studentId) {
      return request({
        url: `/api/h5/card-instances/student/${studentId}`,
        method: 'GET'
      });
    },
    getMyCards: function(coachId) {
      return request({
        url: `/api/h5/card-instances/my-cards/${coachId}`,
        method: 'GET'
      });
    },
    getAvailableCards: function(studentId, coachId) {
      return request({
        url: `/api/h5/card-instances/available?student_id=${studentId}&coach_id=${coachId}`,
        method: 'GET'
      });
    },
    getCardDetail: function(id) {
      return request({
        url: `/api/h5/card-instances/${id}`,
        method: 'GET'
      });
    },
    activateCard: function(id) {
      return request({
        url: `/api/h5/card-instances/${id}/activate`,
        method: 'PUT'
      });
    },
    deactivateCard: function(id) {
      return request({
        url: `/api/h5/card-instances/${id}/deactivate`,
        method: 'PUT'
      });
    },
    reactivateCard: function(id) {
      return request({
        url: `/api/h5/card-instances/${id}/reactivate`,
        method: 'PUT'
      });
    },
    deleteCard: function(id) {
      return request({
        url: `/api/h5/card-instances/${id}`,
        method: 'DELETE'
      });
    }
  },

  // 赞助管理模块
  donation: {
    /**
     * 创建赞助订单
     * @param {Object} params - 参数对象
     * @param {number} params.amount - 赞助金额(分)
     * @param {string} params.message - 留言内容（可选）
     * @param {number} params.is_anonymous - 是否匿名：0-否，1-是（可选，默认0）
     * @returns {Promise}
     */
    create: function(params = {}) {
      return request({
        url: '/api/h5/donations',
        method: 'POST',
        data: params
      });
    },
    
    /**
     * 查询赞助订单详情
     * @param {number} id - 订单ID
     * @returns {Promise}
     */
    getDetail: function(id) {
      return request({
        url: `/api/h5/donations/${id}`,
        method: 'GET'
      });
    },
    
    /**
     * 获取我的赞助记录
     * @param {Object} params - 查询参数
     * @param {number} params.page - 页码，默认1
     * @param {number} params.page_size - 每页数量，默认10
     * @returns {Promise}
     */
    getMyList: function(params = {}) {
      return request({
        url: '/api/h5/donations/my/list',
        method: 'GET',
        data: params
      });
    },
    
    /**
     * 获取赞助列表（公开）
     * @param {Object} params - 查询参数
     * @param {number} params.page - 页码，默认1
     * @param {number} params.page_size - 每页数量，默认20
     * @returns {Promise}
     */
    getPublicList: function(params = {}) {
      return request({
        url: '/api/h5/donations/list/public',
        method: 'GET',
        data: params
      });
    },
    
    /**
     * 查询订单支付状态
     * @param {number} id - 订单ID
     * @returns {Promise}
     */
    getStatus: function(id) {
      return request({
        url: `/api/h5/donations/${id}/status`,
        method: 'GET'
      });
    }
  },

  // 课程内容记录模块
  courseContent: {
    /**
     * 添加课程内容
     * @param {Object} params - 参数对象
     * @param {number} params.course_type - 课程类型：1-一对一，2-团课
     * @param {number} params.booking_id - 一对一课程ID（course_type=1时必填）
     * @param {number} params.group_course_id - 团课ID（course_type=2时必填）
     * @param {string} params.text_content - 文本内容（可选）
     * @param {Array} params.images - 图片URL数组（可选）
     * @param {Array} params.audios - 音频数组（可选），格式：[{url: "xxx", duration: 60}]
     * @param {Array} params.videos - 视频数组（可选），格式：[{url: "xxx", duration: 120}]
     * @returns {Promise}
     */
    create: function(params = {}) {
      return request({
        url: '/api/h5/course-content',
        method: 'POST',
        data: params
      });
    },

    /**
     * 编辑课程内容
     * @param {number} id - 课程内容ID
     * @param {Object} params - 参数对象
     * @param {string} params.text_content - 文本内容（可选，传null或空字符串清空）
     * @param {Array} params.images - 图片URL数组（可选，传null或空数组清空）
     * @param {Array} params.audios - 音频数组（可选，传null或空数组清空）
     * @param {Array} params.videos - 视频数组（可选，传null或空数组清空）
     * @returns {Promise}
     */
    update: function(id, params = {}) {
      return request({
        url: `/api/h5/course-content/${id}`,
        method: 'PUT',
        data: params
      });
    },

    /**
     * 根据课程ID获取课程内容
     * @param {Object} params - 查询参数
     * @param {number} params.course_type - 课程类型：1-一对一，2-团课
     * @param {number} params.booking_id - 一对一课程ID（course_type=1时必填）
     * @param {number} params.group_course_id - 团课ID（course_type=2时必填）
     * @returns {Promise}
     */
    getByCourse: function(params = {}) {
      return request({
        url: '/api/h5/course-content/by-course',
        method: 'GET',
        data: params
      });
    },

    /**
     * 上传音频文件
     * @param {string} filePath - 本地音频文件路径
     * @returns {Promise}
     */
    uploadAudio: function(filePath) {
      return new Promise((resolve, reject) => {
        const token = wx.getStorageSync('token');
        
        wx.uploadFile({
          url: `${API_CONFIG.baseUrl}/api/upload/audio`,
          filePath: filePath,
          name: 'file',
          formData: {
            directory: 'course_contents/audios'
          },
          header: {
            'Authorization': `Bearer ${token}`
          },
          success: (res) => {
            try {
              const data = JSON.parse(res.data);
              if (data.success) {
                resolve(data);
              } else {
                // Token过期处理
                if (data.code === 1002 || data.code === 2002) {
                  handleTokenExpired();
                }
                reject(data);
              }
            } catch (e) {
              reject({
                code: -1,
                message: '响应解析失败',
                error: e
              });
            }
          },
          fail: (error) => {
            console.error('[API Upload Error] /api/upload/audio', error);
            reject({
              code: -1,
              message: '音频上传失败',
              error: error
            });
          }
        });
      });
    },

    /**
     * 上传视频文件（自动压缩大于10MB的视频）
     * @param {string} filePath - 本地视频文件路径
     * @param {Object} options - 配置选项
     * @param {boolean} options.compress - 是否压缩，默认true
     * @param {number} options.compressThreshold - 压缩阈值(MB)，默认10MB
     * @param {string} options.quality - 压缩质量：low | medium | high，默认medium
     * @param {number} options.bitrate - 码率(kbps)，默认1000
     * @param {number} options.resolution - 分辨率比例(0-1]，默认1
     * @returns {Promise}
     */
    uploadVideo: function(filePath, options = {}) {
      return new Promise(async (resolve, reject) => {
        const {
          compress = true,
          compressThreshold = 10,
          quality = 'medium',
          bitrate = 1000,
          resolution = 1
        } = options;
        
        const token = wx.getStorageSync('token');
        let uploadPath = filePath;
        
        try {
          // 如果启用压缩，检查文件大小并压缩
          if (compress) {
            const fileInfo = await this._getFileInfo(filePath);
            const fileSizeInMB = fileInfo.size / 1024 / 1024;
            
            console.log(`[视频上传] 原始大小: ${fileSizeInMB.toFixed(2)}MB`);
            
            // 大于阈值时进行压缩
            if (fileSizeInMB > compressThreshold) {
              console.log(`[视频上传] 视频较大，尝试压缩...`);
              wx.showLoading({ title: '压缩中...' });
              
              try {
                const compressResult = await this._compressVideo(filePath, {
                  quality,
                  bitrate,
                  resolution
                });
                
                uploadPath = compressResult.tempFilePath;
                const compressedSizeInMB = compressResult.size / 1024 / 1024;
                const compressionRatio = ((1 - compressResult.size / fileInfo.size) * 100).toFixed(0);
                
                console.log(`[视频上传] 压缩完成: ${compressedSizeInMB.toFixed(2)}MB, 压缩率: ${compressionRatio}%`);
              } catch (compressError) {
                // 压缩失败，使用原视频（开发者工具可能因缺少 ffmpeg 而失败，真机正常）
                console.warn('[视频上传] 压缩失败，使用原视频:', compressError.message || compressError);
                if (compressError.message && compressError.message.includes('ffmpeg')) {
                  console.info('[提示] 开发者工具需要安装 ffmpeg 才能压缩视频，但真机上可正常使用');
                  console.info('[提示] 详见文档: https://developers.weixin.qq.com/miniprogram/dev/devtools/ffmpeg.html');
                }
              }
            }
          }
          
          // 开始上传
          wx.showLoading({ title: '上传中...' });
          
          wx.uploadFile({
            url: `${API_CONFIG.baseUrl}/api/upload/video`,
            filePath: uploadPath,
            name: 'file',
            formData: {
              directory: 'course_contents/videos'
            },
            header: {
              'Authorization': `Bearer ${token}`
            },
            success: (res) => {
              try {
                const data = JSON.parse(res.data);
                if (data.success) {
                  resolve(data);
                } else {
                  // Token过期处理
                  if (data.code === 1002 || data.code === 2002) {
                    handleTokenExpired();
                  }
                  reject(data);
                }
              } catch (e) {
                reject({
                  code: -1,
                  message: '响应解析失败',
                  error: e
                });
              }
            },
            fail: (error) => {
              console.error('[API Upload Error] /api/upload/video', error);
              reject({
                code: -1,
                message: '视频上传失败',
                error: error
              });
            }
          });
        } catch (error) {
          console.error('[视频上传] 处理失败:', error);
          reject({
            code: -1,
            message: '视频处理失败',
            error: error
          });
        }
      });
    },
    
    /**
     * 获取文件信息
     * @private
     * @param {string} filePath - 文件路径
     * @returns {Promise}
     */
    _getFileInfo: function(filePath) {
      return new Promise((resolve, reject) => {
        wx.getFileInfo({
          filePath: filePath,
          success: resolve,
          fail: reject
        });
      });
    },
    
    /**
     * 压缩视频
     * @private
     * @param {string} videoPath - 视频文件路径
     * @param {Object} options - 压缩配置
     * @returns {Promise}
     */
    _compressVideo: function(videoPath, options = {}) {
      const { quality = 'medium', bitrate = 1000, resolution = 1 } = options;
      
      return new Promise((resolve, reject) => {
        // 检查是否支持视频压缩
        if (!wx.compressVideo) {
          console.warn('[视频压缩] 当前环境不支持 wx.compressVideo');
          reject(new Error('当前环境不支持视频压缩'));
          return;
        }
        
        wx.compressVideo({
          src: videoPath,
          quality: quality,
          bitrate: bitrate,
          resolution: resolution,
          success: (res) => {
            console.log('[视频压缩] 成功:', res);
            resolve(res);
          },
          fail: (error) => {
            console.error('[视频压缩] 失败:', error);
            // 开发者工具可能需要安装 ffmpeg，真机不需要
            if (error.errMsg && error.errMsg.includes('ffmpeg')) {
              console.warn('[视频压缩] 开发者工具需安装 ffmpeg，真机可正常使用');
            }
            reject(error);
          }
        });
      });
    }
  },
  
  // 其他
  healthCheck
}; 