// Vite `?raw` imports (file contents as a string). Used by tests only.
declare module '*?raw' {
  const content: string;
  export default content;
}
