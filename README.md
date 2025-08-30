# Txt 阅读器 ReaderElectron

简单的 txt 阅读器，方便 pc 端摸鱼看或听小说，嘿嘿

## v1.0.0

- 导入 txt
- 批量操作，删除记录或文件
- 查看书本信息
- 搜索书架
- 看书分页，左右翻页，章节菜单栏
- 搜索内容关键词，跳转与高亮
- 语音阅读内容，速度，播音员

## v1.0.1

- txt 文件拖入
- 监测耳机等状态，一旦拔掉立即停止播放，避免尴尬

## v1.0.2

- 内容章节正则设置
- 字体颜色与背景设置
- 分模块
- 另存为带章节的 txt

## v1.0.3

- 单本书详情删除记录或删除文件功能
- 单本书详情排版优化
- 单本书详情添加字数统计
- 添加部分章节导出功能
- 阅读快捷键翻页，章节列表滚动定位

## v1.0.4

- Electron Node 操作优化
- x32 兼容打包

## v1.0.5

- 朗读时文本高亮
- 文本内容排版优化
- 打包体积优化，只保留中文语言包

# electron 开发问题

## pnpm install electron node install 失败

修改 install.js

`node_modules\electron\install.js`

```js
downloadArtifact({
  version,
  artifactName: 'electron',
  force: process.env.force_no_cache === 'true',
  cacheRoot: process.env.electron_config_cache,
  checksums:
    process.env.electron_use_remote_checksums ??
    process.env.npm_config_electron_use_remote_checksums
      ? undefined
      : require('./checksums.json'),
  platform,
  arch,
  mirrorOptions: {
    mirror: 'http://npmmirror.com/mirrors/electron/'
  }
})
  .then(extractFile)
  .catch((err) => {
    console.error(err.stack);
    process.exit(1);
  });
```

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
import fs from 'node:fs';

export default function (context) {
  const localeDir = context.appOutDir + '/locales/';
  const files = fs.readdirSync(localeDir);
  if (!(files && files.length)) return;
  for (let i = 0, len = files.length; i < len; i++) {
    fs.unlinkSync(localeDir + files[i]);
  }
}
```

## 注意事项

- 要在管理员的命令行窗口执行`npm run build`
- logo 图标一定要用 大小为 256x256 的 png/jpg/ico 图片，不能用 svg
- css 使用图片资源地址`url(/aaa.svg)`
- ipcRenderer.off 和 removeListener 调用会失败，没法注销事件监听，只能强行全部监听移除，这什么鬼 Bug
- node 版本 18.20.2
- 包管理 yarn
