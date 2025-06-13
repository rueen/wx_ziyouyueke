/**
 * API接口调用工具类
 * 基于API文档的接口封装
 */

// API基础配置
const API_CONFIG = {
  baseUrl: 'http://localhost:3000',
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
    
    console.log(`[API] ${options.method || 'GET'} ${url}`, options.data);
    
    wx.request({
      url,
      method: options.method || 'GET',
      data: options.data || {},
      header,
      timeout: options.timeout || API_CONFIG.timeout,
      success(res) {
        console.log(`[API Response] ${url}`, res.data);
        
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
  
  console.log('[API] Token已过期，正在处理...');
  
  // 清除本地存储
  wx.removeStorageSync('token');
  wx.removeStorageSync('userInfo');
  wx.removeStorageSync('isLoggedIn');
  
  // 显示提示并跳转
  wx.showToast({
    title: '登录已过期',
    icon: 'none',
    duration: 2000,
    success() {
      // 延迟跳转，让用户看到提示
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login',
          success() {
            console.log('[API] 已跳转到登录页');
            isHandlingTokenExpired = false;
          },
          fail() {
            console.error('[API] 跳转登录页失败');
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
 * 创建时间模板
 * @param {Object} template 时间模板数据
 * @returns {Promise}
 */
function createTimeTemplate(template) {
  return request({
    url: '/api/h5/time-templates',
    method: 'POST',
    data: template
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
 * 删除时间模板
 * @param {number} id 模板ID
 * @returns {Promise}
 */
function deleteTimeTemplate(id) {
  return request({
    url: `/api/h5/time-templates/${id}`,
    method: 'DELETE'
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

// ========== 师生关系模块 ==========

/**
 * 获取师生关系列表
 * @param {Object} params 查询参数
 * @returns {Promise}
 */
function getRelations(params = {}) {
  return request({
    url: '/api/h5/relations',
    method: 'GET',
    data: params
  });
}

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
 * @returns {Promise}
 */
function getMyStudents() {
  return request({
    url: '/api/h5/relations/my-students',
    method: 'GET'
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

// ========== 文件上传模块 ==========

/**
 * 上传图片
 * @param {string} filePath 本地文件路径
 * @param {string} directory 上传目录，支持：images、avatar、documents、temp，默认为images
 * @returns {Promise}
 */
function uploadImage(filePath, directory = 'images') {
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
        console.log(`[API Upload] /api/upload/image (directory: ${directory})`, res.data);
        
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
    create: createTimeTemplate,
    update: updateTimeTemplate,
    delete: deleteTimeTemplate,
    toggle: toggleTimeTemplate
  },
  
  // 师生关系模块
  relation: {
    getList: getRelations,
    create: createRelation,
    getMyStudents,
    update: updateRelation,
    delete: deleteRelation
  },

  // 课程管理模块
  course: {
    getList: getCourses,
    book: bookCourse,
    confirm: confirmCourse,
    cancel: cancelCourse,
    complete: completeCourse,
    getDetail: getCourseDetail
  },

  // 教练模块
  coach: {
    getMyList: getMyCoachList
  },

  // 文件上传模块
  upload: {
    image: uploadImage,
    avatar: (filePath) => uploadImage(filePath, 'avatar'),
    document: (filePath) => uploadImage(filePath, 'documents'),
    temp: (filePath) => uploadImage(filePath, 'temp')
  },
  
  // 其他
  healthCheck
}; 