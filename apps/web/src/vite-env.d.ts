/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK_API?: string;
  readonly VITE_ENABLE_DEMO_CONTROLS?: string;
  readonly VITE_CAPABILITIES_PRESET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
