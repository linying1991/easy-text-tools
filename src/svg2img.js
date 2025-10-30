/**
 * 将 svg 元素转换为 png DataURL 格式
 * @param {ImageElement} img 
 * @param {Object} options
 * @param {String} options.format
 * @param {Number|null} options.width
 * @param {Number|null} options.height
 * @param {Function} callback 
 */
async function svg2img(img, options) {
  const size = {
    width: img.width,
    height: img.height,
  };
  if (options.width) {
    const ratio = options.width / img.width;
    size.width = options.width;
    size.height = Math.round(img.height * ratio);
  }
  if (options.height) {
    const ratio = options.height / img.height;
    size.width = Math.round(img.width * ratio);
    size.height = options.height;
  }

  const offscreen = new OffscreenCanvas(size.width, size.height);
  const ctx = offscreen.getContext("2d");
  if (options.format === 'image/jpeg') {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size.width, size.height);
  }
  ctx.drawImage(img, 0, 0, size.width, size.height);
  return offscreen.convertToBlob({ type: options.format });
}

export { svg2img };
