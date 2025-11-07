// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'
import { createHtmlPlugin } from 'vite-plugin-html'
import { readdirSync, existsSync, statSync } from 'fs'
import path from 'path'

const adsCode = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6973856684486491" crossorigin="anonymous"></script>`;
const analysisCode = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-19DWT72H5Y"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-19DWT72H5Y');
</script>`;
const footerContent = `
    <style>
      footer {
        text-align: center;
        margin-top: 2rem;
      }
    </style>
    <footer>
    <small>
      <p>&copy; 2025 Easy Text Tools - 100+ Text Processing Tools</p>
      <p style="margin-top: 0.5rem;">
        All processing happens in your browser. Your data never leaves your device.
      </p>
    </small>
    <small>
      <a href="/">Home</a> •
      <a target="_blank" href="/feedback.html">Contact Us</a>
    </small>
    </footer>`

// 动态获取所有工具目录
function getToolDirectories() {
  const toolsDir = resolve(__dirname, 'tools');
  const items = readdirSync(toolsDir);
  const toolDirs = [];
  
  for (const item of items) {
    const itemPath = path.join(toolsDir, item);
    const stat = statSync(itemPath);
    
    if (stat.isDirectory()) {
      const indexPath = path.join(itemPath, 'index.html');
      if (existsSync(indexPath)) {
        toolDirs.push({
          name: item,
          path: indexPath
        });
      }
    }
  }
  
  return toolDirs;
}

// 构建输入配置
function buildInputConfig() {
  const toolDirs = getToolDirectories();
  const input = {
    main: resolve(__dirname, 'index.html'),
    privacy: resolve(__dirname, 'privacy.html'),
    'feedback': resolve(__dirname, 'feedback.html'),
    '404': resolve(__dirname, '404.html'),
  };
  
  // 动态添加所有工具目录
  toolDirs.forEach(tool => {
    input[tool.name] = tool.path;
  });
  
  return input;
}

export default defineConfig({
  build: {
    rollupOptions: {
      input: buildInputConfig(),
    },
  },
  plugins: [
    createHtmlPlugin({
      // minify: true, // 开启 HTML 压缩
      // 或者自定义压缩选项
      minify: {
        collapseWhitespace: true,
        keepClosingSlash: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true
      }
    }),
    // obfuscatorPlugin({
    //   include: ["main.js", "src/**/*.js"],
    //   exclude: [/node_modules/],
    //   apply: "build",
    //   debugger: true,
    //   options: {
    //     "compact": true,
    //     "controlFlowFlattening": false,
    //     "deadCodeInjection": false,
    //     "debugProtection": false,
    //     "debugProtectionInterval": 1000,
    //     "disableConsoleOutput": true,
    //     "identifierNamesGenerator": "hexadecimal",
    //     "log": false,
    //     "domainLock": ["easytexttool.com", ".easytexttool.com"],
    //     "domainLockRedirectUrl": "about:blank",
    //     "numbersToExpressions": false,
    //     "renameGlobals": false,
    //     "selfDefending": true,
    //     "simplify": true,
    //     "splitStrings": false,
    //     "stringArray": true,
    //     "stringArrayCallsTransform": false,
    //     "stringArrayEncoding": [],
    //     "stringArrayIndexShift": true,
    //     "stringArrayRotate": true,
    //     "stringArrayShuffle": true,
    //     "stringArrayWrappersCount": 1,
    //     "stringArrayWrappersChainedCalls": true,
    //     "stringArrayWrappersParametersMaxCount": 2,
    //     "stringArrayWrappersType": "variable",
    //     "target": "browser",
    //     "stringArrayThreshold": 0.75,
    //     "unicodeEscapeSequence": false
    //   }
    // }),
    {
      name: 'inject-analytics',
      transformIndexHtml: {
        order: 'pre',
        handler(html, { path }) {
          console.log(`处理：${path}`);

          // 排除某些特定文件
          const excludeFiles = ['privacy.html', 'feedback.html']; // 可以添加要排除的文件
          
          if (excludeFiles.some(excludeFile => path.endsWith(excludeFile))) {
            return html; // 不插入代码
          }

          let newHtml = html;
          newHtml = newHtml.replace(
            '</head>',
            `${analysisCode}\n</head>`
            // `${adsCode}\n${analysisCode}\n</head>`
          )
          newHtml = newHtml.replace(
            '<footer></footer>',
            footerContent
          )
          
          return newHtml;
        }
      }
    },
  ],
})