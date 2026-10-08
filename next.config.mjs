import { readFileSync } from 'fs';

const appVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url))).version;

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: `v${appVersion}`,
  },
};

export default nextConfig;
