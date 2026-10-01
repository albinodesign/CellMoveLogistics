import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://cellmove-logistics.com',
  integrations: [tailwind()],
  output: 'static',
  build: {
    // 'directory' (Astros Default) erzeugt dist/services/index.html statt
    // dist/services.html. Ohne das liefern alle Seiten ausser der Startseite
    // ein 404, weil die Links auf /services ohne .html zeigen und der Host
    // kein Pretty-URL-Mapping macht. Siehe AGENTS.md.
    format: 'directory',
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
