export type BookType = {
  id: string;
  name: string;
  chapter: number;
  total: number;
  updateTime: number;
  importTime: number;
  readTime: number;
  path: string;
  group: string;
  disable?: boolean;
};
export type ChapterType = {
  //   index: number;
  title: string;
  content: string[];
};
