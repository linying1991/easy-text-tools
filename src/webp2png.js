/**
 * 将 WebP 文件转换为 PNG 图片数组
 * @param {ArrayBuffer} webpBuffer - WebP 文件的 ArrayBuffer
 * @param {Object} options - 转换选项
 * @param {Function} options.onProgress - 进度回调函数
 * @returns {Promise<Array>} PNG Blob 数组
 */
async function webp2png(webpBuffer, options = {}) {
  const { onProgress } = options;
  
  try {
    // 检查 WebP 文件头 (5%)
    if (onProgress) onProgress(5);
    if (!isValidWebP(webpBuffer)) {
      throw new Error('Invalid WebP file format');
    }
    
    // 创建 Blob 并加载为图片 (15%)
    if (onProgress) onProgress(15);
    const webpBlob = new Blob([webpBuffer], { type: 'image/webp' });
    
    // 检查是否为动画 WebP (25%)
    if (onProgress) onProgress(25);
    const isAnimated = await isAnimatedWebP(webpBuffer);
    
    if (isAnimated) {
      // 对于动画 WebP，提取第一帧并添加说明
      console.log('Detected animated WebP - extracting first frame only due to browser limitations');
      const img = await loadImage(webpBlob);
      if (onProgress) onProgress(50);
      
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      if (onProgress) onProgress(70);
      const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
      
      if (onProgress) onProgress(90);
      
      // 返回单帧，但标记为来自动画
      return [{
        blob: pngBlob,
        frameIndex: 0,
        delay: 0,
        isFromAnimated: true
      }];
    } else {
      // 处理静态 WebP
      const img = await loadImage(webpBlob);
      if (onProgress) onProgress(30);
      
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      
      // 绘制图片到画布 (50%)
      if (onProgress) onProgress(50);
      ctx.drawImage(img, 0, 0);
      
      // 转换为 PNG (70%)
      if (onProgress) onProgress(70);
      const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
      
      // 完成 (90%)
      if (onProgress) onProgress(90);
      
      return [{
        blob: pngBlob,
        frameIndex: 0,
        delay: 0
      }];
    }
  } catch (error) {
    console.error('WebP conversion error:', error);
    throw error;
  }
}

/**
 * 检查 WebP 文件格式是否有效
 * @param {ArrayBuffer} buffer - WebP 文件的 ArrayBuffer
 * @returns {boolean}
 */
function isValidWebP(buffer) {
  const view = new DataView(buffer);
  
  // 检查 RIFF 头
  if (view.getUint32(0, false) !== 0x52494646) { // "RIFF"
    return false;
  }
  
  // 检查 WEBP 标识
  if (view.getUint32(8, false) !== 0x57454250) { // "WEBP"
    return false;
  }
  
  return true;
}

/**
 * 加载图片
 * @param {Blob} blob - 图片 Blob
 * @returns {Promise<HTMLImageElement>}
 */
async function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * 检查是否为动画 WebP
 * @param {ArrayBuffer} buffer - WebP 文件的 ArrayBuffer
 * @returns {Promise<boolean>}
 */
async function isAnimatedWebP(buffer) {
  const view = new DataView(buffer);
  let offset = 12; // 跳过 RIFF 头
  
  try {
    while (offset < buffer.byteLength - 8) {
      // 读取 chunk 标识
      const chunkType = view.getUint32(offset, false);
      const chunkSize = view.getUint32(offset + 4, true);
      
      // 检查是否为 ANIM chunk (0x414E494D) 或 VP8X chunk 包含动画标志
      if (chunkType === 0x414E494D) {
        return true;
      }
      
      // 检查 VP8X chunk 中的动画标志
      if (chunkType === 0x56503858) { // "VP8X"
        if (offset + 12 < buffer.byteLength) {
          const flags = view.getUint8(offset + 8);
          // 检查第1位（动画标志）
          if (flags & 0x02) {
            return true;
          }
        }
      }
      
      // 移动到下一个 chunk
      offset += 8 + chunkSize;
      if (chunkSize % 2 === 1) offset++; // Padding
    }
    
    return false;
  } catch (error) {
    // 如果解析失败，假设是静态图片
    return false;
  }
}

/**
 * 转换单帧 WebP（回退方法）
 * @param {ArrayBuffer} webpBuffer - WebP 文件的 ArrayBuffer
 * @param {Object} options - 转换选项
 * @returns {Promise<Array>} PNG Blob 数组
 */
async function convertSingleFrameWebP(webpBuffer, options = {}) {
  const { onProgress } = options;
  
  if (onProgress) onProgress(50);
  
  const webpBlob = new Blob([webpBuffer], { type: 'image/webp' });
  const img = await loadImage(webpBlob);
  
  if (onProgress) onProgress(70);
  
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  if (onProgress) onProgress(85);
  
  const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
  
  return [{
    blob: pngBlob,
    frameIndex: 0,
    delay: 0
  }];
}

export { webp2png };