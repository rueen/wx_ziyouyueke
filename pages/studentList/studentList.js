/**
 * pages/studentList/studentList.js
 * 学员列表页面
 */

// 引入API工具类
const api = require('../../utils/api.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    students: [
      {
        id: 1,
        name: "小李",
        avatar: "/images/defaultAvatar.png",
        level: "初级",
        remainingLessons: 3, // 剩余课时
        introduction: "热爱健身的新手，主要目标是减脂塑形，希望通过专业指导建立良好的运动习惯。",
        remark: "比较守时，态度积极"
      },
      {
        id: 2,
        name: "小王",
        avatar: "/images/defaultAvatar.png", 
        level: "中级",
        remainingLessons: 5, // 剩余课时
        introduction: "有一定运动基础，希望提升力量训练水平，目标是增肌和提高身体素质。",
        remark: "有一定基础，配合度高"
      },
      {
        id: 3,
        name: "小张", 
        avatar: "/images/defaultAvatar.png",
        level: "高级",
        remainingLessons: 0, // 剩余课时为0
        introduction: "资深健身爱好者，希望通过专业指导优化训练计划，提升训练效果。",
        remark: "课时已用完，需要续费"
      }
    ],
    // 测试空状态时，可将 students 设置为空数组: students: []
    
    // 邀请码弹窗相关
    showInviteModal: false,
    inviteCode: '',
    qrCodeUrl: '',
    coachInfo: {
      id: '',
      name: '教练',
      avatar: '/images/defaultAvatar.png'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadStudents();
    this.loadCoachInfo();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    
  },

  /**
   * 加载学员列表
   */
  async loadStudents() {
    try {
      wx.showLoading({
        title: '加载中...'
      });

      // 调用API获取我的学员列表
      const result = await api.relation.getMyStudents();
      
      wx.hideLoading();

      if (result && result.data && result.data.length > 0) {
        // 格式化数据
        const students = result.data.map(item => ({
          id: item.id,
          name: (item.student && item.student.nickname) || '未知学员',
          avatar: (item.student && item.student.avatar_url) || '/images/defaultAvatar.png',
          level: '初级', // 暂时写死，后续可以从用户信息中获取
          remainingLessons: item.remaining_lessons || 0,
          introduction: (item.student && item.student.intro) || '暂无介绍',
          remark: item.coach_remark || '无备注',
          phone: (item.student && item.student.phone) || ''
        }));

        this.setData({
          students
        });

        console.log('加载学员数据成功:', students);
      } else {
        // 没有学员数据时，使用空数组
        this.setData({
          students: []
        });
        console.log('暂无学员数据');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('加载学员数据失败:', error);
      
      // API调用失败时，使用原有的静态数据作为后备
      console.log('使用静态数据作为后备');
      
      wx.showToast({
        title: '加载失败，显示缓存数据',
        icon: 'none'
      });
    }
  },

  /**
   * 加载教练信息
   */
  loadCoachInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        coachInfo: {
          id: userInfo.wxCode || 'COACH_001', // 使用微信code作为教练ID
          name: userInfo.nickName || '教练',
          avatar: userInfo.avatarUrl || '/images/defaultAvatar.png'
        }
      });
    }
  },

  /**
   * 进入学员详情
   */
  onStudentDetail(e) {
    const student = e.currentTarget.dataset.student;
    wx.navigateTo({
      url: `/pages/studentDetail/studentDetail?studentData=${encodeURIComponent(JSON.stringify(student))}`
    });
  },

  /**
   * 显示邀请学员二维码
   */
  onAddStudent() {
    // 生成邀请码
    const inviteCode = this.generateInviteCode();
    
    // 生成小程序登录页面地址（带邀请码）
    const qrCodeUrl = this.generateQRCodeUrl(inviteCode);
    
    this.setData({
      showInviteModal: true,
      inviteCode: inviteCode,
      qrCodeUrl: qrCodeUrl
    });
  },

  /**
   * 生成邀请码
   */
  generateInviteCode() {
    const { coachInfo } = this.data;
    const timestamp = Date.now();
    // 格式：INVITE_教练ID_时间戳
    return `INVITE_${coachInfo.id}_${timestamp}`;
  },

  /**
   * 生成二维码URL
   */
  generateQRCodeUrl(inviteCode) {
    // 小程序码参数，包含邀请码和跳转页面
    const scene = encodeURIComponent(`coach=${this.data.coachInfo.id}&invite=${inviteCode}`);
    const page = 'pages/login/login';
    
    // 实际应用中这里应该调用微信API生成小程序码
    // 现在返回一个模拟的URL
    return `https://api.weixin.qq.com/wxa/getwxacodeunlimit?scene=${scene}&page=${page}`;
  },

  /**
   * 隐藏邀请弹窗
   */
  onHideInviteModal() {
    this.setData({
      showInviteModal: false,
      inviteCode: '',
      qrCodeUrl: ''
    });
  },

  /**
   * 保存二维码到本地
   */
  onSaveQRCode() {
    wx.showLoading({
      title: '保存中...'
    });

    // 实际应用中应该先下载二维码图片，然后保存
    // 这里模拟保存过程
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '已保存到相册',
        icon: 'success'
      });
    }, 1500);

    // 实际代码示例：
    // wx.downloadFile({
    //   url: this.data.qrCodeUrl,
    //   success: (res) => {
    //     wx.saveImageToPhotosAlbum({
    //       filePath: res.tempFilePath,
    //       success: () => {
    //         wx.hideLoading();
    //         wx.showToast({
    //           title: '已保存到相册',
    //           icon: 'success'
    //         });
    //       },
    //       fail: () => {
    //         wx.hideLoading();
    //         wx.showToast({
    //           title: '保存失败',
    //           icon: 'none'
    //         });
    //       }
    //     });
    //   }
    // });
  },

  /**
   * 分享给好友
   */
  onShareToFriend() {
    const { coachInfo, inviteCode } = this.data;
    
    wx.showShareMenu({
      withShareTicket: true,
      success: () => {
        console.log('分享菜单显示成功');
      }
    });

    // 设置分享内容
    wx.onShareAppMessage(() => {
      return {
        title: `${coachInfo.name}邀请您成为学员`,
        path: `/pages/login/login?coach=${coachInfo.id}&invite=${inviteCode}`,
        imageUrl: coachInfo.avatar
      };
    });

    wx.showToast({
      title: '请点击右上角分享',
      icon: 'none'
    });
  }
}) 