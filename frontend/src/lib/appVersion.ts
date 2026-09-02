// Jediný zdroj pravdy je koreňový VERSION súbor (bumpuje ho release-please);
// frontend/package.json "version" sa drží s ním v sync a vite.config.ts ju
// vloží do buildu ako __APP_VERSION__.
export const APP_VERSION = __APP_VERSION__;
