import { BookType } from '../@types';
import { ref } from 'vue';

export const selectBook = ref('');
export const dataList = ref<Array<BookType>>([]);
export const bookItem = ref<BookType>();

export const loading = ref<boolean>(true);
