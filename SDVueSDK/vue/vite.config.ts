import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue'],
      dts: './src/types/auto-imports.d.ts'
    }),
    viteSingleFile()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    middlewareMode: false,
    fs: {
      allow: ['..']
    }
  },
  configureServer(server) {
    server.middlewares.use('/api/save-svg', (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const { svg, path } = JSON.parse(body);
            const filePath = fileURLToPath(new URL(`../${path}`, import.meta.url));
            const dir = dirname(filePath);
            mkdirSync(dir, { recursive: true });
            writeFileSync(filePath, svg, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, path: filePath }));
            console.log(`[Vite] SVG saved to ${filePath}`);
          } catch (error: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});
