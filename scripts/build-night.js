process.env.MD_THEME = "night";

const fs = require("fs");
const path = require("path");
const { mdToPdf } = require("md-to-pdf");
const config = require("../md-to-pdf.config.js");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "example.md");
const output = path.join(root, "example-night.pdf");

const markdown = fs
  .readFileSync(source, "utf8")
  .replace("assets/example-figure.svg", "assets/example-figure-night.svg")
  .replace(
    "配色取自 University of Cambridge 官方色板。",
    "配色采用夜间模式：深蓝黑底、浅蓝强调与高对比度文字，保持 Cambridge 色系的冷静气质。",
  )
  .replace('"配色": "Cambridge Slate"', '"配色": "Cambridge Slate Night"')
  .replace("示意图使用 Cambridge 色板。", "示意图使用夜间模式配色。");

(async () => {
  const pdf = await mdToPdf(
    { content: markdown },
    { ...config, basedir: root, dest: output },
  );

  if (!pdf) throw new Error("Night PDF was not generated.");
  fs.writeFileSync(output, pdf.content);
  console.log(`wrote ${path.relative(root, output)}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
