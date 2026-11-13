/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WORDPRESS_DEMO_SITE_URL?: string;
  readonly VITE_WORDPRESS_DEMO_USERNAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
