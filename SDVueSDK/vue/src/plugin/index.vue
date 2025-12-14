<script setup lang="ts">
  import { useWatchEvent, usePluginStore } from '@/hooks/plugin';
  import { ref, onMounted } from 'vue';

  // Log immediately
  console.log('[Plugin Index] ========== Component script setup ==========');
  console.log('[Plugin Index] Timestamp:', new Date().toISOString());

  console.log('[Plugin Index] ========== Loading action handlers ==========');
  const actionFiles = import.meta.glob('@/plugin/actions/*.ts', { eager: true, import: 'default' });
  console.log('[Plugin Index] Found action files:', Object.keys(actionFiles));
  console.log('[Plugin Index] Number of action files:', Object.keys(actionFiles).length);

  if (Object.keys(actionFiles).length === 0) {
    console.error('[Plugin Index] ERROR: No action files found!');
    console.error('[Plugin Index] Check if files exist in src/plugin/actions/');
  }

  Object.entries(actionFiles).forEach(([path, fn]) => {
    const actionName = path.replace('/src/plugin/actions/', '').replace('.ts', '');
    console.log('[Plugin Index] ========== Processing action:', actionName, '==========');
    console.log('[Plugin Index] Full path:', path);
    console.log('[Plugin Index] Action function:', fn);
    console.log('[Plugin Index] Action function type:', typeof fn);
    console.log('[Plugin Index] Is function?', typeof fn === 'function');
    console.log('[Plugin Index] Function name:', fn?.name);

    if (!fn) {
      console.error('[Plugin Index] ERROR: Action function is null/undefined for:', actionName);
      return;
    }

    if (typeof fn !== 'function') {
      console.error('[Plugin Index] ERROR: Action is not a function for:', actionName, 'Type:', typeof fn);
      return;
    }

    try {
      console.log('[Plugin Index] Calling action handler function with name:', actionName);
      (fn as Function)(actionName);
      console.log('[Plugin Index] ✓ Action handler registered successfully:', actionName);
    } catch (error) {
      console.error('[Plugin Index] ✗ Error registering action:', actionName);
      console.error('[Plugin Index] Error details:', error);
      console.error('[Plugin Index] Error stack:', error instanceof Error ? error.stack : 'No stack');
    }
  });
  console.log('[Plugin Index] ========== All action handlers loaded ==========');

  // Event listener
  const plugin = usePluginStore();
  useWatchEvent('plugin', {
    deviceDidConnect() {},
    deviceDidDisconnect() {},
    didReceiveGlobalSettings(data) {
      // Global settings are automatically updated in the store
      console.log('[Plugin] Global settings received:', data);
      console.log('[Plugin] Current globalSettings value:', plugin.globalSettings);
    },
    systemDidWakeUp(data) {},
    applicationDidTerminate(data) {
      console.log('[Plugin] Application terminated:', data);
    },
    applicationDidLaunch(data) {
      console.log('[Plugin] Application launched:', data);
    },
    keyUpCord(data) {
      plugin.eventEmitter.emit('keyUpCord', data);
    },
    keyDownCord(data) {
      plugin.eventEmitter.emit('keyDownCord', data);
    },
    stopBackground(data) {
      plugin.eventEmitter.emit('stopBackground', data);
    },
    lockScreen(data) {},
    unLockScreen(data) {}
  });

  // Load markdown content
  const buttonContent = ref<string>('');
  const lines = ref<string[]>([]);
  const loadingButtons = ref<Set<number>>(new Set());
  const buttonMessages = ref<Map<number, { type: 'success' | 'error'; text: string }>>(new Map());

  // Debug info for console visibility
  const debugInfo = ref<string[]>([]);
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    debugInfo.value.push(`[${timestamp}] ${message}`);
    console.log(message);
    // Keep only last 50 logs
    if (debugInfo.value.length > 50) {
      debugInfo.value.shift();
    }
  };

  // Copy logs to clipboard
  const copyLogsToClipboard = async () => {
    try {
      const logsText = debugInfo.value.join('\n');
      if (!logsText.trim()) {
        addDebugLog('[Plugin Index] No logs to copy');
        return;
      }

      await navigator.clipboard.writeText(logsText);
      addDebugLog('[Plugin Index] ✓ Logs copied to clipboard!');

      // Show temporary success message
      const successMsg = 'Logs copied to clipboard!';
      const tempIndex = -1; // Use -1 as special index for copy notification
      buttonMessages.value.set(tempIndex, { type: 'success', text: successMsg });
      setTimeout(() => buttonMessages.value.delete(tempIndex), 2000);
    } catch (error) {
      const errorMsg = `Failed to copy logs: ${error}`;
      addDebugLog(`[Plugin Index] ERROR: ${errorMsg}`);
      console.error(errorMsg, error);

      // Fallback: try using document.execCommand
      try {
        const textArea = document.createElement('textarea');
        textArea.value = debugInfo.value.join('\n');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        addDebugLog('[Plugin Index] ✓ Logs copied to clipboard (fallback method)!');
      } catch (fallbackError) {
        addDebugLog(`[Plugin Index] ERROR: Both copy methods failed: ${fallbackError}`);
      }
    }
  };

  // Log initialization
  addDebugLog('[Plugin Index] Component initialized');

  // Check if we're in dev mode and simulate willAppear event
  const isDevMode = typeof window !== 'undefined' && (!window.argv?.[0] || window.argv[0] === '12345');
  if (isDevMode) {
    addDebugLog('[Plugin Index] Dev mode detected - will simulate willAppear event');

    // Wait for action handlers to register and plugin store to initialize
    setTimeout(() => {
      addDebugLog('[Plugin Index] Simulating willAppear event for dev mode...');

      // Simulate willAppear event by directly setting message
      const mockWillAppearMessage = {
        event: 'willAppear',
        action: 'pro.popstas.mqtt.mqttButton',
        context: 'dev-test-context-123',
        device: 'dev-device',
        payload: {
          settings: {},
          coordinates: {
            column: 0,
            row: 0
          },
          state: 0,
          isInMultiAction: false
        }
      };

      addDebugLog('[Plugin Index] Creating mock willAppear message:', JSON.stringify(mockWillAppearMessage, null, 2));

      // Set the message directly to trigger the watcher
      plugin.message = mockWillAppearMessage as any;
      addDebugLog('[Plugin Index] Mock willAppear message set, watcher should trigger');

      // Also manually add action to the list
      const testContext = 'dev-test-context-123';
      plugin.addAction('pro.popstas.mqtt.mqttButton', testContext, {});
      addDebugLog(`[Plugin Index] Action added manually with context: ${testContext}`);

      // Expose function to simulate keyUp event for testing
      (window as any).__simulateKeyUp = (buttonIndex: number = 1) => {
        addDebugLog(`[Plugin Index] Simulating keyUp event for button index: ${buttonIndex}`);
        const mockKeyUpMessage = {
          event: 'keyUp',
          action: 'pro.popstas.mqtt.mqttButton',
          context: testContext,
          device: 'dev-device',
          payload: {
            settings: {},
            coordinates: {
              column: (buttonIndex - 1) % 5,
              row: Math.floor((buttonIndex - 1) / 5)
            },
            state: 0,
            userDesiredState: 0,
            isInMultiAction: false
          }
        };
        plugin.message = mockKeyUpMessage as any;
        addDebugLog(`[Plugin Index] Mock keyUp message sent`);
      };
      addDebugLog('[Plugin Index] Test function available: window.__simulateKeyUp(1) to simulate button press');
    }, 1500);
  }

  // Expose test function for simulating button press in dev mode
  const testButtonPress = (buttonIndex: number = 1) => {
    addDebugLog(`[Plugin Index] TEST: Simulating button press for index ${buttonIndex}`);

    // Get the first action context (for testing)
    const actions = plugin.ActionArr;
    if (actions.length === 0) {
      addDebugLog('[Plugin Index] ERROR: No actions found. Cannot simulate button press.');
      return;
    }

    const testContext = actions[0].context || 'test-context';
    addDebugLog(`[Plugin Index] Using test context: ${testContext}`);

    // Call handleButtonClick directly
    handleButtonClick(buttonIndex - 1); // Convert to 0-based index
  };

  // Expose to window for console testing
  if (typeof window !== 'undefined') {
    (window as any).__testButtonPress = testButtonPress;
    addDebugLog('[Plugin Index] Test function available: window.__testButtonPress(1)');
  }

  // Load global settings on mount
  onMounted(async () => {
    addDebugLog('[Plugin Index] Component mounted');

    // Load global settings to get auth config
    addDebugLog('[Plugin Index] Loading global settings...');
    plugin.getGlobalSettings();

    try {
      addDebugLog('[Plugin Index] Fetching text.md...');
      const response = await fetch('/text.md');
      const text = await response.text();
      buttonContent.value = text;
      addDebugLog(`[Plugin Index] text.md loaded (${text.length} chars)`);

      // Parse lines from the markdown
      const contentLines = text.split('\n').filter((line) => line.trim() && !line.startsWith('button content:'));
      lines.value = contentLines;
      addDebugLog(`[Plugin Index] Parsed ${contentLines.length} lines from text.md`);
    } catch (error) {
      const errorMsg = `Failed to load text.md: ${error}`;
      addDebugLog(`[Plugin Index] ERROR: ${errorMsg}`);
      console.error(errorMsg, error);
      buttonContent.value = 'Failed to load content';
    }
  });

  // Handle button click (for dev mode testing)
  const handleButtonClick = async (index: number) => {
    addDebugLog(`[Plugin Index] Button clicked: ${index}`);

    // Get auth credentials from globalSettings
    const authConfig = plugin.globalSettings?.httpAuth;

    if (!authConfig || !authConfig.username || !authConfig.password) {
      const errorMsg = 'Auth not configured';
      addDebugLog(`[Plugin Index] ERROR: ${errorMsg}`);
      buttonMessages.value.set(index, { type: 'error', text: errorMsg });
      setTimeout(() => buttonMessages.value.delete(index), 3000);
      return;
    }

    loadingButtons.value.add(index);
    buttonMessages.value.delete(index);

    // Use the same URL logic as in mqttButton.ts
    const defaultUrl = 'https://test.home.popstas.ru/node-red-request.php';
    const path = `actions/mirabox/button-${index + 1}`;

    addDebugLog(`[Plugin Index] Sending HTTP request to: ${defaultUrl}`);
    addDebugLog(`[Plugin Index] Path: ${path}`);

    const result = await plugin.sendHttpRequest(defaultUrl, {
      username: authConfig.username,
      password: authConfig.password,
      path: path
    });

    loadingButtons.value.delete(index);

    if (result.success) {
      addDebugLog(`[Plugin Index] HTTP request successful`);
      buttonMessages.value.set(index, { type: 'success', text: 'Success!' });
    } else {
      const errorMsg = result.error || 'Request failed';
      addDebugLog(`[Plugin Index] HTTP request failed: ${errorMsg}`);
      buttonMessages.value.set(index, { type: 'error', text: errorMsg });
    }

    // Clear message after 3 seconds
    setTimeout(() => buttonMessages.value.delete(index), 3000);
  };
</script>

<template>
  <div style="padding: 20px; color: #e6e6e6; background-color: #2d2d2d; min-height: 100vh">
    <h2 style="margin-bottom: 20px">Button Content from text.md</h2>

    <!-- Debug Console -->
    <div style="background-color: #1e1e1e; padding: 15px; border-radius: 4px; margin-bottom: 20px; border: 1px solid #7a7a7a">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px">
        <h3 style="margin: 0; color: #4a9eff">Debug Console ({{ debugInfo.length }} logs)</h3>
        <button
          @click="copyLogsToClipboard"
          style="padding: 6px 12px; background-color: #4a9eff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold"
          :style="{ opacity: debugInfo.length === 0 ? 0.5 : 1, cursor: debugInfo.length === 0 ? 'not-allowed' : 'pointer' }"
          :disabled="debugInfo.length === 0"
        >
          📋 Copy Logs
        </button>
      </div>
      <div style="max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 11px; line-height: 1.4">
        <div v-for="(log, index) in debugInfo" :key="index" style="padding: 2px 0; color: #a0a0a0">
          {{ log }}
        </div>
        <div v-if="debugInfo.length === 0" style="color: #666">No logs yet...</div>
      </div>
    </div>

    <!-- Copy notification -->
    <div
      v-if="buttonMessages.has(-1)"
      :style="{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '10px 15px',
        borderRadius: '4px',
        fontSize: '14px',
        backgroundColor: buttonMessages.get(-1)?.type === 'success' ? '#2d5a2d' : '#5a2d2d',
        color: '#e6e6e6',
        zIndex: 9999,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }"
    >
      {{ buttonMessages.get(-1)?.text }}
    </div>

    <div style="background-color: #1e1e1e; padding: 15px; border-radius: 4px; margin-bottom: 20px">
      <pre style="white-space: pre-wrap; font-family: monospace">{{ buttonContent }}</pre>
    </div>
    <div style="display: flex; flex-direction: column; gap: 10px">
      <div v-for="(line, index) in lines" :key="index" style="background-color: #1e1e1e; padding: 10px; border-radius: 4px; border: 1px solid #7a7a7a">
        <button
          @click="handleButtonClick(index)"
          :disabled="loadingButtons.has(index)"
          style="width: 100%; padding: 10px; background-color: #3a3a3a; color: #e6e6e6; border: 1px solid #7a7a7a; border-radius: 4px; cursor: pointer; opacity: loadingButtons.has(index) ? 0.6 : 1;"
        >
          <span v-if="loadingButtons.has(index)">Loading...</span>
          <span v-else>{{ line }}</span>
        </button>
        <div
          v-if="buttonMessages.has(index)"
          :style="{
            marginTop: '5px',
            padding: '5px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: buttonMessages.get(index)?.type === 'success' ? '#2d5a2d' : '#5a2d2d',
            color: '#e6e6e6'
          }"
        >
          {{ buttonMessages.get(index)?.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
