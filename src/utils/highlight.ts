// ::highlight(search-highlight) {
//   background-color: yellow;
//   color: black;
// }
export const searchHighlight = new Highlight();
CSS.highlights.set(`search-highlight`, searchHighlight);
export function setHighlight(start: number, textNode: Node, searchLen: number) {
  const range = new Range();
  range.setStart(textNode, start < 0 ? 0 : start);
  range.setEnd(textNode, start + searchLen);
  searchHighlight.add(range);
  return range;
}
export function removeHighlight(range: Range) {
  searchHighlight.delete(range);
}
