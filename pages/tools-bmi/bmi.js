// pages/tools-bmi/bmi.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    height: '', // 身高（厘米）
    weight: '', // 体重（公斤）
    bmiValue: '', // BMI值
    category: '', // BMI分类
    categoryColor: '', // 分类颜色
    
    // 成年人标准
    adultStandards: [
      { range: '< 18.5', category: '体重过低' },
      { range: '18.5 ~ 23.9', category: '健康体重' },
      { range: '24.0 ~ 27.9', category: '超重' },
      { range: '≥ 28.0', category: '肥胖' }
    ],
    
    // 儿童青少年标准（示例数据）
    childStandards: [
      { age: '7', gender: '男', overweight: '≥17.8', obese: '≥20.3' },
      { age: '7', gender: '女', overweight: '≥17.4', obese: '≥19.6' },
      { age: '8', gender: '男', overweight: '≥18.4', obese: '≥21.2' },
      { age: '8', gender: '女', overweight: '≥18.1', obese: '≥20.7' },
      { age: '9', gender: '男', overweight: '≥19.2', obese: '≥22.2' },
      { age: '9', gender: '女', overweight: '≥19.0', obese: '≥22.0' },
      { age: '10', gender: '男', overweight: '≥20.0', obese: '≥23.3' },
      { age: '10', gender: '女', overweight: '≥20.0', obese: '≥23.4' },
      { age: '11', gender: '男', overweight: '≥21.0', obese: '≥24.5' },
      { age: '11', gender: '女', overweight: '≥21.2', obese: '≥24.9' },
      { age: '12', gender: '男', overweight: '≥22.0', obese: '≥25.7' },
      { age: '12', gender: '女', overweight: '≥22.4', obese: '≥26.4' },
      { age: '13', gender: '男', overweight: '≥23.0', obese: '≥26.8' },
      { age: '13', gender: '女', overweight: '≥23.5', obese: '≥27.7' },
      { age: '14', gender: '男', overweight: '≥23.8', obese: '≥27.6' },
      { age: '14', gender: '女', overweight: '≥24.2', obese: '≥28.6' },
      { age: '15', gender: '男', overweight: '≥24.4', obese: '≥28.2' },
      { age: '15', gender: '女', overweight: '≥24.6', obese: '≥29.1' },
      { age: '16', gender: '男', overweight: '≥24.8', obese: '≥28.5' },
      { age: '16', gender: '女', overweight: '≥24.8', obese: '≥29.3' },
      { age: '17', gender: '男', overweight: '≥25.1', obese: '≥28.8' },
      { age: '17', gender: '女', overweight: '≥24.9', obese: '≥29.4' }
    ]
  },

  /**
   * 身高输入处理
   */
  onHeightInput(e) {
    this.setData({
      height: e.detail.value
    });
  },

  /**
   * 体重输入处理
   */
  onWeightInput(e) {
    this.setData({
      weight: e.detail.value
    });
  },

  /**
   * 计算BMI
   */
  onCalculate() {
    const { height, weight } = this.data;

    // 验证输入
    if (!height || !weight) {
      wx.showToast({
        title: '请输入身高和体重',
        icon: 'none'
      });
      return;
    }

    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    // 验证数值范围
    if (heightNum <= 0 || heightNum > 300) {
      wx.showToast({
        title: '请输入有效的身高（0-300厘米）',
        icon: 'none'
      });
      return;
    }

    if (weightNum <= 0 || weightNum > 500) {
      wx.showToast({
        title: '请输入有效的体重（0-500公斤）',
        icon: 'none'
      });
      return;
    }

    // 计算BMI：体重（kg）/ 身高（m）的平方
    const heightInMeters = heightNum / 100;
    const bmi = weightNum / (heightInMeters * heightInMeters);
    const bmiValue = bmi.toFixed(1);

    // 判断分类
    let category = '';
    let categoryColor = '';

    if (bmi < 18.5) {
      category = '体重过低';
      categoryColor = '#FFA500'; // 橙色
    } else if (bmi >= 18.5 && bmi < 24.0) {
      category = '健康体重';
      categoryColor = '#4CAF50'; // 绿色
    } else if (bmi >= 24.0 && bmi < 28.0) {
      category = '超重';
      categoryColor = '#FF9800'; // 深橙色
    } else {
      category = '肥胖';
      categoryColor = '#F44336'; // 红色
    }

    this.setData({
      bmiValue,
      category,
      categoryColor
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
      title: 'BMI计算器',
      imageUrl: 'https://ziyouyueke.oss-cn-hangzhou.aliyuncs.com/images/share-tool-bmi.png',
      path: '/pages/tools-bmi/bmi'
    }
  },
})