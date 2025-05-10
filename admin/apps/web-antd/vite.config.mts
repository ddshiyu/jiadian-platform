import path from 'node:path';

import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            target: 'http://localhost:3000',
            // target: 'https://api.xiliuhui178.top',
            ws: true,
          },
        },
      },
    },
  };
});
