/**
 * 异步读取图片文件
 * @param {Blob} blob 
 * @param {Function} callback 回调 Image 对象
 */
async function readImage(blob) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = (ev) => {
      let img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 异步读取文件为 ArrayBuffer
 * @param {Blob} blob 
 * @returns {Promise<ArrayBuffer>}
 */
async function readFileAsArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      resolve(ev.target.result);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * 验证文件是否为 WebP 格式
 * @param {File} file 
 * @returns {boolean}
 */
function isWebPFile(file) {
  return file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
}

export { readImage, readFileAsArrayBuffer, isWebPFile };
