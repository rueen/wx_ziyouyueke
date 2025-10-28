/*
 * @Author: diaochan
 * @Date: 2025-10-26 19:36:31
 * @LastEditors: diaochan
 * @LastEditTime: 2025-10-27 07:23:04
 * @Description: 
 */
// components/poster/template1/template1.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    userInfo: {
      type: Object,
      value: {}
    },
    width: {
      type: Number,
      value: 750
    },
    qrcode: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    introList: []
  },

  lifetimes: {
    attached() {
      setTimeout(() => {
        this.getIntroList()
      })
    },
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 将字符串按换行符分割成数组
     * @param {string} str 原始字符串
     * @returns {Array} 分割后的数组
     */
    splitByLineBreak(str) {
      if (!str) return [];
      // 处理各种换行符：\n, \r\n, \r
      return str.split(/\r\n|\r|\n/).filter(item => item.trim() !== '');
    },

    /**
     * 获取介绍列表
     */
    getIntroList() {
      let introList = [];
      const { userInfo } = this.properties;
      
      if(!!userInfo.certification) {
        introList.push({
          id: 1,
          title: '专业认证',
          content: this.splitByLineBreak(userInfo.certification)
        })
      }
      if(!!userInfo.intro) {
        introList.push({
          id: 2,
          title: '擅长',
          content: this.splitByLineBreak(userInfo.intro)
        })
      }
      if(!!userInfo.motto) {
        introList.push({
          id: 3,
          title: '健身格言',
          content: this.splitByLineBreak(userInfo.motto)
        })
      }

      this.setData({
        introList: introList
      })
    }
  }
})