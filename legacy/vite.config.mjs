// vite.config.js
// Vite configuration file for React + CesiumJS.
// - Defines alias for 'cesium' module path
// - Configures build output directory
// - Ensures correct static path for Cesium assets

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
	plugins: [
		react(),
		viteStaticCopy({
			targets: [
				{
					src: "node_modules/cesium/Build/Cesium",
					dest: "", // copies to dist/cesium
				},
			],
		}),
	],
	resolve: {
		alias: {
			cesium: path.resolve(__dirname, "node_modules/cesium"),
		},
	},
	define: {
		CESIUM_BASE_URL: JSON.stringify("/cesium"),
	},
	build: {
		outDir: "dist",
	},
});
