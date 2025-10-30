import './style.css'
import { openModal, closeModal } from "./src/modal.js";
import { webp2png } from "./src/webp2png.js";
import * as utils from "./src/utils.js";
import { registerDropzone } from "./src/dropzone.js";
import { saveAs } from 'file-saver';
import { zip } from 'fflate';

const MESSAGE = (() => {
  if (location.pathname.toLowerCase().startsWith('/zh')) {
    return {
      ERROR: {
        TITLE: '错误',

        READ_FILE: '文件读取失败：{0}',
        ALL_FAILED: '所有文件都处理失败。',
        INVALID_WEBP: '无效的 WebP 文件：{0}',
      },
      SUCCESS: {
        TITLE: '处理完成',
        DOWNLOAD: '成功转换了 {0} 个图片。<br>下载已开始，请检查您的下载文件夹。',
      },
    };
  } else {
    return {
      "ERROR": {
        "TITLE": "Error",

        "READ_FILE": "File reading failed: {0}",
        "ALL_FAILED": "All files failed to process.",
        "INVALID_WEBP": "Invalid WebP file: {0}"
      },
      "SUCCESS": {
        "TITLE": "Processing Complete",
        "DOWNLOAD": "Successfully converted {0} images.<br>The download has started, please check your download folder."
      }
    }
  }
})();

const elements = {
  fileContainer: document.querySelector("#file-container"),
  fileInput: document.querySelector("#file-input"),
  processingIndicator: document.querySelector("#processing-indicator"),
  progressFill: document.querySelector("#progress-fill"),
  progressText: document.querySelector("#progress-text"),
  closeModal: document.querySelector("#closeModal"),
  selectFiles() {
    elements.fileInput.click();
  },
  showProcessing() {
    elements.processingIndicator.classList.add('show');
    this.updateProgress(0);
  },
  hideProcessing() {
    elements.processingIndicator.classList.remove('show');
  },
  updateProgress(percentage) {
    if (elements.progressFill && elements.progressText) {
      elements.progressFill.style.width = `${percentage}%`;
      elements.progressText.textContent = `${Math.round(percentage)}%`;
    }
  }
}

class MessageBox {
  constructor() {
    this.dialog = document.querySelector('dialog');
    this.title = this.dialog.querySelector('.dialog-title');
    this.message = this.dialog.querySelector('.dialog-message');
    this._initCloseEvent();
  }

  show(title, message, type) {
    if (type === MessageBox.TYPE_ERROR) {
      this.title.style.color = 'red';
    } else {
      this.title.style.color = 'var(--pico-color)';
    }
    this.title.innerHTML = title;
    this.message.innerHTML = message;
    openModal(this.dialog);
  }

  _initCloseEvent() {
    const btn = this.dialog.querySelector('button[name=close-modal]');
    btn.addEventListener('click', ev => {
      const dlg = ev.target.closest('dialog');
      if (dlg) { closeModal(dlg); }
    });
  }
}
MessageBox.TYPE_ERROR = 'error';
MessageBox.TYPE_SUCCESS = 'success';

const messageBox = new MessageBox();

// 用户点击文件容器
elements.fileContainer.addEventListener('click', () => {
  elements.selectFiles();
});

// 用户选择文件
elements.fileInput.addEventListener('change', (ev) => {
  const files = Array.from(ev.target.files);
  if (files.length > 0) {
    processStart(files);
  }
});
registerDropzone(document.body, processStart);



function getOptions() {
  // WebP 转换选项
  return {
    quality: 1.0 // PNG 质量
  };
}

function processStart(files) {
  // 确保files是数组
  const fileArray = Array.isArray(files) ? files : Array.from(files);
  
  if (fileArray.length === 0) {
    return;
  }
  
  elements.showProcessing();
  
  if (fileArray.length === 1) {
    processFile(fileArray[0]);
  } else {
    processFiles(fileArray);
  }
}

// 处理单个文件
async function processFile(file) {
  if (!utils.isWebPFile(file)) {
    const errMsg = MESSAGE.ERROR.INVALID_WEBP.replace('{0}', file.name);
    messageBox.show(MESSAGE.ERROR.TITLE, errMsg, MessageBox.TYPE_ERROR);
    elements.hideProcessing();
    elements.fileInput.value = '';
    return;
  }

  const options = getOptions();
  try {
    elements.updateProgress(5);
    const arrayBuffer = await utils.readFileAsArrayBuffer(file);
    
    // 添加进度回调
    options.onProgress = (progress) => {
      elements.updateProgress(progress);
    };
    
    const pngFrames = await webp2png(arrayBuffer, options);
    
    // 检查是否是动画 WebP 的第一帧
    const isAnimatedWebP = pngFrames.length === 1 && pngFrames[0].isFromAnimated;
    
    if (pngFrames.length === 1) {
      // 单帧直接下载
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const downloadFileName = `${baseName}.png`;
      saveAs(pngFrames[0].blob, downloadFileName);
      elements.updateProgress(100);
      
      let successMsg = MESSAGE.SUCCESS.DOWNLOAD.replace('{0}', 1);
      if (isAnimatedWebP) {
        const animatedNote = location.pathname.toLowerCase().startsWith('/zh') 
          ? '<br><small style="color: #888;">注意：检测到动画 WebP，但由于浏览器限制只能提取第一帧。</small>'
          : '<br><small style="color: #888;">Note: Animated WebP detected, but only the first frame can be extracted due to browser limitations.</small>';
        successMsg += animatedNote;
      }
      messageBox.show(MESSAGE.SUCCESS.TITLE, `${successMsg}<br>${downloadFileName}`, MessageBox.TYPE_SUCCESS);
    } else {
      // 多帧打包为 ZIP
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const zipObjs = {};
      
      for (let i = 0; i < pngFrames.length; i++) {
        const frameData = pngFrames[i];
        const frameNumber = (frameData.frameIndex + 1).toString().padStart(4, '0');
        const fileName = `${baseName}_frame_${frameNumber}.png`;
        const arrayBuffer = await frameData.blob.arrayBuffer();
        zipObjs[fileName] = new Uint8Array(arrayBuffer);
        
        // 更新进度 90-95%
        const progress = 90 + (i / pngFrames.length) * 5;
        elements.updateProgress(progress);
      }
      
      elements.updateProgress(95);
      zip(zipObjs, { level: 0 }, (err, data) => {
        if (err) {
          messageBox.show(MESSAGE.ERROR.TITLE, err.message, MessageBox.TYPE_ERROR);
        } else {
          elements.updateProgress(100);
          const downloadFileName = `${baseName}_frames.zip`;
          const successMsg = MESSAGE.SUCCESS.DOWNLOAD.replace('{0}', pngFrames.length);
          messageBox.show(MESSAGE.SUCCESS.TITLE, `${successMsg}<br>${downloadFileName}`, MessageBox.TYPE_SUCCESS);
          saveAs(new Blob([data], { type: 'application/zip' }), downloadFileName);
        }
        elements.hideProcessing();
      });
      return; // 不在这里隐藏处理指示器
    }
  } catch (err) {
    console.error('Processing error:', err);
    const errMsg = MESSAGE.ERROR.READ_FILE.replace('{0}', file.name);
    messageBox.show(MESSAGE.ERROR.TITLE, errMsg, MessageBox.TYPE_ERROR);
  }
  elements.hideProcessing();
  elements.fileInput.value = '';
}

// 处理多个文件（用 zip 打包所有文件）
async function processFiles(files) {
  const options = getOptions();
  const msgArr = [];
  let totalFrames = 0;
  const zipObjs = {};
  const totalFiles = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // 基础进度：每个文件占总进度的 75% / 文件数量
    const baseProgress = (i / totalFiles) * 75;
    elements.updateProgress(baseProgress);
    
    if (!utils.isWebPFile(file)) {
      msgArr.push(MESSAGE.ERROR.INVALID_WEBP.replace('{0}', file.name));
      continue;
    }

    try {
      const arrayBuffer = await utils.readFileAsArrayBuffer(file);
      
      // 为每个文件添加进度回调
      const fileOptions = { 
        ...options, 
        onProgress: (progress) => {
          // 将单个文件的进度映射到总进度的一部分
          const fileProgressRange = 75 / totalFiles;
          const adjustedProgress = baseProgress + (progress / 100) * fileProgressRange;
          elements.updateProgress(adjustedProgress);
        }
      };
      
      const pngFrames = await webp2png(arrayBuffer, fileOptions);
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      
      for (let j = 0; j < pngFrames.length; j++) {
        const frameData = pngFrames[j];
        const fileName = files.length === 1 && pngFrames.length > 1 
          ? `${baseName}_frame_${(frameData.frameIndex + 1).toString().padStart(4, '0')}.png`
          : `${baseName}.png`;
        const arrayBuffer = await frameData.blob.arrayBuffer();
        zipObjs[fileName] = new Uint8Array(arrayBuffer);
        totalFrames++;
      }
    } catch (err) {
      msgArr.push(MESSAGE.ERROR.READ_FILE.replace('{0}', file.name));
      console.error('Processing error:', err);
    }
  }

  elements.updateProgress(80);

  if (totalFrames === 0) {
    msgArr.push(MESSAGE.ERROR.ALL_FAILED);
    messageBox.show(MESSAGE.ERROR.TITLE, msgArr.join("<br>"), MessageBox.TYPE_ERROR);
    elements.hideProcessing();
  } else {
    elements.updateProgress(85);
    zip(zipObjs, { level: 0 }, (err, data) => {
      if (err) {
        messageBox.show(MESSAGE.ERROR.TITLE, err.message, MessageBox.TYPE_ERROR);
      } else {
        elements.updateProgress(100);
        const downloadFileName = `${generateTimestamp()}-webp-converted.zip`;
        const successMsg = MESSAGE.SUCCESS.DOWNLOAD.replace('{0}', totalFrames);
        if (msgArr.length > 0) {
          msgArr.unshift(successMsg);
          msgArr.push(downloadFileName);
          messageBox.show(MESSAGE.SUCCESS.TITLE, msgArr.join("<br>"), MessageBox.TYPE_SUCCESS);
        } else {
          messageBox.show(MESSAGE.SUCCESS.TITLE, `${successMsg}<br>${downloadFileName}`, MessageBox.TYPE_SUCCESS);
        }
        saveAs(new Blob([data], { type: 'application/zip' }), downloadFileName);
      }
      elements.hideProcessing();
    });
  }
  elements.fileInput.value = '';
}

function generateTimestamp() {
  const now = new Date();

  const year = now.getFullYear().toString().slice(-2); 
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
