import TabView from '@/components/tab-view.vue';
import { defineStore } from 'pinia';

// Property hooks
export { TabView };
export const usePropertyStore = defineStore('propertyStore', () => {
  document.title = window.argv[3].plugin.uuid + ' - Property Inspector';

  // Watch data
  const preventWatch = ref(false);
  const settings = ref(window.argv[4].payload.settings);
  watch(
    settings,
    () => {
      if (preventWatch.value) return;
      server.send(
        JSON.stringify({
          event: 'setSettings',
          context: window.argv[1],
          payload: settings.value
        })
      );
    },
    { deep: true }
  );

  // Connect to software
  const message = ref<StreamDock.Message>();
  const server = new WebSocket('ws://127.0.0.1:' + window.argv[0]);
  server.onopen = () => {
    console.log('[Property Store] WebSocket connected');
    server.send(JSON.stringify({ event: window.argv[2], uuid: window.argv[1] }));
  };
  server.onmessage = (e) => {
    console.log('[Property Store] Received message:', e.data);
    message.value = JSON.parse(e.data);
    console.log('[Property Store] Parsed message:', message.value);
  };
  server.onerror = (error) => {
    console.error('[Property Store] WebSocket error:', error);
  };
  server.onclose = () => {
    console.log('[Property Store] WebSocket closed');
  };

  // Notify plugin
  const sendToPlugin = (payload: any) => {
    console.log('[Property Store] sendToPlugin called with payload:', payload);
    const message = {
      event: 'sendToPlugin',
      action: window.argv[4].action,
      context: window.argv[1],
      payload
    };
    console.log('[Property Store] Sending message:', JSON.stringify(message));
    server.send(JSON.stringify(message));
    console.log('[Property Store] Message sent to server');
  };

  // Change state
  const setState = (state: number) => {
    server.send(
      JSON.stringify({
        event: 'setState',
        context: window.argv[4].context,
        payload: { state }
      })
    );
  };

  // Set title
  const setTitle = (title: string) => {
    server.send(
      JSON.stringify({
        event: 'setTitle',
        context: window.argv[4].context,
        payload: {
          title,
          target: 0
        }
      })
    );
  };

  const getGlobalSettings = () => {
    server.send(
      JSON.stringify({
        event: 'getGlobalSettings',
        context: window.argv[1]
      })
    );
  };

  // Set global settings
  const setGlobalSettings = (payload: any) => {
    console.log('[Property Store] setGlobalSettings called with payload:', payload);
    const message = {
      event: 'setGlobalSettings',
      context: window.argv[1],
      payload
    };
    console.log('[Property Store] Sending setGlobalSettings message:', JSON.stringify(message));
    server.send(JSON.stringify(message));
    console.log('[Property Store] setGlobalSettings message sent to server');
  };

  // Set image
  const setImage = (url: string) => {
    if (url.includes('data:')) {
      server.send(JSON.stringify({ event: 'setImage', context: window.argv[4].context, payload: { target: 0, image: url } }));
      return;
    }
    const image = new Image();
    image.src = url;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      server.send(JSON.stringify({ event: 'setImage', context: window.argv[4].context, payload: { target: 0, image: canvas.toDataURL('image/png') } }));
    };
  };

  // Open in default browser
  const openUrl = (url: string) => {
    server.send(
      JSON.stringify({
        event: 'openUrl',
        payload: { url }
      })
    );
  };

  return {
    message,
    preventWatch,
    settings,
    sendToPlugin,
    getGlobalSettings,
    setGlobalSettings,
    setState,
    setTitle,
    setImage,
    openUrl
  };
});

// !! Do not change this !!
export const useWatchEvent = (MessageEvents: StreamDock.ProperMessage) => {
  const property = usePropertyStore();
  const Events: StreamDock.ProperMessage = {
    didReceiveSettings(data) {
      property.preventWatch = true;
      property.settings = data.payload.settings;
      nextTick(() => {
        property.preventWatch = false;
      });
    }
  };
  watch(
    () => property.message,
    () => {
      if (!property.message) return;
      const data = JSON.parse(JSON.stringify(property.message));
      Events[property.message.event]?.(data);
      MessageEvents[property.message.event]?.(data);
    }
  );
};
