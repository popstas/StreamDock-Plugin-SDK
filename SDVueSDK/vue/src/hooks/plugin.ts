import { defineStore } from 'pinia';

// Plugin hooks
export const usePluginStore = defineStore('pluginStore', () => {
  const pluginUuid = window.argv?.[3]?.plugin?.uuid || 'pro.popstas.mqtt';
  document.title = pluginUuid + ' - Plugin';

  // Timer thread
  const Timer = new Worker('interval.js');
  const TimerSubscribe: { uuid: string; fn: () => void }[] = [];
  Timer.addEventListener('message', ({ data: { event, uuid } }: { data: { event: string; uuid: string } }) => {
    const subIndex = TimerSubscribe.findIndex((item) => item.uuid === uuid);
    subIndex !== -1 && event === 'setInterval' && TimerSubscribe[subIndex].fn();
  });

  // Create timer
  const Interval = (uuid: string, delay: number, fn: () => void) => {
    TimerSubscribe.findIndex((item) => item.uuid === uuid) === -1 && TimerSubscribe.push({ uuid, fn });
    Timer.postMessage({ event: 'setInterval', uuid, delay });
  };

  // Destroy timer
  const Unterval = (uuid: string) => {
    const subIndex = TimerSubscribe.findIndex((item) => item.uuid === uuid);
    subIndex !== -1 && TimerSubscribe.splice(subIndex, 1);
    Timer.postMessage({ event: 'clearInterval', uuid });
  };

  // Connect to software
  const message = ref<StreamDock.Message>();
  let server: WebSocket | null = null;

  // Queue for pending images to send when WebSocket opens
  const pendingImages: Array<{ context: string; image: string }> = [];

  const sendPendingImages = () => {
    if (pendingImages.length === 0) return;
    console.log('[Plugin Store] Sending', pendingImages.length, 'pending images');
    while (pendingImages.length > 0) {
      const item = pendingImages.shift();
      if (item && server && server.readyState === WebSocket.OPEN) {
        try {
          const message = {
            event: 'setImage',
            context: item.context,
            payload: {
              image: item.image,
              target: 0
            }
          };
          console.log('[Plugin Store] Sending pending image message:', JSON.stringify(message).substring(0, 200) + '...');
          server.send(JSON.stringify(message));
          console.log('[Plugin Store] Pending image sent for context:', item.context);
        } catch (error) {
          console.error('[Plugin Store] Error sending pending image:', error);
        }
      }
    }
  };

  // Only connect if we have valid argv (not in dev mode)
  if (window.argv && typeof window.argv[0] === 'string' && window.argv[1] && window.argv[2]) {
    try {
      server = new WebSocket('ws://127.0.0.1:' + window.argv[0]);
      server.onopen = () => {
        console.log('[Plugin Store] WebSocket connected');
        server!.send(JSON.stringify({ event: window.argv[2], uuid: window.argv[1] }));
        // Send any pending images immediately
        sendPendingImages();

        // Also send pending images every 5 seconds
        Interval('sendPendingImages', 5000, () => {
          sendPendingImages();
        });
      };
      server.onmessage = (e) => {
        console.log('[Plugin Store] ========== WebSocket message received ==========');
        console.log('[Plugin Store] Raw message:', e.data);
        try {
          const parsed = JSON.parse(e.data);
          console.log('[Plugin Store] Parsed message:', parsed);
          console.log('[Plugin Store] Message event:', parsed.event);
          console.log('[Plugin Store] Message action:', parsed.action);
          console.log('[Plugin Store] Message context:', parsed.context);
          message.value = parsed;
          console.log('[Plugin Store] Message stored in reactive ref');
        } catch (error) {
          console.error('[Plugin Store] Failed to parse message:', error);
        }
      };
      server.onerror = (error) => {
        console.error('[Plugin Store] WebSocket error:', error);
      };
      server.onclose = () => {
        console.log('[Plugin Store] WebSocket closed');
        // Stop the interval when WebSocket closes
        Unterval('sendPendingImages');
      };
    } catch (error) {
      console.warn('WebSocket connection failed (dev mode?):', error);
    }
  }

  // Global settings data
  const globalSettings = ref<any>();
  const devices = ref<Set<string>>(new Set());
  const userInfo = ref<any>({});
  // Set global settings data
  const setGlobalSettings = (payload: any) => {
    console.log('[Plugin Store] setGlobalSettings called with:', payload);
    if (server) {
      const message = JSON.stringify({ event: 'setGlobalSettings', context: window.argv[1], payload });
      console.log('[Plugin Store] Sending to server:', message);
      server.send(message);
    } else {
      console.warn('[Plugin Store] Server not available, setting local value only');
    }
    globalSettings.value = payload;
    console.log('[Plugin Store] globalSettings.value updated to:', globalSettings.value);
  };

  // Get global settings data
  const getGlobalSettings = () => {
    if (server) {
      server.send(JSON.stringify({ event: 'getGlobalSettings', context: window.argv[1] }));
    }
  };

  // Set background
  const setBackground = (img: string, device: string, clearIcon = true) => {
    if (!server) return;
    server.send(
      JSON.stringify({
        event: 'setBackground',
        device: device,
        payload: {
          image: img,
          clearIcon: clearIcon
        }
      })
    );
  };

  // Notify software that background stopped
  const stopBackground = (device: string) => {
    if (!server) return;
    server.send(
      JSON.stringify({
        event: 'stopBackground',
        device: device,
        payload: {
          clearIcon: true // If clearIcon was set to true when setting background, this parameter must be included and set to true (tell software to restore icon)
        }
      })
    );
  };

  // Get user info
  const getUserInfo = () => {
    if (!server) return;
    server.send(
      JSON.stringify({
        event: 'getUserInfo'
      })
    );
  };

  // Action data storage
  class Actions {
    settings: {};
    action: string;
    context: string;
    title: string;
    titleParameters = {} as titleParameters;
    constructor(action: string, context: string, settings: {}) {
      this.action = action;
      this.context = context;
      this.settings = settings;
    }

    // Add action
    static list: Actions[] = [];
    static addAction = (action: string, context: string, settings: {}) => {
      const instance = new Actions(action, context, settings);
      this.list.push(instance);
      return instance;
    };

    // Delete action
    static delAction = (context: string) => {
      const i = this.list.findIndex((item) => item.context === context);
      i !== -1 && this.list.splice(i, 1);
    };

    // Get action data
    static getAction = (context: string) => {
      return Actions.list.find((item) => item.context === context);
    };

    // Get all action data
    static getActions = (action: string) => {
      return this.list.filter((item) => item.action === action);
    };

    // Notify property inspector
    sendToPropertyInspector = (payload: any) => {
      if (!server) return;
      server.send(JSON.stringify({ event: 'sendToPropertyInspector', action: this.action, context: this.context, payload }));
    };

    // Toggle state
    setState = (state: number) => {
      if (!server) return;
      server.send(JSON.stringify({ event: 'setState', context: this.context, payload: { state } }));
    };

    // Set title
    setTitle = (title: string) => {
      if (!server) return;
      server.send(JSON.stringify({ event: 'setTitle', context: this.context, payload: { title, target: 0 } }));
    };

    // Set image
    setImage = (url: string) => {
      if (!server) {
        console.warn('[Plugin Store] setImage: No server available, queueing image');
        // Queue image for when server is available
        pendingImages.push({ context: this.context, image: url });
        return;
      }

      // Check WebSocket state
      if (server.readyState !== WebSocket.OPEN) {
        console.warn('[Plugin Store] setImage: WebSocket not ready. State:', server.readyState, '(OPEN=1, CONNECTING=0, CLOSING=2, CLOSED=3)');
        console.warn('[Plugin Store] setImage: Context:', this.context, 'URL length:', url.length);

        // Queue the image for later
        console.log('[Plugin Store] setImage: Queueing image for later');
        pendingImages.push({ context: this.context, image: url });

        // If WebSocket is connecting, it will send when open
        if (server.readyState === WebSocket.CONNECTING) {
          console.log('[Plugin Store] setImage: WebSocket connecting, will send when open');
        }
        return;
      }

      console.log('[Plugin Store] setImage called with:', url.substring(0, 100) + '...');
      if (url.includes('data:')) {
        try {
          const message = {
            event: 'setImage',
            context: this.context,
            payload: {
              image: url,
              target: 0
            }
          };
          console.log('[Plugin Store] Sending setImage message:', JSON.stringify(message).substring(0, 200) + '...');
          server.send(JSON.stringify(message));
          console.log('[Plugin Store] setImage: Image sent successfully to context:', this.context);
        } catch (error) {
          console.error('[Plugin Store] setImage: Error sending image:', error);
          // Queue for retry
          pendingImages.push({ context: this.context, image: url });
        }
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
        if (server) {
          const message = {
            event: 'setImage',
            context: this.context,
            payload: {
              image: canvas.toDataURL('image/png'),
              target: 0
            }
          };
          server.send(JSON.stringify(message));
        }
      };
    };

    // Set persistent data
    setSettings = (payload: any) => {
      this.settings = payload;
      if (!server) return;
      server.send(JSON.stringify({ event: 'setSettings', context: this.context, payload }));
    };

    // Open in default browser
    openUrl = (url: string) => {
      if (!server) return;
      server.send(JSON.stringify({ event: 'openUrl', payload: { url } }));
    };

    // Register screen saver event (tell software exclusive screen saver needed, can maintain screen saver entry time (after unLockScreen wake can still trigger lock screen based on set lock time), when unRegistrationScreenSaverEvent received means screen saver exclusive given to other plugin, this plugin should stop screen saver logic (clear screen saver entry timer))
    registrationScreenSaverEvent = (device: string) => {
      if (!server) return;
      server.send(
        JSON.stringify({
          event: 'registrationScreenSaverEvent',
          device: device,
          context: this.context
        })
      );
    };
  }

  class EventEmitter {
    events: { [key: string]: any[] };
    constructor() {
      this.events = {};
    }

    // Subscribe to event
    subscribe(event: string, listener: Function) {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(listener);
    }

    // Unsubscribe
    unsubscribe(event: string) {
      if (!this.events[event]) return;

      this.events[event] = null;
    }

    // Publish event
    emit(event: string, data: any) {
      if (!this.events[event]) return;
      this.events[event].forEach((listener) => listener(data));
    }
  }

  // Non-reactive event bus, for global use only
  const eventEmitter = new EventEmitter();

  // Send HTTP request (no auth)
  const sendHttpRequest = async (url: string, auth: { username: string; password: string; path?: string }): Promise<{ success: boolean; error?: string; response?: any }> => {
    try {
      // Prepare request body - PHP endpoint requires both path and value
      const body: any = {};
      if (auth.path !== undefined) {
        body.path = auth.path;
        body.value = auth.path; // PHP endpoint requires value parameter
      }

      console.log('[Plugin Store] Sending HTTP request:', {
        url,
        method: 'POST',
        body: JSON.stringify(body)
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      console.log('[Plugin Store] HTTP response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('[Plugin Store] HTTP error response:', errorText);
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText : ''}`
        };
      }

      const data = await response.json().catch(() => ({}));
      console.log('[Plugin Store] HTTP response data:', data);
      return {
        success: true,
        response: data
      };
    } catch (error: any) {
      console.error('[Plugin Store] HTTP request error:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  };

  return {
    message,
    globalSettings,
    eventEmitter, // For logic use only, not for component reactivity
    devices,
    userInfo,
    Interval,
    Unterval,
    setGlobalSettings,
    getGlobalSettings,
    setBackground,
    stopBackground,
    getUserInfo,
    sendHttpRequest,
    sendPendingImages, // Expose function to send pending images
    ActionArr: Actions.list,
    getAction: Actions.getAction,
    addAction: Actions.addAction,
    delAction: Actions.delAction,
    getActions: Actions.getActions
  };
});

// !! Do not change this !!
type MessageTypes = { plugin: StreamDock.PluginMessage; action: StreamDock.ActionMessage };
type payload = {
  settings: any;
};
export const useWatchEvent = <T extends keyof MessageTypes>(type: T, MessageEvents: MessageTypes[T]) => {
  const plugin = usePluginStore();

  if (type === 'plugin') {
    return watch(
      () => plugin.message,
      () => {
        if (!plugin.message) return;
        if (plugin.message.action) return;

        // Log all plugin events
        console.log('[Plugin Event]', plugin.message.event, plugin.message);

        MessageEvents[plugin.message.event]?.(JSON.parse(JSON.stringify(plugin.message)));
        if (plugin.message.event === 'didReceiveGlobalSettings') {
          const settings = (plugin.message.payload as payload).settings;
          plugin.globalSettings = settings;
          console.log('[Plugin] Global settings updated from didReceiveGlobalSettings:', settings);
          console.log('[Plugin] Current globalSettings.value:', plugin.globalSettings);
        } else if (plugin.message.event === 'deviceDidConnect') {
          console.log('[Plugin] Device connected:', plugin.message);
          const device = (plugin.message as any).device;
          if (device) {
            plugin.devices.add(device);
          }
        } else if (plugin.message.event === 'deviceDidDisconnect') {
          console.log('[Plugin] Device disconnected:', plugin.message);
          const device = (plugin.message as any).device;
          if (device) {
            plugin.devices.delete(device);
          }
        } else if (plugin.message.event === 'sendUserInfo') {
          plugin.userInfo = plugin.message.payload;
        }
      },
      { immediate: true }
    );
  }
  const Events: StreamDock.ActionMessage = {
    willAppear({ action, context, payload }) {
      console.log('[Action Event] willAppear:', action, context, payload);
      !plugin.getAction(context) && plugin.addAction(action, context, payload.settings);
    },
    willDisappear({ context }) {
      console.log('[Action Event] willDisappear:', context);
      plugin.delAction(context);
    },
    didReceiveSettings({ context, payload }) {
      console.log('[Action Event] didReceiveSettings:', context, payload);
      const action = plugin.getAction(context);
      if (action) {
        action.settings = payload.settings;
      }
    },
    titleParametersDidChange({ context, payload }) {
      console.log('[Action Event] titleParametersDidChange:', context, payload);
      const action = plugin.getAction(context);
      if (action) {
        action.title = payload.title;
        action.titleParameters = payload.titleParameters;
      }
    }
  };

  const expectedActionID = (MessageEvents as any)['ActionID'];
  console.log('[useWatchEvent] Setting up action event watcher');
  console.log('[useWatchEvent] Expected ActionID:', expectedActionID);
  console.log('[useWatchEvent] MessageEvents:', MessageEvents);
  console.log('[useWatchEvent] MessageEvents keys:', Object.keys(MessageEvents));

  return watch(
    () => plugin.message,
    (newMessage, oldMessage) => {
      console.log('[useWatchEvent] ========== Message watcher triggered ==========');
      console.log('[useWatchEvent] Old message:', oldMessage);
      console.log('[useWatchEvent] New message:', newMessage);

      if (!plugin.message) {
        console.log('[useWatchEvent] No message in plugin.message');
        return;
      }

      const messageAction = plugin.message.action;
      const messageEvent = plugin.message.event;

      console.log('[useWatchEvent] Message event:', messageEvent);
      console.log('[useWatchEvent] Message action:', messageAction);
      console.log('[useWatchEvent] Expected ActionID:', expectedActionID);
      console.log('[useWatchEvent] Action match:', messageAction === expectedActionID);
      console.log('[useWatchEvent] Message type (has action?):', !!messageAction);
      console.log('[useWatchEvent] Full message:', JSON.stringify(plugin.message, null, 2));

      // Check if this is an action event (has action field)
      if (!messageAction) {
        console.log('[useWatchEvent] Not an action event (no action field), skipping');
        return;
      }

      if (!expectedActionID) {
        console.warn('[useWatchEvent] No ActionID specified in MessageEvents');
        return;
      }

      if (messageAction !== expectedActionID) {
        console.log('[useWatchEvent] ActionID mismatch, ignoring message');
        return;
      }

      // Log all action events
      console.log('[Action Event] MATCHED!', plugin.message.event, plugin.message);

      const data = JSON.parse(JSON.stringify(plugin.message));

      // First call base Events handlers (willAppear, willDisappear, etc.)
      const baseHandler = Events[plugin.message.event as keyof typeof Events];
      if (baseHandler && typeof baseHandler === 'function') {
        console.log('[useWatchEvent] Calling base event handler for:', plugin.message.event);
        try {
          (baseHandler as any).call(Events, data);
        } catch (error) {
          console.error('[useWatchEvent] Error calling base handler:', error);
        }
      }

      // Then call custom MessageEvents handlers (keyUp, touchTap, etc.)
      // Skip ActionID as it's not a handler function
      if (plugin.message.event === 'ActionID') {
        console.log('[useWatchEvent] Skipping ActionID (not an event)');
        return;
      }

      const customHandler = MessageEvents[plugin.message.event as keyof typeof MessageEvents];
      if (customHandler && typeof customHandler === 'function') {
        console.log('[useWatchEvent] Calling custom event handler for:', plugin.message.event);
        customHandler(data);
      } else {
        console.log('[useWatchEvent] No custom handler found for event:', plugin.message.event);
        console.log(
          '[useWatchEvent] Available custom handlers:',
          Object.keys(MessageEvents).filter((k) => k !== 'ActionID')
        );
      }
    },
    { immediate: true }
  );
};
