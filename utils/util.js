const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

/**
 * 创建iOS兼容的日期对象
 * @param {string} dateStr 日期字符串，支持格式：
 *   - YYYY-MM-DD
 *   - YYYY-MM-DD HH:mm:ss
 *   - YYYY-MM-DDTHH:mm:ss
 * @returns {Date} 日期对象
 */
const createCompatibleDate = (dateStr) => {
  if (!dateStr) {
    return new Date();
  }
  
  // 如果包含空格但不包含T，替换为T格式（iOS兼容）
  if (dateStr.includes(' ') && !dateStr.includes('T')) {
    dateStr = dateStr.replace(' ', 'T');
  }
  
  return new Date(dateStr);
}

/**
 * 安全地解析日期时间字符串
 * @param {string} dateTimeStr 日期时间字符串
 * @returns {Date|null} 解析成功返回Date对象，失败返回null
 */
const safeParseDateTimeString = (dateTimeStr) => {
  try {
    const date = createCompatibleDate(dateTimeStr);
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('无效的日期字符串:', dateTimeStr);
      return null;
    }
    return date;
  } catch (error) {
    console.error('解析日期失败:', error, dateTimeStr);
    return null;
  }
}

/**
 * 验证手机号格式是否正确
 * @param {string} phone 手机号
 * @returns {boolean} 格式正确返回true，否则返回false
 */
const validatePhone = (phone) => {
  if (!phone) {
    return false;
  }
  
  // 中国手机号正则表达式：1开头的11位数字
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 跳转到登录页面，并在登录成功后跳转回当前页面
 * @param {Object} options 配置选项
 * @param {string} options.message 提示信息，默认为"此功能需要登录后才能使用，是否前往登录？"
 * @param {Object} options.redirectParams 自定义跳转参数，如果不传则使用当前页面参数
 */
const navigateToLoginWithRedirect = (options = {}) => {
  const {
    message = '此功能需要登录后才能使用，是否前往登录？',
    redirectParams = null
  } = options;

  wx.showModal({
    title: '需要登录',
    content: message,
    confirmText: '去登录',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        // 构建当前页面信息，登录成功后跳转回来
        const currentPages = getCurrentPages();
        const currentPage = currentPages[currentPages.length - 1];
        const currentRoute = currentPage.route;
        const currentOptions = currentPage.options;
        
        // 构建跳转URL，包含当前页面信息
        let loginUrl = '/pages/login/login?redirectUrl=' + encodeURIComponent('/' + currentRoute);
        
        // 使用自定义参数或当前页面参数
        const finalParams = redirectParams || currentOptions;
        
        // 添加参数
        if (finalParams && typeof finalParams === 'object') {
          const paramKeys = Object.keys(finalParams);
          if (paramKeys.length > 0) {
            const paramString = paramKeys
              .map(key => `${key}=${encodeURIComponent(finalParams[key])}`)
              .join('&');
            loginUrl += '&' + paramString;
          }
        }
        
        console.log('跳转登录页面:', loginUrl);
        
        wx.navigateTo({
          url: loginUrl
        });
      }
    }
  });
};

/**
 * 图片压缩配置
 */
const IMAGE_COMPRESS_CONFIG = {
  // 压缩阈值（字节）
  COMPRESS_THRESHOLD: 200 * 1024, // 200KB
  // 压缩质量配置
  QUALITY: {
    LARGE: 50,   // 大于1MB
    MEDIUM: 60,  // 512KB-1MB
    SMALL: 70    // 200KB-512KB
  },
  // 文件大小阈值
  SIZE_THRESHOLD: {
    LARGE: 1024 * 1024,  // 1MB
    MEDIUM: 512 * 1024   // 512KB
  }
};

/**
 * 压缩图片
 * @param {string} filePath 图片文件路径
 * @param {Object} options 压缩选项
 * @param {number} options.quality 压缩质量 (0-100)，不传则根据文件大小自动调整
 * @param {number} options.threshold 压缩阈值（字节），小于此大小不压缩，默认200KB
 * @param {boolean} options.force 是否强制压缩，即使文件很小也压缩
 * @returns {Promise<{tempFilePath: string, originalSize: number, compressedSize: number}>} 压缩结果
 */
const compressImage = (filePath, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      quality: customQuality,
      threshold = IMAGE_COMPRESS_CONFIG.COMPRESS_THRESHOLD,
      force = false
    } = options;

    // 先获取文件信息
    wx.getFileInfo({
      filePath: filePath,
      success: (fileInfo) => {
        const originalSize = fileInfo.size;
        const fileSizeKB = Math.round(originalSize / 1024);
        
        console.log(`[图片压缩] 原始文件大小: ${fileSizeKB}KB`);
        
        // 如果文件小于阈值且不强制压缩，不进行压缩
        if (!force && originalSize < threshold) {
          console.log(`[图片压缩] 文件小于${Math.round(threshold/1024)}KB，跳过压缩`);
          resolve({ 
            tempFilePath: filePath, 
            originalSize: originalSize,
            compressedSize: originalSize
          });
          return;
        }
        
        // 确定压缩质量
        let quality = customQuality;
        if (quality === undefined) {
          if (originalSize > IMAGE_COMPRESS_CONFIG.SIZE_THRESHOLD.LARGE) {
            quality = IMAGE_COMPRESS_CONFIG.QUALITY.LARGE;
          } else if (originalSize > IMAGE_COMPRESS_CONFIG.SIZE_THRESHOLD.MEDIUM) {
            quality = IMAGE_COMPRESS_CONFIG.QUALITY.MEDIUM;
          } else {
            quality = IMAGE_COMPRESS_CONFIG.QUALITY.SMALL;
          }
        }
        
        console.log(`[图片压缩] 开始压缩，质量: ${quality}%`);
        
        wx.compressImage({
          src: filePath,
          quality: quality,
          success: (res) => {
            // 获取压缩后文件信息
            wx.getFileInfo({
              filePath: res.tempFilePath,
              success: (compressedInfo) => {
                const compressedSize = compressedInfo.size;
                const compressedSizeKB = Math.round(compressedSize / 1024);
                const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);
                
                console.log(`[图片压缩] 压缩完成: ${fileSizeKB}KB -> ${compressedSizeKB}KB (压缩率: ${compressionRatio}%)`);
                
                resolve({
                  tempFilePath: res.tempFilePath,
                  originalSize: originalSize,
                  compressedSize: compressedSize
                });
              },
              fail: () => {
                // 获取压缩后文件信息失败，但压缩成功
                console.log(`[图片压缩] 压缩完成，但无法获取压缩后文件大小`);
                resolve({
                  tempFilePath: res.tempFilePath,
                  originalSize: originalSize,
                  compressedSize: originalSize // 无法获取时使用原大小
                });
              }
            });
          },
          fail: (error) => {
            console.error('[图片压缩] 压缩失败:', error);
            reject(new Error(`图片压缩失败: ${error.errMsg || '未知错误'}`));
          }
        });
      },
      fail: (error) => {
        console.error('[图片压缩] 获取文件信息失败:', error);
        reject(new Error(`获取文件信息失败: ${error.errMsg || '未知错误'}`));
      }
    });
  });
};

/**
 * 批量压缩图片
 * @param {string[]} filePaths 图片文件路径数组
 * @param {Object} options 压缩选项
 * @returns {Promise<Array>} 压缩结果数组
 */
const compressImages = async (filePaths, options = {}) => {
  try {
    const compressPromises = filePaths.map(filePath => compressImage(filePath, options));
    const results = await Promise.all(compressPromises);
    
    const totalOriginalSize = results.reduce((sum, result) => sum + result.originalSize, 0);
    const totalCompressedSize = results.reduce((sum, result) => sum + result.compressedSize, 0);
    const totalCompressionRatio = Math.round((1 - totalCompressedSize / totalOriginalSize) * 100);
    
    console.log(`[批量压缩] 完成 ${filePaths.length} 张图片压缩，总压缩率: ${totalCompressionRatio}%`);
    
    return results;
  } catch (error) {
    console.error('[批量压缩] 批量压缩失败:', error);
    throw error;
  }
};

module.exports = {
  formatTime,
  createCompatibleDate,
  safeParseDateTimeString,
  validatePhone,
  navigateToLoginWithRedirect,
  compressImage,
  compressImages,
  IMAGE_COMPRESS_CONFIG
}
