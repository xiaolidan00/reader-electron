import fs from 'node:fs';

export default function (context) {
  const localeDir = context.appOutDir + '/locales/';
  const files = fs.readdirSync(localeDir);
  if (!(files && files.length)) return;
  for (let i = 0, len = files.length; i < len; i++) {
    if (files[i] !== 'zh-CN.pak') fs.unlinkSync(localeDir + files[i]);
  }
}
