// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'

const adsCode = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6973856684486491" crossorigin="anonymous"></script>`;
const analysisCode = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-WXD70RT28R"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-WXD70RT28R');
</script>`;

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        '404': resolve(__dirname, '404.html'),
      },
    },
  },
  plugins: [
    obfuscatorPlugin({
      include: ["main.js", "src/**/*.js"],
      exclude: [/node_modules/],
      apply: "build",
      debugger: true,
      options: {
        "compact": true,
        "controlFlowFlattening": false,
        "deadCodeInjection": false,
        "debugProtection": false,
        "debugProtectionInterval": 1000,
        "disableConsoleOutput": true,
        "identifierNamesGenerator": "hexadecimal",
        "log": false,
        "domainLock": ["webptopng.dev", ".webptopng.dev"],
        "domainLockRedirectUrl": "about:blank",
        "numbersToExpressions": false,
        "renameGlobals": false,
        "selfDefending": true,
        "simplify": true,
        "splitStrings": false,
        "stringArray": true,
        "stringArrayCallsTransform": false,
        "stringArrayEncoding": [],
        "stringArrayIndexShift": true,
        "stringArrayRotate": true,
        "stringArrayShuffle": true,
        "stringArrayWrappersCount": 1,
        "stringArrayWrappersChainedCalls": true,
        "stringArrayWrappersParametersMaxCount": 2,
        "stringArrayWrappersType": "variable",
        "target": "browser",
        "stringArrayThreshold": 0.75,
        "unicodeEscapeSequence": false
      }
    }),
    {
      name: 'inject-analytics',
      transformIndexHtml: {
        order: 'pre',
        handler(html, { path }) {
          console.log(`处理：${path}`);

          // 排除某些特定文件
          const excludeFiles = ['privacy.html']; // 可以添加要排除的文件
          
          if (excludeFiles.some(excludeFile => path.endsWith(excludeFile))) {
            return html; // 不插入代码
          }
          
          return html.replace(
            '</head>',
            `${analysisCode}\n</head>`
            // `${adsCode}\n${analysisCode}\n</head>`
          )
        }
      }
    },
  ],
})