import { usePluginStore, useWatchEvent } from '@/hooks/plugin';
import { ref, watch } from 'vue';

// Log immediately when module loads
console.log('[MQTTButton] ========== MODULE LOADED ==========');
console.log('[MQTTButton] Module loaded at', new Date().toISOString());
console.log('[MQTTButton] Module file: mqttButton.ts');

export default function (name: string) {
  console.log('[MQTTButton] ========== EXPORT FUNCTION CALLED ==========');
  console.log('[MQTTButton] Function called with name:', name);
  console.log('[MQTTButton] Timestamp:', new Date().toISOString());

  // Use setTimeout to ensure console is ready
  setTimeout(() => {
    console.log('[MQTTButton] ========== Initializing action handler (setTimeout) ==========');
    console.log('[MQTTButton] Timestamp:', new Date().toISOString());
  }, 0);

  const pluginUuid = window.argv?.[3]?.plugin?.uuid || 'pro.popstas.mqtt';
  const ActionID = `${pluginUuid}.${name}`;

  // Log synchronously as well
  console.log('[MQTTButton] ========== Initializing action handler ==========');
  console.log('[MQTTButton] Plugin UUID:', pluginUuid);
  console.log('[MQTTButton] Action name:', name);
  console.log('[MQTTButton] ActionID:', ActionID);
  console.log('[MQTTButton] window.argv:', window.argv);
  console.log('[MQTTButton] window.argv[3]:', window.argv?.[3]);
  console.log('[MQTTButton] window.argv[3]?.plugin:', window.argv?.[3]?.plugin);

  // Event listener
  const plugin = usePluginStore();

  plugin.eventEmitter.subscribe('stopBackground', (data) => {
    // Stop background and release resources
    plugin.stopBackground(data.device);
  });

  // Listen to events
  watch(
    () => Array.from(plugin.devices),
    (newDevices, oldDevices) => {
      console.log('[MQTTButton] Devices changed:', newDevices, oldDevices);
      // Compare device list changes
      const delDevices = oldDevices.filter((item) => !newDevices.includes(item));
      delDevices.forEach((device) => {});
    },
    { deep: true }
  );

  // Store previous content to detect changes
  const textMdContent = ref<string>('');

  // Escape XML special characters
  const escapeXml = (s: string): string => {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  // Generate SVG with multi-line text from text.md
  const makeKeySvg = (lines: string[]): string => {
    const W = 144,
      H = 144; // Standard button size
    const fontSize = 18;
    const lineHeight = 22;

    // Center the text block vertically
    const totalH = (lines.length - 1) * lineHeight;
    const startY = H / 2 - totalH / 2 + fontSize / 2;

    const tspans = lines.map((t, i) => `<tspan x="${W / 2}" y="${startY + i * lineHeight}" text-anchor="middle">${escapeXml(t)}</tspan>`).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect x="0" y="0" width="${W}" height="${H}" rx="18" ry="18" fill="#111"/>
  <text x="${W / 2}" y="${H / 2}" text-anchor="middle"
        font-family="Inter, Segoe UI, Arial, sans-serif" font-size="${fontSize}"
        fill="#fff" dominant-baseline="middle">
    ${tspans}
  </text>
</svg>`.trim();
  };

  // Load text.md content and generate SVG image
  const loadButtonContent = async (context: string, forceUpdate = false) => {
    console.log('[MQTTButton] ========== loadButtonContent called ==========');
    console.log('[MQTTButton] Context:', context);
    console.log('[MQTTButton] Force update:', forceUpdate);
    console.log('[MQTTButton] Current textMdContent:', textMdContent.value);

    try {
      console.log('[MQTTButton] Fetching text.md...');
      const response = await fetch('/text.md?t=' + Date.now()); // Add timestamp to bypass cache
      console.log('[MQTTButton] Fetch response status:', response.status, response.statusText);

      const text = await response.text();
      console.log('[MQTTButton] Loaded text.md, length:', text.length);
      console.log('[MQTTButton] Text content:', text.substring(0, 100) + '...');

      // Check if content changed
      /* if (text === textMdContent.value && !forceUpdate) {
        console.log('[MQTTButton] Content unchanged, skipping update');
        return; // No change, skip update
      } */

      console.log('[MQTTButton] Content changed or force update, processing...');
      console.log('[MQTTButton] Loaded text.md (changed):', text);
      textMdContent.value = text;

      // Parse lines from the markdown (skip "button content:" line)
      const lines = text
        .split('\n')
        .filter((line) => line.trim() && !line.startsWith('button content:'))
        .map((line) => line.trim());

      console.log('[MQTTButton] Parsed lines:', lines.length);
      console.log('[MQTTButton] Lines:', lines);

      if (lines.length === 0) {
        console.warn('[MQTTButton] No content lines found in text.md');
        return;
      }

      // Generate SVG from lines
      console.log('[MQTTButton] Generating SVG...');
      const svg = makeKeySvg(lines);
      const dataUrl = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(svg);

      console.log('[MQTTButton] Generated SVG with', lines.length, 'lines');
      console.log('[MQTTButton] SVG length:', svg.length);
      console.log('[MQTTButton] ========== Full SVG ==========');
      console.log(svg);
      console.log('[MQTTButton] ========== End SVG ==========');
      console.log('[MQTTButton] Data URL length:', dataUrl.length);

      const action = plugin.getAction(context);
      console.log('[MQTTButton] Action from context:', action);
      console.log('[MQTTButton] Action exists:', !!action);

      if (action) {
        // Set SVG image instead of title
        console.log('[MQTTButton] Setting image via action.setImage (after file save)...');
        console.log('[MQTTButton] Data URL length:', dataUrl.length);
        console.log('[MQTTButton] Data URL preview:', dataUrl.substring(0, 150) + '...');

        action.setImage(dataUrl);

        // Check if WebSocket is ready (in real StreamDock it should be)
        const server = (plugin as any).server || null;
        if (server) {
          console.log('[MQTTButton] WebSocket state:', server.readyState, '(OPEN=1, CONNECTING=0, CLOSING=2, CLOSED=3)');
        } else {
          console.log('[MQTTButton] No WebSocket server available (dev mode?)');
        }

        console.log('[MQTTButton] ✓ Button image set to SVG (may be queued if WebSocket not ready)');
      } else {
        console.warn('[MQTTButton] No action found for context:', context);
        console.warn('[MQTTButton] Available actions:', plugin.ActionArr);
      }
    } catch (error) {
      console.error('[MQTTButton] ✗ Failed to load text.md:', error);
      console.error('[MQTTButton] Error details:', error instanceof Error ? error.message : String(error));
      console.error('[MQTTButton] Error stack:', error instanceof Error ? error.stack : 'No stack');

      // Fallback to default image
      if (forceUpdate) {
        console.log('[MQTTButton] Using fallback default image');
        const action = plugin.getAction(context);
        if (action) {
          // action.setImage('/images/default.png');
          console.log('[MQTTButton] Fallback image set');
        } else {
          console.warn('[MQTTButton] Cannot set fallback image - no action found');
        }
      }
    }

    console.log('[MQTTButton] ========== loadButtonContent finished ==========');
  };

  // Watch text.md for changes
  const watchTextMd = (context: string) => {
    // Poll every 2 seconds for changes
    const intervalId = `text-md-watch-${context}`;
    plugin.Interval(intervalId, 2000, () => {
      loadButtonContent(context, false);
    });

    console.log('[MQTTButton] Started watching text.md for changes');

    // Return cleanup function
    return () => {
      plugin.Unterval(intervalId);
      console.log('[MQTTButton] Stopped watching text.md');
    };
  };

  // Handle HTTP request on button press
  const handleButtonPress = async (context: string, buttonIndex: number) => {
    console.log('[MQTTButton] ========== handleButtonPress called ==========');
    console.log('[MQTTButton] Button pressed, index:', buttonIndex);
    console.log('[MQTTButton] Context:', context);
    console.log('[MQTTButton] Timestamp:', new Date().toISOString());

    // Get URL from action settings or use default
    const action = plugin.getAction(context);
    const defaultUrl = 'https://test.home.popstas.ru/node-red-request.php';
    let url = defaultUrl;

    if (action?.settings && (action.settings as any).httpUrl) {
      const configuredUrl = (action.settings as any).httpUrl;
      // If it's a full URL, use it directly
      if (configuredUrl.startsWith('http://') || configuredUrl.startsWith('https://')) {
        url = configuredUrl;
      } else {
        // It's a relative path, prepend the base URL
        const baseUrl = 'https://test.home.popstas.ru';
        const urlPath = configuredUrl.startsWith('/') ? configuredUrl : '/' + configuredUrl;
        url = baseUrl + urlPath;
      }
    }

    // Prepare path for the PHP endpoint
    const path = `actions/mirabox/button-${buttonIndex}`;

    console.log('[MQTTButton] ========== Button Press Handler ==========');
    console.log('[MQTTButton] Context:', context);
    console.log('[MQTTButton] Button index:', buttonIndex);
    console.log('[MQTTButton] Sending HTTP request to:', url);
    console.log('[MQTTButton] Request payload - path:', path);

    // Send HTTP request without auth (removed username/password)
    const result = await plugin.sendHttpRequest(url, {
      username: '',
      password: '',
      path: path
    });

    console.log('[MQTTButton] HTTP request result:', result);

    if (result.success) {
      console.log('[MQTTButton] HTTP request successful:', result.response);
    } else {
      console.error('[MQTTButton] HTTP request failed:', result.error);
    }
  };

  console.log('[MQTTButton] Registering useWatchEvent with ActionID:', ActionID);
  console.log(
    '[MQTTButton] Available handlers:',
    Object.keys({
      ActionID,
      willAppear: () => {},
      keyUp: () => {},
      touchTap: () => {}
    })
  );

  useWatchEvent('action', {
    ActionID,
    willAppear({ context, payload }) {
      console.log('[MQTTButton] ========== willAppear event ==========');
      console.log('[MQTTButton] Action appeared:', context, payload);
      console.log('[MQTTButton] Context:', context);
      console.log('[MQTTButton] Payload:', JSON.stringify(payload, null, 2));
      console.log('[MQTTButton] Calling loadButtonContent...');

      // Load and set button content from text.md (force update on first appearance)
      loadButtonContent(context, true);

      // Retry sending image after delays (in case WebSocket opens later)
      setTimeout(() => {
        console.log('[MQTTButton] Retrying image load after 500ms...');
        loadButtonContent(context, true);
        // Also try to send pending images
        if ((plugin as any).sendPendingImages) {
          (plugin as any).sendPendingImages();
        }
      }, 500);

      setTimeout(() => {
        console.log('[MQTTButton] Retrying image load after 2000ms...');
        loadButtonContent(context, true);
        // Also try to send pending images
        if ((plugin as any).sendPendingImages) {
          (plugin as any).sendPendingImages();
        }
      }, 2000);

      // Start watching for changes
      console.log('[MQTTButton] Starting watchTextMd...');
      watchTextMd(context);

      // In dev mode, expose test function to window for manual testing
      if (typeof window !== 'undefined' && !window.argv?.[0]) {
        (window as any).__testButtonPress = (buttonIndex: number = 1) => {
          console.log('[MQTTButton] TEST: Simulating button press via window.__testButtonPress');
          handleButtonPress(context, buttonIndex);
        };
        console.log('[MQTTButton] Dev mode: Use window.__testButtonPress(1) to simulate button press');
      }
    },
    willDisappear({ context }) {
      console.log('[MQTTButton] Action disappeared:', context);
      // Stop watching when action disappears
      const intervalId = `text-md-watch-${context}`;
      plugin.Unterval(intervalId);
    },
    didReceiveSettings({ context, payload }) {
      console.log('[MQTTButton] Settings received:', context, payload);
    },
    sendToPlugin({ payload }) {
      console.log('[MQTTButton] sendToPlugin event received');
      console.log('[MQTTButton] Full payload:', JSON.stringify(payload, null, 2));
      console.log('[MQTTButton] Payload type:', typeof payload);
      console.log('[MQTTButton] Payload keys:', payload ? Object.keys(payload) : 'null');

      // Handle setGlobalSettings request from property inspector
      if (payload && typeof payload === 'object' && payload.event === 'setGlobalSettings') {
        console.log('[MQTTButton] Setting global settings from property inspector:', payload.settings);
        plugin.setGlobalSettings(payload.settings);
        console.log('[MQTTButton] Global settings updated via plugin.setGlobalSettings');
      } else {
        console.log('[MQTTButton] Payload does not match setGlobalSettings format');
      }
    },
    keyDown({ context, payload }) {
      console.log('[MQTTButton] KeyDown event:', context, payload);
    },
    keyUp({ context, payload }) {
      console.log('[MQTTButton] ========== keyUp event received ==========');
      console.log('[MQTTButton] KeyUp handler called!');
      console.log('[MQTTButton] Context:', context);
      console.log('[MQTTButton] Payload:', payload);
      console.log('[MQTTButton] Payload (stringified):', JSON.stringify(payload, null, 2));

      // Get button index from settings or use coordinates (row * columns + column + 1)
      const action = plugin.getAction(context);
      console.log('[MQTTButton] Action from context:', action);
      console.log('[MQTTButton] Action settings:', action?.settings);

      let buttonIndex = 1;
      if (action?.settings && typeof (action.settings as any).buttonIndex === 'number') {
        buttonIndex = (action.settings as any).buttonIndex;
        console.log('[MQTTButton] Using buttonIndex from settings:', buttonIndex);
      } else if (payload?.coordinates) {
        // Calculate button index from coordinates (assuming 5 columns)
        const row = payload.coordinates.row || 0;
        const column = payload.coordinates.column || 0;
        buttonIndex = row * 5 + column + 1;
        console.log('[MQTTButton] Calculated buttonIndex from coordinates:', buttonIndex, '(row:', row, 'col:', column, ')');
      } else {
        console.log('[MQTTButton] Using default buttonIndex:', buttonIndex);
      }

      console.log('[MQTTButton] Final button index:', buttonIndex);
      console.log('[MQTTButton] Calling handleButtonPress...');

      // Send HTTP request
      handleButtonPress(context, buttonIndex).catch((error) => {
        console.error('[MQTTButton] Error in handleButtonPress:', error);
      });
    },
    touchTap({ context, payload }) {
      console.log('[MQTTButton] ========== touchTap event received ==========');
      console.log('[MQTTButton] TouchTap event:', context, payload);
      console.log('[MQTTButton] Context:', context);
      console.log('[MQTTButton] Payload:', JSON.stringify(payload, null, 2));

      // Get button index from settings or use coordinates
      const action = plugin.getAction(context);
      console.log('[MQTTButton] Action from context:', action);

      let buttonIndex = 1;
      if (action?.settings && typeof (action.settings as any).buttonIndex === 'number') {
        buttonIndex = (action.settings as any).buttonIndex;
        console.log('[MQTTButton] Using buttonIndex from settings:', buttonIndex);
      } else if (payload?.coordinates) {
        // Calculate button index from coordinates (assuming 5 columns)
        const row = payload.coordinates.row || 0;
        const column = payload.coordinates.column || 0;
        buttonIndex = row * 5 + column + 1;
        console.log('[MQTTButton] Calculated buttonIndex from coordinates:', buttonIndex);
      } else {
        console.log('[MQTTButton] Using default buttonIndex:', buttonIndex);
      }

      console.log('[MQTTButton] Final button index:', buttonIndex);
      console.log('[MQTTButton] Calling handleButtonPress...');

      // Send HTTP request
      handleButtonPress(context, buttonIndex).catch((error) => {
        console.error('[MQTTButton] Error in handleButtonPress:', error);
      });
    }
  });

  console.log('[MQTTButton] useWatchEvent call completed');
  console.log('[MQTTButton] ========== Action handler initialization complete ==========');
}
