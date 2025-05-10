import {
  createSSRApp
} from "vue";
import type { App as VueApp } from 'vue'

import App from "./App.vue";

export function createApp() {
  const app: VueApp = createSSRApp(App);
  return {
    app,
  };
} 