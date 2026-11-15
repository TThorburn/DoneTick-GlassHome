import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { glasshomeWidgets } from "@glasshome/widget-sdk/vite";

export default defineConfig({
  plugins: [solid({ solid: { delegateEvents: false } }), ...glasshomeWidgets()],
});
