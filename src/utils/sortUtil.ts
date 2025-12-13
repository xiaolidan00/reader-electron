import PinYin from './pinyin.json';

const TxtRegex = '[\u4e00-\u9fa5a-zA-Z0-9]+';
//汉字转拼音
export function convertPinyin(s: string) {
  const str: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (new RegExp(TxtRegex).test(c)) {
      if (/a-zA-Z0-9/.test(c)) {
        str.push(c);
      } else {
        for (const k in PinYin) {
          const p = PinYin[k as keyof typeof PinYin];
          if (p.indexOf(c) >= 0) {
            str.push(k);
            break;
          }
        }
      }
    }
  }
  return str.join('');
}
