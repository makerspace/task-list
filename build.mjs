import * as esbuild from 'esbuild';
import { sassPlugin } from 'esbuild-sass-plugin';

const ctx = await esbuild.context({
    entryPoints: ['src/app.tsx'],
    bundle: true,
    minify: false,
    sourcemap: true,
    target: ['es2020'],
    plugins: [sassPlugin()],
    outdir: 'dist',
});

let { host, port } = await ctx.serve({
    servedir: 'dist',
    onRequest: () => {
    }
});

console.log('Build succeeded. Serving on http://' + host + ':' + port);
console.log("Watching for changes...");