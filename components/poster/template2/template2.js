/*
 * @Author: diaochan
 * @Date: 2025-10-26 19:36:31
 * @LastEditors: diaochan
 * @LastEditTime: 2025-10-27 07:23:04
 * @Description: 
 */
// components/poster/template1/template1.js
const { splitByLineBreak } = require('../../../utils/util.js')

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
     * 获取介绍列表
     */
    getIntroList() {
      let introList = [];
      const { userInfo } = this.properties;
      
      if(!!userInfo.certification) {
        introList.push({
          id: 1,
          title: '荣誉：',
          content: splitByLineBreak(userInfo.certification)
        })
      }
      if(!!userInfo.intro) {
        introList.push({
          id: 2,
          title: '擅长：',
          content: splitByLineBreak(userInfo.intro)
        })
      }

      this.setData({
        introList: introList
      })
    }
  }
})