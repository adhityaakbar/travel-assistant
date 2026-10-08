import { execSync } from 'child_process';

const gitCommitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: `v1.0.0-${gitCommitHash}`,
  },
};

export default nextConfig;
