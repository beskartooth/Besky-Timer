import { readdirSync, rmSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/** Drop archive/ and *-candidate* copies from dist (keep them in public for local work). */
function excludePublicJunk(): Plugin {
  return {
    name: 'exclude-public-junk',
    closeBundle() {
      const dist = join(__dirname, 'dist')
      rmSync(join(dist, 'scenes', 'archive'), { recursive: true, force: true })

      const walk = (dir: string) => {
        let entries: string[]
        try {
          entries = readdirSync(dir)
        } catch {
          return
        }
        for (const name of entries) {
          const p = join(dir, name)
          let st
          try {
            st = statSync(p)
          } catch {
            continue
          }
          if (st.isDirectory()) {
            walk(p)
          } else if (/-candidate/i.test(name)) {
            unlinkSync(p)
          }
        }
      }
      walk(dist)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), excludePublicJunk()],
})
