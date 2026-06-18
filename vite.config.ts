import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		reactRouter(),
	],
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes("node_modules")) return;
					if (id.includes("leaflet")) return "leaflet";
					if (
						id.includes("react-dom") ||
						id.includes("react-router") ||
						/id[/\\]node_modules[/\\]react[/\\]/.test(id)
					) {
						return "react";
					}
					return "vendor";
				},
			},
		},
	},
});
