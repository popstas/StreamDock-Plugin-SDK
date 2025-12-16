import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig, Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Plugin for saving SVG files
function saveSvgPlugin(): Plugin {
  return {
    name: 'save-svg',
    configureServer(server) {
      // Middleware for saving SVG files
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
              res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ success: true, path: filePath }));
              console.log(`[Vite] SVG saved to ${filePath}`);
            } catch (error: any) {
              res.writeHead(500, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ success: false, error: error.message }));
              console.error(`[Vite] Error saving SVG:`, error);
            }
          });
        } else if (req.method === 'OPTIONS') {
          // Handle CORS preflight
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          });
          res.end();
        } else {
          next();
        }
      });
      
      console.log('[Vite] /api/save-svg endpoint registered');
    }
  };
}

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue'],
      dts: './src/types/auto-imports.d.ts'
    }),
    viteSingleFile(),
    saveSvgPlugin()
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
  }
});
