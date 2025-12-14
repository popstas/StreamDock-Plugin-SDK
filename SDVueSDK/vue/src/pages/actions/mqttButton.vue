<script setup lang="ts">
  import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
  import { ref, onMounted, watch } from 'vue';
  import { NInput, NButton, useMessage } from 'naive-ui';

  // Event listener
  const property = usePropertyStore();
  const message = useMessage();

  // Configuration
  const httpUrl = ref('https://test.home.popstas.ru/node-red-request.php');
  const saving = ref(false);

  // Load global settings on mount
  onMounted(() => {
    console.log('[Property mqttButton] Component mounted');
    console.log('[Property mqttButton] window.argv:', window.argv);
    console.log('[Property mqttButton] window.argv[4]:', window.argv[4]);
    property.getGlobalSettings();
  });

  // Watch for settings updates
  watch(
    () => property.settings,
    (newSettings) => {
      console.log('[Property mqttButton] Settings changed:', newSettings);
      if (newSettings) {
        if ((newSettings as any).httpUrl) {
          httpUrl.value = (newSettings as any).httpUrl;
          console.log('[Property mqttButton] httpUrl updated from settings:', httpUrl.value);
        }
      }
    },
    { deep: true, immediate: true }
  );

  // Watch for global settings updates (removed username/password handling)
  watch(
    () => property.message,
    (newMessage) => {
      console.log('[Property mqttButton] Message changed:', newMessage);
    },
    { deep: true, immediate: true }
  );

  // Save configuration
  const saveConfig = async () => {
    console.log('[Property mqttButton] ========== saveConfig called ==========');

    saving.value = true;
    console.log('[Property mqttButton] Starting save process...');

    try {
      // Save HTTP URL to action settings
      console.log('[Property mqttButton] Saving httpUrl to action settings:', httpUrl.value);
      property.preventWatch = true;
      property.settings = {
        ...property.settings,
        httpUrl: httpUrl.value || 'https://test.home.popstas.ru/node-red-request.php'
      } as any;
      property.preventWatch = false;
      console.log('[Property mqttButton] Action settings updated with httpUrl:', property.settings);

      message.success('Configuration saved successfully');
      console.log('[Property mqttButton] Configuration save request sent successfully');
    } catch (error) {
      console.error('[Property mqttButton] Failed to save config:', error);
      console.error('[Property mqttButton] Error stack:', error instanceof Error ? error.stack : 'No stack');
      message.error('Failed to save configuration');
    } finally {
      saving.value = false;
      console.log('[Property mqttButton] Save process completed');
    }
  };

  useWatchEvent({
    didReceiveSettings(data) {
      console.log('[Property mqttButton] Settings received:', data);
      if (data.payload?.settings) {
        const settings = data.payload.settings as any;
        if (settings.httpUrl) {
          httpUrl.value = settings.httpUrl;
          console.log('[Property mqttButton] httpUrl updated from didReceiveSettings:', httpUrl.value);
        }
      }
    },
    sendToPropertyInspector(data) {
      console.log('[Property mqttButton] sendToPropertyInspector event:', data);
    },
    didReceiveGlobalSettings(data) {
      console.log('[Property mqttButton] didReceiveGlobalSettings event:', data);
    }
  });
</script>

<template>
  <div style="padding: 15px">
    <TabView label="HTTP URL">
      <NInput v-model:value="httpUrl" placeholder="https://test.home.popstas.ru/node-red-request.php" style="margin-bottom: 15px" :disabled="saving" />
      <NButton
        type="primary"
        @click="
          () => {
            console.log('[Property mqttButton] Button clicked!');
            saveConfig();
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
