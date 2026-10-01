import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
  build: {
    format: 'file',
    assets: 'assets'
  },
  compressHTML: true,
  vite: {
    build: {
      cssCodeSplit: false,
      minify: true
    }
  }
});
