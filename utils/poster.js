/**
 * 海报生成工具类
 * 提供小程序码生成和文件保存的通用方法
 * 海报绘制逻辑由各页面自行实现，保持灵活性
 */

const api = require('./api.js');

/**
 * 生成小程序码
 * @param {Object} params - 参数对象
 * @param {string} params.scene - 场景值
 * @param {string} params.page - 页面路径
 * @param {number} params.width - 小程序码宽度（280-1280）
 * @returns {Promise<string>} - 返回base64字符串
 */
async function generateQRCode(params) {
  const { scene, page, width = 280 } = params;
  
  console.log('开始生成小程序码:', { scene, page, width });
  
  try {
    const res = await api.qrcode.generateBase64({
      scene,
      page,
      width
    });

    console.log('小程序码API响应:', res);

    if (!res.success || !res.data || !res.data.base64) {
      const errorMsg = res.message || '生成小程序码失败';
      console.error('生成小程序码失败:', errorMsg, res);
      throw new Error(errorMsg);
    }

    console.log('小程序码生成成功，base64长度:', res.data.base64.length);
    return res.data.base64;
  } catch (error) {
    console.error('生成小程序码异常:', error);
    throw error;
  }
}

/**
 * 将base64保存为临时文件
 * @param {string} base64 - base64字符串
 * @param {string} filename - 文件名
 * @returns {Promise<string>} - 返回临时文件路径
 */
function saveBase64ToFile(base64, filename = 'temp.png') {
  return new Promise((resolve, reject) => {
    const filePath = wx.env.USER_DATA_PATH + '/' + filename;
    const fs = wx.getFileSystemManager();
    
    fs.writeFile({
      filePath: filePath,
      data: base64,
      encoding: 'base64',
      success: () => resolve(filePath),
      fail: reject
    });
  });
}

/**
 * 绘制海报的通用辅助方法
 * @param {Object} canvas - Canvas对象
 * @param {string} base64 - 图片base64（不含前缀）
 * @returns {Promise<Image>} - 返回加载完成的图片对象
 */
function loadImageFromBase64(canvas, base64) {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = 'data:image/png;base64,' + base64;
  });
}

/**
 * 从URL加载图片
 * @param {Object} canvas - Canvas对象
 * @param {string} url - 图片URL
 * @returns {Promise<Image>} - 返回加载完成的图片对象
 */
function loadImageFromUrl(canvas, url) {
  return new Promise((resolve, reject) => {
    const img = canvas.createImage();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * 绘制多行文本
 * @param {Object} ctx - Canvas上下文
 * @param {string} text - 文本内容
 * @param {number} x - x坐标
 * @param {number} y - y坐标
 * @param {number} maxWidth - 最大宽度
 * @param {number} lineHeight - 行高
 * @param {number} maxLines - 最大行数
 */
function drawText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split('');
  let line = '';
  let lineCount = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      if (lineCount < maxLines - 1) {
        ctx.fillText(line, x, y + lineCount * lineHeight);
        line = words[i];
        lineCount++;
      } else {
        // 最后一行，添加省略号
        ctx.fillText(line + '...', x, y + lineCount * lineHeight);
        return;
      }
    } else {
      line = testLine;
    }
  }
  
  if (line && lineCount < maxLines) {
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }
}

/**
 * 初始化Canvas
 * @param {Object} context - 页面上下文
 * @param {string} selector - Canvas选择器，默认'#posterCanvas'
 * @param {number} width - Canvas宽度，默认375
 * @param {number} height - Canvas高度，默认667
 * @returns {Promise<Object>} - 返回 {canvas, ctx, width, height}
 */
function initCanvas(context, selector = '#posterCanvas', width = 375, height = 667) {
  return new Promise((resolve, reject) => {
    const query = context.createSelectorQuery ? 
                  context.createSelectorQuery() : 
                  wx.createSelectorQuery().in(context);
    
    query.select(selector)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          reject(new Error('获取Canvas失败'));
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        resolve({ canvas, ctx, width, height });
      });
  });
}

/**
 * Canvas导出为临时文件
 * @param {Object} canvas - Canvas对象
 * @param {Object} options - 导出选项
 * @param {number} options.quality - 图片质量，0-1之间，默认0.8
 * @param {string} options.fileType - 文件类型，jpg或png，默认jpg
 * @returns {Promise<string>} - 返回临时文件路径
 */
function canvasToTempFile(canvas, options = {}) {
  const { quality = 0.8, fileType = 'jpg' } = options;
  
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas: canvas,
      fileType: fileType,
      quality: quality,
      success: (res) => {
        console.log('Canvas导出成功，临时路径:', res.tempFilePath);
        console.log('路径类型:', res.tempFilePath.startsWith('http://tmp/') ? 'http://tmp/' : 'other');
        resolve(res.tempFilePath);
      },
      fail: (err) => {
        console.error('Canvas导出失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 显示分享图片菜单
 * @param {string} filePath - 图片文件路径
 * @returns {Promise}
 */
function showShareImageMenu(filePath) {
  return new Promise((resolve, reject) => {
    console.log('准备显示分享图片菜单');
    console.log('文件路径:', filePath);
    
    // 检查基础库版本
    const systemInfo = wx.getSystemInfoSync();
    console.log('基础库版本:', systemInfo.SDKVersion);
    
    // 检查是否支持 showShareImageMenu
    if (!wx.showShareImageMenu) {
      const error = new Error('当前基础库版本过低，不支持 wx.showShareImageMenu');
      console.error(error.message);
      reject(error);
      return;
    }
    
    // 检查文件是否存在并获取文件信息
    const fs = wx.getFileSystemManager();
    try {
      fs.accessSync(filePath);
      const stats = fs.statSync(filePath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      console.log('文件存在，大小:', fileSizeKB, 'KB');
      
      // 检查文件大小是否合理（建议小于 2MB）
      if (stats.size > 2 * 1024 * 1024) {
        console.warn('警告：文件大小超过 2MB，可能导致分享失败');
      }
      
      console.log('开始调用分享菜单...');
    } catch (e) {
      console.error('文件不存在或无法访问:', filePath, e);
      reject(new Error('文件不存在'));
      return;
    }
    
    // 调用分享菜单
    wx.showShareImageMenu({
      path: filePath,
      success: (res) => {
        console.log('✅ 分享菜单显示成功:', res);
        resolve(res);
      },
      fail: (err) => {
        console.error('❌ 分享菜单显示失败:', err);
        console.error('错误信息:', err.errMsg);
        console.error('文件路径:', filePath);
        
        // 用户取消操作不算错误，静默处理
        if (err.errMsg && err.errMsg.includes('cancel')) {
          console.log('用户取消了分享操作');
          resolve({ cancelled: true });
        } else {
          reject(err);
        }
      }
    });
  });
}

/**
 * 生成二维码并显示分享菜单（通用方法）
 * @param {Object} params - 参数对象
 * @param {string} params.scene - 场景值
 * @param {string} params.page - 页面路径
 * @param {number} params.width - 小程序码宽度，默认430
 */
async function generateAndShareQRCode(params) {
  try {
    wx.showLoading({ title: '生成中...' });

    // 生成小程序码
    const qrcodeBase64 = await generateQRCode({
      scene: params.scene,
      page: params.page,
      width: params.width || 430
    });

    // 保存为临时文件
    const filePath = await saveBase64ToFile(qrcodeBase64, 'qrcode.png');

    wx.hideLoading();

    // 显示分享菜单
    await showShareImageMenu(filePath);
  } catch (error) {
    wx.hideLoading();
    console.error('生成二维码失败:', error);
    wx.showToast({
      title: error.message || '生成失败',
      icon: 'none'
    });
    throw error;
  }
}

module.exports = {
  // 小程序码生成
  generateQRCode,
  
  // 文件操作
  saveBase64ToFile,
  
  // Canvas辅助方法
  initCanvas,
  canvasToTempFile,
  loadImageFromBase64,
  loadImageFromUrl,
  drawText,
  
  // 分享方法
  showShareImageMenu,
  generateAndShareQRCode
};

