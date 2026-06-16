# electron 开发问题

## 不要用pnpm,用yarn,npm,否则build失败

## 配置 npm 镜像

修改`.npmrc`文件

```ini
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
```

## electron-builder 配置 afterPack 移除语言文件

`electron-builder.json5`

```json
{
  "afterPack": "./removeLocales.js"
}
```

`removeLocales.js`

```js
import fs from "node:fs";

export default function (context) {
  const localeDir = context.appOutDir + "/locales/";
  const files = fs.readdirSync(localeDir);
  if (!(files && files.length)) return;
  for (let i = 0, len = files.length; i < len; i++) {
    if (files[i] !== "zh-CN.pak") fs.unlinkSync(localeDir + files[i]);
  }
}
```

## 注意事项

- 要在管理员的命令行窗口执行`npm run build`或者以管理员身份运行 build.bat
- logo 图标一定要用 大小为 256x256 的 png/jpg/ico 图片，不能用 svg
- css 使用图片资源地址`url(/aaa.svg)`
- ipcRenderer.off 和 removeListener 调用会失败，没法注销事件监听，只能强行全部监听移除，这什么鬼 Bug
- node 版本 18.20.2
- 包管理 yarn
- electron-builder 打包报错 Fatal error: Unable to commit changes 把电脑管家等关闭即可
- icon配置,icon大小至少`256x256`，格式`ico`

# 版本更新

将最新版本信息放在服务端，然后下载github的release安装包

取安装包属性的大小作为size值，而非占用空间

```json
{
  "version": "1.0.9",
  "url": "https://github.com/xiaolidan00/reader-electron/releases/download/v1.0.9/Txt.-win-1.0.9.exe",
  "size": 79175250
}
```

配置环境变量版本信息

```ini
ENV = 'production'
VITE_LATEST_DOWNLOAD='https://www.xiaolidan00.top/reader-version.json'
```
