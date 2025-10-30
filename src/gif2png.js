import { parseGIF, decompressFrames } from 'gifuct-js';

/**
 * 将 GIF 文件转换为 PNG 图片数组
 * @param {ArrayBuffer} gifBuffer - GIF 文件的 ArrayBuffer
 * @param {Object} options - 转换选项
 * @param {String} options.frameSelection - 帧选择模式: 'all', 'first', 'last', 'custom'
 * @param {String} options.frameRange - 自定义帧范围，如 "1-5" 或 "1,3,5"
 * @param {Function} options.onProgress - 进度回调函数
 * @returns {Promise<Array>} PNG Blob 数组
 */
async function gif2png(gifBuffer, options = {}) {
  const { onProgress } = options;
  
  try {
    // 解析 GIF 文件 (10%)
    if (onProgress) onProgress(10);
    const gif = parseGIF(gifBuffer);
    
    // 解压帧数据 (20%)
    if (onProgress) onProgress(20);
    const frames = decompressFrames(gif, true);
    
    if (!frames || frames.length === 0) {
      throw new Error('No frames found in GIF file');
    }

    // 获取 GIF 的全局尺寸
    const globalWidth = gif.lsd.width;
    const globalHeight = gif.lsd.height;

    // 根据选项确定要提取的帧 (25%)
    if (onProgress) onProgress(25);
    const selectedFrames = selectFrames(frames, options);
    
    // 创建合成画布来处理帧叠加 (30%)
    if (onProgress) onProgress(30);
    const compositeCanvas = new OffscreenCanvas(globalWidth, globalHeight);
    const compositeCtx = compositeCanvas.getContext('2d');
    
    // 转换每一帧为 PNG (30% - 90%)
    const pngBlobs = [];
    
    for (let i = 0; i < selectedFrames.length; i++) {
      const frame = selectedFrames[i];
      const frameIndex = frame.originalIndex;
      
      // 重新构建到当前帧的完整图像
      await buildCompositeFrame(frames, frameIndex, compositeCtx, globalWidth, globalHeight);
      
      // 将合成结果转换为 PNG
      const blob = await compositeCanvas.convertToBlob({ type: 'image/png' });
      pngBlobs.push({
        blob,
        frameIndex: frameIndex,
        delay: frame.delay
      });
      
      // 更新进度 (30% - 90%)
      if (onProgress) {
        const frameProgress = 30 + ((i + 1) / selectedFrames.length) * 60;
        onProgress(frameProgress);
      }
    }
    
    // 完成 (90%)
    if (onProgress) onProgress(90);
    
    return pngBlobs;
  } catch (error) {
    console.error('GIF conversion error:', error);
    throw error;
  }
}

/**
 * 根据选项选择要提取的帧
 * @param {Array} frames - 所有帧
 * @param {Object} options - 选项
 * @returns {Array} 选中的帧
 */
function selectFrames(frames, options) {
  const { frameSelection = 'all', frameRange = '' } = options;
  
  // 为每个帧添加原始索引
  frames.forEach((frame, index) => {
    frame.originalIndex = index;
  });
  
  switch (frameSelection) {
    case 'first':
      return [frames[0]];
    
    case 'last':
      return [frames[frames.length - 1]];
    
    case 'custom':
      return parseFrameRange(frames, frameRange);
    
    case 'all':
    default:
      return frames;
  }
}

/**
 * 解析帧范围字符串
 * @param {Array} frames - 所有帧
 * @param {String} rangeStr - 范围字符串，如 "1-5" 或 "1,3,5"
 * @returns {Array} 选中的帧
 */
function parseFrameRange(frames, rangeStr) {
  if (!rangeStr.trim()) {
    return frames;
  }
  
  const selectedFrames = [];
  const parts = rangeStr.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    
    if (trimmed.includes('-')) {
      // 范围格式: "1-5"
      const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()) - 1);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(0, start); i <= Math.min(frames.length - 1, end); i++) {
          if (!selectedFrames.find(f => f.originalIndex === i)) {
            selectedFrames.push(frames[i]);
          }
        }
      }
    } else {
      // 单个帧: "3"
      const index = parseInt(trimmed) - 1;
      if (!isNaN(index) && index >= 0 && index < frames.length) {
        if (!selectedFrames.find(f => f.originalIndex === index)) {
          selectedFrames.push(frames[index]);
        }
      }
    }
  }
  
  // 按原始索引排序
  return selectedFrames.sort((a, b) => a.originalIndex - b.originalIndex);
}

/**
 * 构建到指定帧的完整合成图像
 * @param {Array} frames - 所有帧数据
 * @param {Number} targetFrameIndex - 目标帧索引
 * @param {CanvasRenderingContext2D} ctx - 合成画布上下文
 * @param {Number} globalWidth - GIF 全局宽度
 * @param {Number} globalHeight - GIF 全局高度
 */
async function buildCompositeFrame(frames, targetFrameIndex, ctx, globalWidth, globalHeight) {
  // 清空画布
  ctx.clearRect(0, 0, globalWidth, globalHeight);
  
  // 设置背景色（如果有的话）
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, globalWidth, globalHeight);
  
  // 从第一帧开始逐步合成到目标帧
  for (let i = 0; i <= targetFrameIndex; i++) {
    const frame = frames[i];
    
    // 处理前一帧的处置方法
    if (i > 0) {
      const prevFrame = frames[i - 1];
      handleDisposalMethod(ctx, prevFrame, globalWidth, globalHeight);
    }
    
    // 绘制当前帧
    await drawFrame(ctx, frame);
  }
}

/**
 * 处理帧的处置方法
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {Object} frame - 帧数据
 * @param {Number} globalWidth - 全局宽度
 * @param {Number} globalHeight - 全局高度
 */
function handleDisposalMethod(ctx, frame, globalWidth, globalHeight) {
  const disposal = frame.disposalType;
  
  switch (disposal) {
    case 1: // 不处置，保留当前帧
      // 什么都不做
      break;
      
    case 2: // 恢复到背景色
      ctx.clearRect(
        frame.dims.left,
        frame.dims.top,
        frame.dims.width,
        frame.dims.height
      );
      break;
      
    case 3: // 恢复到前一帧
      // 这个比较复杂，简化处理：清除当前帧区域
      ctx.clearRect(
        frame.dims.left,
        frame.dims.top,
        frame.dims.width,
        frame.dims.height
      );
      break;
      
    default: // 0 或其他：不指定处置方法
      // 什么都不做
      break;
  }
}

/**
 * 在画布上绘制单个帧
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {Object} frame - 帧数据
 */
async function drawFrame(ctx, frame) {
  // 创建临时画布来处理帧数据
  const tempCanvas = new OffscreenCanvas(frame.dims.width, frame.dims.height);
  const tempCtx = tempCanvas.getContext('2d');
  
  // 创建 ImageData
  const imageData = new ImageData(
    new Uint8ClampedArray(frame.patch),
    frame.dims.width,
    frame.dims.height
  );
  
  // 绘制到临时画布
  tempCtx.putImageData(imageData, 0, 0);
  
  // 将临时画布绘制到主画布的正确位置
  ctx.drawImage(
    tempCanvas,
    frame.dims.left,
    frame.dims.top
  );
}

export { gif2png };