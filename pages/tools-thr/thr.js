/**
 * pages/tools-thr/thr.js
 * 靶心率计算器页面
 */
Page({

  /**
   * 页面的初始数据
   */
  data: {
    methodType: 'percent', // 计算方法：percent-最大心率百分比法，reserve-心率储备法
    age: '', // 年龄
    restingHR: '', // 安静心率
    intensity: 'basic', // 运动强度：basic-基础，fitness-健身，performance-运动表现
    thrMin: '', // 目标心率最小值
    thrMax: '', // 目标心率最大值
    intensityDesc: '', // 强度描述

    // 最大心率百分比法的强度范围
    percentRanges: {
      basic: { min: 0.64, max: 0.76, desc: '基础强度：适合改善健康状况、养成日常习惯' },
      fitness: { min: 0.77, max: 0.95, desc: '健身强度：适合改善心肺适能、提升运动能力' },
      performance: { min: 0.96, max: 1.0, desc: '运动表现强度：适合创造个人记录、参加比赛' }
    },

    // 心率储备法的强度范围
    reserveRanges: {
      basic: { min: 0.40, max: 0.59, desc: '基础强度：适合改善健康状况、养成日常习惯' },
      fitness: { min: 0.60, max: 0.89, desc: '健身强度：适合改善心肺适能、提升运动能力' },
      performance: { min: 0.90, max: 1.0, desc: '运动表现强度：适合创造个人记录、参加比赛' }
    }
  },

  /**
   * 切换计算方法
   */
  onMethodChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      methodType: type,
      thrMin: '',
      thrMax: '',
      intensityDesc: ''
    });
  },

  /**
   * 年龄输入处理
   */
  onAgeInput(e) {
    this.setData({
      age: e.detail.value
    });
  },

  /**
   * 安静心率输入处理
   */
  onRestingHRInput(e) {
    this.setData({
      restingHR: e.detail.value
    });
  },

  /**
   * 运动强度选择
   */
  onIntensityChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      intensity: type
    });
  },

  /**
   * 计算靶心率
   */
  onCalculate() {
    const { methodType, age, restingHR, intensity } = this.data;

    // 验证年龄
    if (!age) {
      wx.showToast({
        title: '请输入年龄',
        icon: 'none'
      });
      return;
    }

    const ageNum = parseInt(age);
    if (ageNum <= 0 || ageNum > 120) {
      wx.showToast({
        title: '请输入有效的年龄（1-120岁）',
        icon: 'none'
      });
      return;
    }

    // 心率储备法需要验证安静心率
    if (methodType === 'reserve') {
      if (!restingHR) {
        wx.showToast({
          title: '请输入安静心率',
          icon: 'none'
        });
        return;
      }

      const restingHRNum = parseInt(restingHR);
      if (restingHRNum <= 30 || restingHRNum > 120) {
        wx.showToast({
          title: '请输入有效的安静心率（30-120次/分）',
          icon: 'none'
        });
        return;
      }
    }

    // 计算最大心率
    const maxHR = 220 - ageNum;

    let thrMin, thrMax, intensityDesc;

    if (methodType === 'percent') {
      // 最大心率百分比法
      const range = this.data.percentRanges[intensity];
      thrMin = Math.round(maxHR * range.min);
      thrMax = Math.round(maxHR * range.max);
      intensityDesc = range.desc;
    } else {
      // 心率储备法
      const restingHRNum = parseInt(restingHR);
      const hrReserve = maxHR - restingHRNum; // 心率储备
      const range = this.data.reserveRanges[intensity];
      
      thrMin = Math.round(hrReserve * range.min + restingHRNum);
      thrMax = Math.round(hrReserve * range.max + restingHRNum);
      intensityDesc = range.desc;
    }

    this.setData({
      thrMin,
      thrMax,
      intensityDesc
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '目标心率计算器',
      imageUrl: 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/images/share-tool-thr.png',
      path: '/pages/tools-thr/thr'
    };
  }
})