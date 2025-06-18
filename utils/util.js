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

module.exports = {
  formatTime,
  createCompatibleDate,
  safeParseDateTimeString
}
