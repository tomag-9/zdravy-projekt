/// <reference types="vite/client" />

// Injected by vite.config.ts `define` from package.json "version".
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Web Push install prompt – not in standard TypeScript lib
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
