import { createPinia } from 'pinia';
import Plugin from '@/plugin/index.vue';
import Property from '@/pages/index.vue';
import './main.css';

// Software interface
window.connectSDSocket = function () {
  window.argv = [arguments[0], arguments[1], arguments[2], JSON.parse(arguments[3]), arguments[4] && JSON.parse(arguments[4])];
  const app = arguments[4] ? createApp(Property) : createApp(Plugin);
  app.use(createPinia()).mount('#app');
};

// Compatible with Elgato interface
window.connectSocket = window.connectSDSocket;
window.connectElgatoStreamDeckSocket = window.connectSDSocket;

// Development mode: auto-mount if window.argv is not set (running in browser)
if (typeof window.argv === 'undefined') {
  console.log('[Main] ========== Development mode detected ==========');
  console.log('[Main] Auto-mounting Plugin component...');

  // Mock argv for development
  window.argv = [
    '12345', // port
    'mock-context', // context
    'registerPlugin', // event
    {
      application: {
        font: 'Arial',
        language: 'en',
        platform: 'windows',
        platformVersion: '10.0',
        version: '1.0.0'
      },
      plugin: {
        uuid: 'pro.popstas.mqtt',
        version: '1.0.0'
      }
    },
    null // no property inspector in dev mode
  ] as StreamDock.Argv;

  console.log('[Main] window.argv set:', window.argv);
  console.log('[Main] Creating Vue app...');

  const app = createApp(Plugin);
  app.use(createPinia());

  console.log('[Main] Mounting app to #app...');
  app.mount('#app');

  console.log('[Main] App mounted successfully');

  // Also log to window for debugging
  (window as any).__DEBUG__ = {
    argv: window.argv,
    timestamp: new Date().toISOString()
  };
  console.log('[Main] Debug info available at window.__DEBUG__');
}
