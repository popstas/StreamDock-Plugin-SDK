<script setup lang="ts">
  import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
  import { useI18nStore } from '@/hooks/i18n';
  import { ref, onMounted, watch } from 'vue';
  import { NInput, NButton, useMessage } from 'naive-ui';

  // Event listener
  const i18n = useI18nStore();
  const property = usePropertyStore();
  const message = useMessage();

  // Auth configuration
  const username = ref('');
  const password = ref('');
  const httpUrl = ref('https://test.home.popstas.ru/node-red-request.php');
  const saving = ref(false);

  // Load global settings on mount
  onMounted(() => {
    property.getGlobalSettings();
  });

  // Watch for settings updates
  watch(
    () => property.settings,
    (newSettings) => {
      if (newSettings) {
        if ((newSettings as any).httpUrl) {
          httpUrl.value = (newSettings as any).httpUrl;
        }
      }
    },
    { deep: true, immediate: true }
  );

  // Watch for global settings updates
  watch(
    () => property.message,
    (newMessage) => {
      if (newMessage?.event === 'didReceiveGlobalSettings' && newMessage.payload?.settings) {
        const httpAuth = newMessage.payload.settings.httpAuth;
        if (httpAuth) {
          username.value = httpAuth.username || '';
          password.value = httpAuth.password || '';
        }
      }
    },
    { deep: true, immediate: true }
  );

  // Save auth configuration
  const saveAuthConfig = async () => {
    console.log('[Property] saveAuthConfig called');
    console.log('[Property] Username:', username.value, 'Password:', password.value ? '***' : 'empty');

    if (!username.value || !password.value) {
      console.warn('[Property] Validation failed - missing username or password');
      message.warning('Please enter both username and password');
      return;
    }

    saving.value = true;
    console.log('[Property] Starting save process...');

    try {
      console.log('[Property] Saving auth config, username:', username.value);

      // Get current global settings from message or use empty object
      const currentSettings = property.message?.payload?.settings || {};
      console.log('[Property] Current settings:', currentSettings);
      console.log('[Property] Property message:', property.message);

      // Update with new auth config
      const updatedSettings = {
        ...currentSettings,
        httpAuth: {
          username: username.value,
          password: password.value
        }
      };

      console.log('[Property] Updated settings:', updatedSettings);
      console.log('[Property] Property store server available:', !!property.sendToPlugin);

      // Save HTTP URL to action settings (not global settings)
      console.log('[Property] Saving httpUrl to action settings:', httpUrl.value);
      property.preventWatch = true;
      property.settings = {
        ...property.settings,
        httpUrl: httpUrl.value || 'https://test.home.popstas.ru/node-red-request.php'
      };
      property.preventWatch = false;
      console.log('[Property] Action settings updated with httpUrl:', property.settings);

      // Send to plugin via sendToPlugin (this goes to the action handler)
      console.log('[Property] Sending via sendToPlugin...');
      property.sendToPlugin({
        event: 'setGlobalSettings',
        settings: updatedSettings
      });
      console.log('[Property] sendToPlugin called');

      // Also set directly via setGlobalSettings (this goes directly to StreamDock)
      console.log('[Property] Sending via setGlobalSettings...');
      property.setGlobalSettings(updatedSettings);
      console.log('[Property] setGlobalSettings called');

      // Wait a bit and reload global settings to verify
      setTimeout(() => {
        console.log('[Property] Reloading global settings to verify...');
        property.getGlobalSettings();
      }, 500);

      message.success('Auth configuration saved successfully');
      console.log('[Property] Configuration save request sent successfully');
    } catch (error) {
      console.error('[Property] Failed to save auth config:', error);
      console.error('[Property] Error stack:', error instanceof Error ? error.stack : 'No stack');
      message.error('Failed to save configuration');
    } finally {
      saving.value = false;
      console.log('[Property] Save process completed');
    }
  };

  useWatchEvent({
    didReceiveSettings(data) {
      console.log('[Property] Settings received:', data);
      if (data.payload?.settings) {
        const settings = data.payload.settings;
        if (settings.httpUrl) {
          httpUrl.value = settings.httpUrl;
        }
      }
    },
    sendToPropertyInspector(data) {},
    didReceiveGlobalSettings(data) {
      if (data.payload?.settings?.httpAuth) {
        const httpAuth = data.payload.settings.httpAuth;
        username.value = httpAuth.username || '';
        password.value = httpAuth.password || '';
      }
    }
  });
</script>

<template>
  <div style="padding: 15px">
    <TabView label="HTTP Authentication">
      <NInput v-model:value="username" placeholder="Username" style="margin-bottom: 10px" :disabled="saving" />
      <NInput v-model:value="password" type="password" placeholder="Password" show-password-on="click" style="margin-bottom: 10px" :disabled="saving" />
      <TabView label="HTTP URL" style="margin-bottom: 15px">
        <NInput v-model:value="httpUrl" placeholder="https://test.home.popstas.ru/node-red-request.php" style="margin-bottom: 10px" :disabled="saving" />
      </TabView>
      <NButton
        type="primary"
        @click="
          () => {
            console.log('[Property] Button clicked!');
            saveAuthConfig();
          }
        "
        :loading="saving"
        block
      >
        Save Configuration
      </NButton>
    </TabView>
  </div>
</template>

<style lang="scss" scoped></style>
