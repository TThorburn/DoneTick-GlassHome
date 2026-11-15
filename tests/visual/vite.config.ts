import {defineConfig} from "vite";
import solid from "vite-plugin-solid";
import {fileURLToPath} from "node:url";
export default defineConfig({
  plugins: [solid({solid: {delegateEvents: false}})],
  resolve: {alias: [{find: /^@glasshome\/widget-sdk$/, replacement: fileURLToPath(new URL("./sdk.ts", import.meta.url))}]},
  server: {host: "127.0.0.1", port: 4178, strictPort: true},
});
