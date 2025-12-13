<script setup lang="ts">
import { usePropertyStore, useWatchEvent, TabView } from '@/hooks/property';
import { useI18nStore } from '@/hooks/i18n';

// Event listener
const i18n = useI18nStore();
const property = usePropertyStore();
useWatchEvent({
  didReceiveSettings(data) {
  },
  sendToPropertyInspector(data) {
  },
  didReceiveGlobalSettings(data) {
  }
});
</script>

<template>
  <TabView :label="i18n['Operation options']">...</TabView>
</template>

<style lang="scss" scoped></style>
