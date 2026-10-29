process.env.MD_THEME = "mono";

const fs = require("fs");
const path = require("path");
const { mdToPdf } = require("md-to-pdf");
const config = require("../md-to-pdf.config.js");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "example.md");
const output = path.join(root, "example-mono.pdf");

const markdown = fs
  .readFileSync(source, "utf8")
  .replace("assets/example-figure.svg", "assets/example-figure-mono.svg")
  .replace(
    "配色取自 University of Cambridge 官方色板。",
    "配色采用黑白主题：纯白底、黑灰文字与中性灰层级。",
  )
  .replace('"配色": "Cambridge Slate"', '"配色": "Monochrome"')
  .replace("示意图使用 Cambridge 色板。", "示意图使用黑白灰配色。");

(async () => {
  const pdf = await mdToPdf(
    { content: markdown },
    { ...config, basedir: root, dest: output },
  );

  if (!pdf) throw new Error("Monochrome PDF was not generated.");
  fs.writeFileSync(output, pdf.content);
  console.log(`wrote ${path.relative(root, output)}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
