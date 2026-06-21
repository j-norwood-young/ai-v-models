import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		typescript: {
			config: (config) => {
				config.extends = '../../../tsconfig.base.json';
				return config;
			}
		}
	}
};

export default config;
