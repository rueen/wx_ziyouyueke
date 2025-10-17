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
 * @param {string} message 提示信息，默认为"此功能需要登录后才能使用，是否前往登录？"
 */
const navigateToLoginWithRedirect = (message = '此功能需要登录后才能使用，是否前往登录？') => {
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
        
        // 添加当前页面的参数
        const paramKeys = Object.keys(currentOptions);
        if (paramKeys.length > 0) {
          const paramString = paramKeys
            .map(key => `${key}=${encodeURIComponent(currentOptions[key])}`)
            .join('&');
          loginUrl += '&' + paramString;
        }
        
        console.log('跳转登录页面:', loginUrl);
        
        wx.navigateTo({
          url: loginUrl
        });
      }
    }
  });
};

module.exports = {
  formatTime,
  createCompatibleDate,
  safeParseDateTimeString,
  validatePhone,
  navigateToLoginWithRedirect
}
