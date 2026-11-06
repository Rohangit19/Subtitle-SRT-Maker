declare module 'word-list' {
  const wordList: string;
  export default wordList;
}

declare module 'metaphone' {
  export function metaphone(word: string): string;
}
