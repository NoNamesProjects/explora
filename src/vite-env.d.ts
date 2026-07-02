/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUDINARY_CLOUD?: string;
  readonly VITE_CLOUDINARY_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
