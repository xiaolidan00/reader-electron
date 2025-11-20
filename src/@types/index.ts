export type BookType = {
  id: string;
  /**标题*/
  name: string;
  /**当前章节 */
  chapter: number;
  /**当前章节页*/
  index: number;
  /**章节数量*/
  total: number;
  /**字数*/
  num: number;
  /**更新时间*/
  updateTime: number;
  /**文件大小*/
  size: number;
  /**章节正则类型*/
  regexType?: number;
  /**章节正则表达式*/
  regex?: string;
  /**编码方式*/
  encode?: string;
  /**文件路径*/
  path: string;
};
export type ChapterType = {
  index: number;
  /**标题*/
  title: string;
  /**章节内容*/
  content: string[];
};
export type SearchItemType = {
  content: string;
  chapter: number;
  index: number;
  start: number;
};
