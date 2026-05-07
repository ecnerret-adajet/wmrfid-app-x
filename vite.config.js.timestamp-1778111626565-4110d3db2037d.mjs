// vite.config.js
import { fileURLToPath } from "node:url";
import vue from "file:///D:/laragon/www/wmrfid-app-x/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///D:/laragon/www/wmrfid-app-x/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import AutoImport from "file:///D:/laragon/www/wmrfid-app-x/node_modules/unplugin-auto-import/dist/vite.js";
import Components from "file:///D:/laragon/www/wmrfid-app-x/node_modules/unplugin-vue-components/dist/vite.js";
import { defineConfig } from "file:///D:/laragon/www/wmrfid-app-x/node_modules/vite/dist/node/index.js";
import vuetify from "file:///D:/laragon/www/wmrfid-app-x/node_modules/vite-plugin-vuetify/dist/index.mjs";
import svgLoader from "file:///D:/laragon/www/wmrfid-app-x/node_modules/vite-svg-loader/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/laragon/www/wmrfid-app-x/vite.config.js";
var vite_config_default = defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    // Docs: https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin
    vuetify({
      styles: {
        configFile: "src/assets/styles/variables/_vuetify.scss"
      }
    }),
    Components({
      dirs: ["src/@core/components", "src/components"],
      dts: true,
      resolvers: [
        (componentName) => {
          if (componentName === "VueApexCharts")
            return { name: "default", from: "vue3-apexcharts", as: "VueApexCharts" };
        }
      ]
    }),
    // Docs: https://github.com/antfu/unplugin-auto-import#unplugin-auto-import
    AutoImport({
      imports: ["vue", "vue-router", "@vueuse/core", "@vueuse/math", "pinia"],
      vueTemplate: true,
      // ℹ️ Disabled to avoid confusion & accidental usage
      ignore: ["useCookies", "useStorage"],
      eslintrc: {
        enabled: true,
        filepath: "./.eslintrc-auto-import.json"
      }
    }),
    svgLoader()
  ],
  define: { "process.env": {} },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url)),
      "@core": fileURLToPath(new URL("./src/@core", __vite_injected_original_import_meta_url)),
      "@layouts": fileURLToPath(new URL("./src/@layouts", __vite_injected_original_import_meta_url)),
      "@images": fileURLToPath(new URL("./src/assets/images/", __vite_injected_original_import_meta_url)),
      "@styles": fileURLToPath(new URL("./src/assets/styles/", __vite_injected_original_import_meta_url)),
      "@configured-variables": fileURLToPath(new URL("./src/assets/styles/variables/_template.scss", __vite_injected_original_import_meta_url))
    }
  },
  build: {
    chunkSizeWarningLimit: 5e3
  },
  optimizeDeps: {
    exclude: ["vuetify"],
    entries: [
      "./src/**/*.vue"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxsYXJhZ29uXFxcXHd3d1xcXFx3bXJmaWQtYXBwLXhcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXGxhcmFnb25cXFxcd3d3XFxcXHdtcmZpZC1hcHAteFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovbGFyYWdvbi93d3cvd21yZmlkLWFwcC14L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJ1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgdnVlSnN4IGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZS1qc3gnXG5pbXBvcnQgQXV0b0ltcG9ydCBmcm9tICd1bnBsdWdpbi1hdXRvLWltcG9ydC92aXRlJ1xuaW1wb3J0IENvbXBvbmVudHMgZnJvbSAndW5wbHVnaW4tdnVlLWNvbXBvbmVudHMvdml0ZSdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgdnVldGlmeSBmcm9tICd2aXRlLXBsdWdpbi12dWV0aWZ5J1xuaW1wb3J0IHN2Z0xvYWRlciBmcm9tICd2aXRlLXN2Zy1sb2FkZXInXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgdnVlKCksXG4gICAgdnVlSnN4KCksXG5cbiAgICAvLyBEb2NzOiBodHRwczovL2dpdGh1Yi5jb20vdnVldGlmeWpzL3Z1ZXRpZnktbG9hZGVyL3RyZWUvbWFzdGVyL3BhY2thZ2VzL3ZpdGUtcGx1Z2luXG4gICAgdnVldGlmeSh7XG4gICAgICBzdHlsZXM6IHtcbiAgICAgICAgY29uZmlnRmlsZTogJ3NyYy9hc3NldHMvc3R5bGVzL3ZhcmlhYmxlcy9fdnVldGlmeS5zY3NzJyxcbiAgICAgIH0sXG4gICAgfSksXG4gICAgQ29tcG9uZW50cyh7XG4gICAgICBkaXJzOiBbJ3NyYy9AY29yZS9jb21wb25lbnRzJywgJ3NyYy9jb21wb25lbnRzJ10sXG4gICAgICBkdHM6IHRydWUsXG4gICAgICByZXNvbHZlcnM6IFtcbiAgICAgICAgY29tcG9uZW50TmFtZSA9PiB7XG4gICAgICAgICAgLy8gQXV0byBpbXBvcnQgYFZ1ZUFwZXhDaGFydHNgXG4gICAgICAgICAgaWYgKGNvbXBvbmVudE5hbWUgPT09ICdWdWVBcGV4Q2hhcnRzJylcbiAgICAgICAgICAgIHJldHVybiB7IG5hbWU6ICdkZWZhdWx0JywgZnJvbTogJ3Z1ZTMtYXBleGNoYXJ0cycsIGFzOiAnVnVlQXBleENoYXJ0cycgfVxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KSxcblxuICAgIC8vIERvY3M6IGh0dHBzOi8vZ2l0aHViLmNvbS9hbnRmdS91bnBsdWdpbi1hdXRvLWltcG9ydCN1bnBsdWdpbi1hdXRvLWltcG9ydFxuICAgIEF1dG9JbXBvcnQoe1xuICAgICAgaW1wb3J0czogWyd2dWUnLCAndnVlLXJvdXRlcicsICdAdnVldXNlL2NvcmUnLCAnQHZ1ZXVzZS9tYXRoJywgJ3BpbmlhJ10sXG4gICAgICB2dWVUZW1wbGF0ZTogdHJ1ZSxcblxuICAgICAgLy8gXHUyMTM5XHVGRTBGIERpc2FibGVkIHRvIGF2b2lkIGNvbmZ1c2lvbiAmIGFjY2lkZW50YWwgdXNhZ2VcbiAgICAgIGlnbm9yZTogWyd1c2VDb29raWVzJywgJ3VzZVN0b3JhZ2UnXSxcbiAgICAgIGVzbGludHJjOiB7XG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgIGZpbGVwYXRoOiAnLi8uZXNsaW50cmMtYXV0by1pbXBvcnQuanNvbicsXG4gICAgICB9LFxuICAgIH0pLFxuICAgIHN2Z0xvYWRlcigpLFxuICBdLFxuICBkZWZpbmU6IHsgJ3Byb2Nlc3MuZW52Jzoge30gfSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMnLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICAgICdAY29yZSc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMvQGNvcmUnLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICAgICdAbGF5b3V0cyc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMvQGxheW91dHMnLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICAgICdAaW1hZ2VzJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYy9hc3NldHMvaW1hZ2VzLycsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICAgJ0BzdHlsZXMnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjL2Fzc2V0cy9zdHlsZXMvJywgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICAnQGNvbmZpZ3VyZWQtdmFyaWFibGVzJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYy9hc3NldHMvc3R5bGVzL3ZhcmlhYmxlcy9fdGVtcGxhdGUuc2NzcycsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA1MDAwLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ3Z1ZXRpZnknXSxcbiAgICBlbnRyaWVzOiBbXG4gICAgICAnLi9zcmMvKiovKi52dWUnLFxuICAgIF0sXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEyUSxTQUFTLHFCQUFxQjtBQUN6UyxPQUFPLFNBQVM7QUFDaEIsT0FBTyxZQUFZO0FBQ25CLE9BQU8sZ0JBQWdCO0FBQ3ZCLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sYUFBYTtBQUNwQixPQUFPLGVBQWU7QUFQK0ksSUFBTSwyQ0FBMkM7QUFVdE4sSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBO0FBQUEsSUFHUCxRQUFRO0FBQUEsTUFDTixRQUFRO0FBQUEsUUFDTixZQUFZO0FBQUEsTUFDZDtBQUFBLElBQ0YsQ0FBQztBQUFBLElBQ0QsV0FBVztBQUFBLE1BQ1QsTUFBTSxDQUFDLHdCQUF3QixnQkFBZ0I7QUFBQSxNQUMvQyxLQUFLO0FBQUEsTUFDTCxXQUFXO0FBQUEsUUFDVCxtQkFBaUI7QUFFZixjQUFJLGtCQUFrQjtBQUNwQixtQkFBTyxFQUFFLE1BQU0sV0FBVyxNQUFNLG1CQUFtQixJQUFJLGdCQUFnQjtBQUFBLFFBQzNFO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBO0FBQUEsSUFHRCxXQUFXO0FBQUEsTUFDVCxTQUFTLENBQUMsT0FBTyxjQUFjLGdCQUFnQixnQkFBZ0IsT0FBTztBQUFBLE1BQ3RFLGFBQWE7QUFBQTtBQUFBLE1BR2IsUUFBUSxDQUFDLGNBQWMsWUFBWTtBQUFBLE1BQ25DLFVBQVU7QUFBQSxRQUNSLFNBQVM7QUFBQSxRQUNULFVBQVU7QUFBQSxNQUNaO0FBQUEsSUFDRixDQUFDO0FBQUEsSUFDRCxVQUFVO0FBQUEsRUFDWjtBQUFBLEVBQ0EsUUFBUSxFQUFFLGVBQWUsQ0FBQyxFQUFFO0FBQUEsRUFDNUIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxjQUFjLElBQUksSUFBSSxTQUFTLHdDQUFlLENBQUM7QUFBQSxNQUNwRCxTQUFTLGNBQWMsSUFBSSxJQUFJLGVBQWUsd0NBQWUsQ0FBQztBQUFBLE1BQzlELFlBQVksY0FBYyxJQUFJLElBQUksa0JBQWtCLHdDQUFlLENBQUM7QUFBQSxNQUNwRSxXQUFXLGNBQWMsSUFBSSxJQUFJLHdCQUF3Qix3Q0FBZSxDQUFDO0FBQUEsTUFDekUsV0FBVyxjQUFjLElBQUksSUFBSSx3QkFBd0Isd0NBQWUsQ0FBQztBQUFBLE1BQ3pFLHlCQUF5QixjQUFjLElBQUksSUFBSSxnREFBZ0Qsd0NBQWUsQ0FBQztBQUFBLElBQ2pIO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsdUJBQXVCO0FBQUEsRUFDekI7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxTQUFTO0FBQUEsSUFDbkIsU0FBUztBQUFBLE1BQ1A7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
