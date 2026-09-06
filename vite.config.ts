import {defineConfig} from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: "src/main.ts",
      formats: ["es"],
      fileName: "cypherv2",
      cssFileName: "cypherv2"
    },
    rollupOptions: {
      output: {
        entryFileNames: "cypherv2.mjs",
        assetFileNames: "[name][extname]"
      }
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"]
    }
  }
});

