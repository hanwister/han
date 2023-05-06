const { build } =require('esbuild');

build({
  entryPoints: ["./src/index.ts"],
  outdir: "./dist/",
  minify: true,
  bundle: true,
  target: 'es2020',
  sourcemap: false,
  external: ['esbuild'],
  platform: 'node'
})
  .then(() => {
    console.log("Generated!")
  })
  .catch((err) => console.error(err));
