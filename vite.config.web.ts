import {defineConfig} from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV == "development" ? "/" : "/read/",
  plugins: [vue()],
  server: {
    port: 8888
  }
});
