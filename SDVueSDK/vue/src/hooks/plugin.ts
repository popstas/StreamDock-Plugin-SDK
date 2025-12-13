import { defineStore } from 'pinia';

// Plugin hooks
export const usePluginStore = defineStore('pluginStore', () => {
  document.title = window.argv[3].plugin.uuid + ' - Plugin';

  // Timer thread
  const Timer = new Worker('interval.js');
  const TimerSubscribe: { uuid: string; fn: () => void }[] = [];
  Timer.addEventListener('message', ({ data: { event, uuid } }: { data: { event: string; uuid: string } }) => {
    const subIndex = TimerSubscribe.findIndex((item) => item.uuid === uuid);
    subIndex !== -1 && event === 'setInterval' &&     TimerSubscribe[subIndex].fn();
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
  const server = new WebSocket('ws://127.0.0.1:' + window.argv[0]);
  server.onopen = () => server.send(JSON.stringify({ event: window.argv[2], uuid: window.argv[1] }));
  server.onmessage = (e) => {
    message.value = JSON.parse(e.data)
    // console.log(e.data)
  };

  // Global settings data
  const globalSettings = ref<any>();
  const devices = ref<Set<string>>(new Set());
  const userInfo = ref<any>({});
  // Set global settings data
  const setGlobalSettings = (payload: any) => {
    server.send(JSON.stringify({ event: 'setGlobalSettings', context: window.argv[1], payload }));
    globalSettings.value = payload;
  };

  // Get global settings data
  const getGlobalSettings = () => {
    server.send(JSON.stringify({ event: 'getGlobalSettings', context: window.argv[1] }));
  }

  // Set background
  const setBackground = (img: string, device: string, clearIcon = true) => {
    server.send(JSON.stringify({
      "event": "setBackground",
      "device": device,
      "payload": {
        "image": img,
        "clearIcon": clearIcon
      }
    }));
  };

  // Notify software that background stopped
  const stopBackground = (device: string) => {
    server.send(JSON.stringify({
      "event": "stopBackground",
      "device": device,
      "payload": {
        "clearIcon": true// If clearIcon was set to true when setting background, this parameter must be included and set to true (tell software to restore icon)
      }
    }));
  };

  // Get user info
  const getUserInfo = () => {
    server.send(JSON.stringify({
      "event": "getUserInfo"
    }));
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
      server.send(JSON.stringify({ event: 'sendToPropertyInspector', action: this.action, context: this.context, payload }));
    };

    // Toggle state
    setState = (state: number) => {
      server.send(JSON.stringify({ event: 'setState', context: this.context, payload: { state } }));
    };

    // Set title
    setTitle = (title: string) => {
      server.send(JSON.stringify({ event: 'setTitle', context: this.context, payload: { title, target: 0 } }));
    };

    // Set image
    setImage = (url: string) => {
      if (url.includes('data:')) {
        server.send(JSON.stringify({ event: 'setImage', context: this.context, payload: { target: 0, image: url } }));
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
        server.send(JSON.stringify({ event: 'setImage', context: this.context, payload: { target: 0, image: canvas.toDataURL('image/png') } }));
      };
    };

    // Set persistent data
    setSettings = (payload: any) => {
      this.settings = payload;
      server.send(JSON.stringify({ event: 'setSettings', context: this.context, payload }));
    };

    // Open in default browser
    openUrl = (url: string) => {
      server.send(JSON.stringify({ event: 'openUrl', payload: { url } }));
    };

    // Register screen saver event (tell software exclusive screen saver needed, can maintain screen saver entry time (after unLockScreen wake can still trigger lock screen based on set lock time), when unRegistrationScreenSaverEvent received means screen saver exclusive given to other plugin, this plugin should stop screen saver logic (clear screen saver entry timer))
    registrationScreenSaverEvent = (device: string) => {
      server.send(
        JSON.stringify({
          event: 'registrationScreenSaverEvent',
          device: device,
          context: this.context,
        }),
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
      this.events[event].forEach(listener => listener(data));
    }
  }

  // Non-reactive event bus, for global use only
  const eventEmitter = new EventEmitter();

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
}
export const useWatchEvent = <T extends keyof MessageTypes>(type: T, MessageEvents: MessageTypes[T]) => {
  const plugin = usePluginStore();


  if (type === 'plugin') {
    return watch(
      () => plugin.message,
      () => {
        if (!plugin.message) return;
        if (plugin.message.action) return;
        MessageEvents[plugin.message.event]?.(JSON.parse(JSON.stringify(plugin.message)));
        if (plugin.message.event === 'didReceiveGlobalSettings') {
          plugin.globalSettings = (plugin.message.payload as payload).settings;
        } else if (plugin.message.event === 'deviceDidConnect') {
          // console.log('Device connected:', plugin.message);
          plugin.devices.add(plugin.message.device);
        } else if (plugin.message.event === 'deviceDidDisconnect') {
          // console.log('deviceDidDisconnect:', plugin.message);
          plugin.devices.delete(plugin.message.device);
        } else if (plugin.message.event === 'sendUserInfo') {
          plugin.userInfo = plugin.message.payload;
        }
      }
    );
  }
  const Events: StreamDock.ActionMessage = {
    willAppear({ action, context, payload }) {
      !plugin.getAction(context) && plugin.addAction(action, context, payload.settings);
    },
    willDisappear({ context }) {
      plugin.delAction(context);
    },
    didReceiveSettings({ context, payload }) {
      const action = plugin.getAction(context);
      action.settings = payload.settings;
    },
    titleParametersDidChange({ context, payload }) {
      const action = plugin.getAction(context);
      action.title = payload.title;
      action.titleParameters = payload.titleParameters;
    }
  };
  return watch(
    () => plugin.message,
    () => {
      if (!plugin.message) return;
      if (plugin.message.action !== MessageEvents['ActionID']) return;
      const data = JSON.parse(JSON.stringify(plugin.message));
      Events[plugin.message.event]?.(data);
      MessageEvents[plugin.message.event]?.(data);
    }
  );
};