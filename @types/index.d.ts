export type BookType = {
  /**当前章节 */
  currentChapter: number;
  /**当前章节页*/
  pageIndex: number;
  /**章节数量*/
  totalChapter: number;
  /**字数*/
  textNum: number;
  /**更新时间*/
  updateTime: number;
  /**文件路径*/
  filePath: string;
  /** 文件名称*/
  fileName: string;
  /**文件大小*/
  fileSize: number;
  /**章节正则类型*/
  regexType: number;
  /**章节正则表达式*/
  regexStr: string;
  /**编码方式*/
  encodeStr: string;
  /**拼音*/
  pinyinStr: string;
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

export type BookStoreType = {
  /**@description 朗读速度 */
  speed: number;
  /**@description 当前章节标题 */
  title: string;
  /**@description 当前章节内容 */
  detail: string[];
  /**@description 当前展示正文内容 */
  showContent: string;
  /**@description 当前章节分页 */
  total: number;
  /**@description 是否打开章节目录 */
  isMenu: boolean;
  /**@description 是否打开朗读 */
  isListen: boolean;
  /**@description 是否打开搜索 */
  isSearch: boolean;
  /**@description 是否打开设置 */
  isSet: boolean;
  /**@description 是否开启鼠标/触屏事件 */
  isClick: boolean;
  /**@description 是否正在朗读 */
  isPlay: boolean;

  /**@description 当前章节 */
  currentChapter: number;
  /**@description 当前阅读页 */
  currentIndex: number;

  /**@description 每行多少个字 */
  LineNum: number;

  /**@description 每页多少行 */
  PageNum: number;
  /**@description 显示字体大小 */
  fontSize: number;
  /**@description 显示行高 */
  lineHeight: number;
  /**@description 字体颜色 */
  fontColor: string;
  /**@description 背景颜色 */
  bg: string;
  /**@description 章节列表 */
  chapterList: ChapterType[];
  /**@description 正则表达式类型 */
  regexType: number;
  /**@description 自定义正则表达式 */
  regex: string;
  /**@description 导出章节开始 */
  startChapter: number;
  /**@description 导出章节结束 */
  endChapter: number;
  /**@description 编码方式 */
  encode: string;
};

export type ListStoreType = {
  /**@description 展示模式，卡片或列表 */
  showType: string;
  /**@description 排序方式 */
  sortType: string;
  /**@description 搜索关键词 */
  searchKey: string;
  /**@description 是否批量操作 */
  isEdit: boolean;
  /**@description 批量操作选中书籍 */
  checkMap: Record<string, boolean>;
  /**@description 是否全选 */
  isAll: boolean;
  /**@description 暂时禁用打开文件按钮 */
  disable: boolean;
  /**@description 打开书籍详情 */
  isDetail: boolean;
  /**@description 书本列表 */
  dataList: BookType[];
  /**@description 当前书本详情 */
  bookItem?: BookType;
};

export type AppStoreType = {
  /**@description 选中书本ID */
  selectBook: string;
  /**@description 全局loading */
  loading: boolean;
  /**@description 全局loading */
  selectBookItem?: BookType;
};
