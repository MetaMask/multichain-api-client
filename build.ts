import type { BuildConfig } from 'bun'
import dts from 'bun-plugin-dts'

// Get the "minify" argument from the command line
const args = process.argv.slice(2);
const minify = args.includes('--minify');

const defaultBuildConfig: BuildConfig = {
  entrypoints: ['./src/index.ts'],
  outdir: './dist'
}

await Promise.all([
  Bun.build({
    ...defaultBuildConfig,
    plugins: [dts()],
    format: 'esm',
    naming: "[dir]/[name].js",
    minify,
  }),
  Bun.build({
    ...defaultBuildConfig,
    format: 'cjs',
    naming: "[dir]/[name].cjs",
    minify,
  })
])