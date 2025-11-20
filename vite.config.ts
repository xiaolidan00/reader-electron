import {defineConfig} from "vite";
import electron from "vite-plugin-electron/simple";
import path from "node:path";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  // base: '/', //process.env.NODE_ENV == 'development' ? '/' : '/reader-electron/',
  plugins: [
    vue(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main.ts"
        // onstart({startup}) {
        //   if (process.env.NODE_ENV === "development")
        // startup([".", "--inspect"]);
        //     startup([".", "--inspect-brk=5858", "--remote-debugging-port=9222"]);
        // }
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, "electron/preload.ts")
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer:
        process.env.NODE_ENV === "test"
          ? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
            undefined
          : {}
    })
  ],
  server: {
    port: 9222
  }
});
