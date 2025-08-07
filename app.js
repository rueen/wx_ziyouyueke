/*
 * @Author: diaochan
 * @Date: 2025-08-07 10:11:18
 * @LastEditors: diaochan
 * @LastEditTime: 2025-08-07 10:30:09
 * @Description: 
 */
// app.js
App({
  onLaunch() {
    this.initTimezone();
  },
  
  /**
   * 初始化用户时区
   */
  initTimezone() {
    try {
      // 使用JavaScript获取用户当前时区
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('[App] 检测到用户时区:', timezone);
      
      // 存储到全局数据
      this.globalData.userTimezone = timezone;
      
    } catch (error) {
      console.error('[App] 时区初始化失败:', error);
      // 失败时使用默认时区
      this.globalData.userTimezone = 'Asia/Shanghai';
    }
  },

  /**
   * 获取用户时区
   */
  getUserTimezone() {
    return this.globalData.userTimezone || 'Asia/Shanghai';
  },

  globalData: {
    userInfo: null,
    defaultAvatar: 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/avatar/defaultAvatar.png',
    userTimezone: 'Asia/Shanghai'
  }
})
