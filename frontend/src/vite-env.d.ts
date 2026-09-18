/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_IDENTITY_REGISTRY_ADDRESS: string;
  readonly VITE_RBAC_REGISTRY_ADDRESS: string;
  readonly VITE_ASSET_NFT_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
