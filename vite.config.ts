import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file from the project root (two levels up from apps/client)
    const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
    const env = loadEnv(mode, projectRoot, '')

    // GitHub Pages project site base (repo name)
    // Local dev will still work fine because Vite rewrites paths,
    // but this ensures built assets load under /highl1te.github.io/
    const isGitHubPages = env.GITHUB_PAGES === 'true' || mode === 'production'

    return {
        base: isGitHubPages ? '/highl1te.github.io/' : '/',
        plugins: [
            vue(),
            vueDevTools(),
        ],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        server: {
            port: 5173,
        },
        // Ensure environment variables are properly exposed
        define: {
            __APP_ENV__: JSON.stringify(env.NODE_ENV),
        },
    }
})
