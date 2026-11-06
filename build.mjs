import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/wth-climate-card.ts"],
  bundle: true,
  format: "esm",
  target: "es2021",
  outfile: "dist/wth-climate-card.js",
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  legalComments: "none",
  loader: {
    ".svg": "text"
  }
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(options);
  console.log("Build complete: dist/wth-climate-card.js");
}
