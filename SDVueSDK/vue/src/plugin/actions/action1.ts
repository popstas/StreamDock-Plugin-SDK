import { usePluginStore, useWatchEvent } from '@/hooks/plugin';

export default function (name: string) {
  const ActionID = `${window.argv[3].plugin.uuid}.${name}`;

  // Event listener
  const plugin = usePluginStore();

  plugin.eventEmitter.subscribe("stopBackground", (data) => {
    // Stop background and release resources
    plugin.stopBackground(data.device)
  })

  // Listen to events
  watch(() => Array.from(plugin.devices), (newDevices, oldDevices) => {
    // console.log('devices:', newDevices, oldDevices);
    // Compare device list changes
    const delDevices = oldDevices.filter(item => !newDevices.includes(item));
    delDevices.forEach((device) => {

    })
  }, { deep: true })

  useWatchEvent('action', {
    ActionID,
    willAppear({ context }) {
      console.log('Created:', context);
    },
    keyUp({ context }) {
    }
  });
}
