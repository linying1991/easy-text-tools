function registerDropzone(element, onFileDropCallback) {
  function preventDefaults(ev) {
    ev.preventDefault();
    ev.stopPropagation();
  }

  // 防止浏览器默认行为（例如在新窗口中打开图片）
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, preventDefaults, false);
  });

  // 拖拽目标对象：div#dropzone
  element.addEventListener('dragleave', ev => {
    element.classList.remove('dragover');
    ev.preventDefault();
    ev.stopPropagation();
  });

  element.addEventListener('mouseout', ev => {
    ev.preventDefault();
    ev.stopPropagation();
  });

  element.addEventListener('dragover', ev => {
    element.classList.add('dragover');
    ev.preventDefault();
    ev.stopPropagation();
  });

  element.addEventListener('drop', ev => {
    element.classList.remove('dragover');
    ev.preventDefault();
    ev.stopPropagation();

    const files = Array.from(ev.dataTransfer.files);
    if (files.length > 0) {
      onFileDropCallback(files);
    }
  });
}

export { registerDropzone };
