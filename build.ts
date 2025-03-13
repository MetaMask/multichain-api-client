import type { BuildConfig } from 'bun';
import dts from 'bun-plugin-dts';
import './src/index'; // Workaround for the watch mode using a custom build file (https://github.com/oven-sh/bun/issues/5866)

// Get the "minify" and "outdir" arguments from the command line
const args = process.argv.slice(2);
const minify = args.includes('--minify');
const outdirIndex = args.indexOf('--outdir');
const outdir = outdirIndex !== -1 && args[outdirIndex + 1] ? args[outdirIndex + 1] : './dist';

const defaultBuildConfig: BuildConfig = {
  entrypoints: ['./src/index.ts'],
  outdir,
};

await Promise.all([
  Bun.build({
    ...defaultBuildConfig,
    plugins: [dts()],
    format: 'esm',
    naming: '[dir]/[name].js',
    minify,
  }),
  Bun.build({
    ...defaultBuildConfig,
    format: 'cjs',
    naming: '[dir]/[name].cjs',
    minify,
  }),
]);

console.info(`[${new Date().toLocaleTimeString()}] Build complete to ${outdir}`);
