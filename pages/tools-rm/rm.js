// pages/tools-rm/rm.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    weight: '', // 训练重量（公斤）
    reps: '', // 完成次数
    oneRM: '', // 计算出的1RM值
    
    // 训练重量推荐
    recommendations: [],
    
    // %1RM与最大重复次数对照表
    rmStandards: [
      { percent: 100, maxReps: 1 },
      { percent: 95, maxReps: 2 },
      { percent: 93, maxReps: 3 },
      { percent: 90, maxReps: 4 },
      { percent: 87, maxReps: 5 },
      { percent: 85, maxReps: 6 },
      { percent: 83, maxReps: 7 },
      { percent: 80, maxReps: 8 },
      { percent: 77, maxReps: 9 },
      { percent: 75, maxReps: 10 },
      { percent: 70, maxReps: 11 },
      { percent: 67, maxReps: 12 },
      { percent: 65, maxReps: 15 }
    ]
  },

  /**
   * 训练重量输入处理
   */
  onWeightInput(e) {
    this.setData({
      weight: e.detail.value
    });
  },

  /**
   * 完成次数输入处理
   */
  onRepsInput(e) {
    this.setData({
      reps: e.detail.value
    });
  },

  /**
   * 计算1RM
   * 使用 Brzycki 公式：1RM = weight × (36 / (37 - reps))
   * 其他常用公式：
   * - Epley: 1RM = weight × (1 + 0.0333 × reps)
   * - Lander: 1RM = (100 × weight) / (101.3 - 2.67123 × reps)
   * - Lombardi: 1RM = weight × reps^0.10
   */
  onCalculate() {
    const { weight, reps } = this.data;

    // 验证输入
    if (!weight || !reps) {
      wx.showToast({
        title: '请输入重量和次数',
        icon: 'none'
      });
      return;
    }

    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps);

    // 验证数值范围
    if (weightNum <= 0 || weightNum > 1000) {
      wx.showToast({
        title: '请输入有效的重量（0-1000公斤）',
        icon: 'none'
      });
      return;
    }

    if (repsNum <= 0 || repsNum > 15) {
      wx.showToast({
        title: '建议输入次数在1-15次之间',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 如果次数为1，则输入的重量就是1RM
    if (repsNum === 1) {
      const oneRM = weightNum.toFixed(1);
      this.setData({
        oneRM
      });
      this.generateRecommendations(parseFloat(oneRM));
      return;
    }

    // 使用 Brzycki 公式计算
    let oneRM;
    if (repsNum < 37) {
      oneRM = weightNum * (36 / (37 - repsNum));
    } else {
      // 对于超过36次的情况，使用Epley公式
      oneRM = weightNum * (1 + 0.0333 * repsNum);
    }

    const oneRMValue = oneRM.toFixed(1);

    this.setData({
      oneRM: oneRMValue
    });

    // 生成训练重量推荐
    this.generateRecommendations(parseFloat(oneRMValue));
  },

  /**
   * 生成训练重量推荐
   * @param {number} oneRM - 计算出的1RM值
   */
  generateRecommendations(oneRM) {
    const recommendations = [
      { percent: 100, reps: '1', weight: (oneRM * 1.00).toFixed(1) },
      { percent: 95, reps: '2', weight: (oneRM * 0.95).toFixed(1) },
      { percent: 90, reps: '4', weight: (oneRM * 0.90).toFixed(1) },
      { percent: 85, reps: '6', weight: (oneRM * 0.85).toFixed(1) },
      { percent: 80, reps: '8', weight: (oneRM * 0.80).toFixed(1) },
      { percent: 75, reps: '10', weight: (oneRM * 0.75).toFixed(1) },
      { percent: 70, reps: '11', weight: (oneRM * 0.70).toFixed(1) },
      { percent: 67, reps: '12', weight: (oneRM * 0.67).toFixed(1) },
      { percent: 65, reps: '15', weight: (oneRM * 0.65).toFixed(1) }
    ];

    this.setData({
      recommendations
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
      title: '1RM计算器',
      imageUrl: 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/images/share-tool-rm.png',
      path: '/pages/tools-rm/rm'
    }
  }
})

