const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const { inspectPdf } = require("../scripts/verify.js");

// Renders every fixture with the real pipeline, so this needs Chromium, the
// static Noto/Sarasa fonts and poppler. The fixtures live outside the project
// root, which is exactly the situation that used to lose the KaTeX fonts.
const root = path.resolve(__dirname, "..");
let outdir;

const pdfText = (name) => execFileSync("pdftotext", [path.join(outdir, name), "-"], { encoding: "utf8" });
// pdftotext ends every page, including the last, with a form feed.
const pages = (name) => pdfText(name).split("\f").slice(0, -1);

before(() => {
  outdir = fs.mkdtempSync(path.join(os.tmpdir(), "academic-markdown-"));
  execFileSync(process.execPath, [path.join(root, "scripts", "render.js"), "--outdir", outdir, path.join(__dirname, "fixtures")], {
    stdio: "inherit",
  });
});

after(() => {
  fs.rmSync(outdir, { recursive: true, force: true });
});

test("render.js writes one PDF per fixture", () => {
  assert.deepEqual(fs.readdirSync(outdir).sort(), ["defects.pdf", "katex.pdf", "mermaid.pdf", "pagination.pdf"]);
});

test("katex: formula fonts are embedded when the base directory has no node_modules", () => {
  const result = inspectPdf(path.join(outdir, "katex.pdf"), { expectKatex: true });

  assert.deepEqual(result.problems, []);
});

test("mermaid: diagrams are drawn into the PDF instead of leaving their source or an error", () => {
  const text = pdfText("mermaid.pdf");

  for (const label of ["读取输入", "生成 PDF", "报告错误", "提交文档", "返回结果"]) {
    assert.ok(text.includes(label), `${label} is missing`);
  }
  for (const leaked of ["flowchart", "sequenceDiagram", "-->", "Mermaid 渲染失败"]) {
    assert.ok(!text.includes(leaked), `${leaked} appears in the PDF text`);
  }
  assert.deepEqual(inspectPdf(path.join(outdir, "mermaid.pdf")).problems, []);
});

test("pagination: the document passes every check", () => {
  const result = inspectPdf(path.join(outdir, "pagination.pdf"));

  assert.deepEqual(result.problems, []);
  assert.ok(result.pages >= 4, `expected the long blocks to span several pages, got ${result.pages}`);
});

test("pagination: the long table breaks across pages and repeats its header", () => {
  const withHeader = pages("pagination.pdf").filter((page) => page.includes("指标名称"));

  assert.ok(withHeader.length >= 2, `header found on ${withHeader.length} page(s)`);

  const lines = new Set(pdfText("pagination.pdf").split("\n"));
  for (let row = 1; row <= 60; row++) assert.ok(lines.has(`指标 ${row}`), `row ${row} is missing`);
});

test("pagination: the short table stays on one page", () => {
  const page = pages("pagination.pdf").find((text) => text.includes("第一行"));

  assert.ok(page.includes("第三行"));
});

test("pagination: a tall code block starts where the table ends instead of leaving a half-empty page", () => {
  const all = pages("pagination.pdf");
  const tableEnd = all.findIndex((page) => page.split("\n").includes("指标 60"));
  const codeStart = all.findIndex((page) => page.includes("value_1 ="));

  assert.equal(codeStart, tableEnd, `table ends on page ${tableEnd + 1}, code starts on page ${codeStart + 1}`);
});

test("pagination: the long code block breaks across pages without losing lines", () => {
  const all = pages("pagination.pdf");
  const first = all.findIndex((page) => page.includes("value_1 ="));
  const last = all.findIndex((page) => page.includes("LAST_LINE_MARKER"));

  assert.ok(last > first, `code starts on page ${first + 1} and ends on page ${last + 1}`);

  const text = pdfText("pagination.pdf");
  for (let line = 1; line <= 90; line++) {
    assert.ok(text.includes(`value_${line} = compute(${line}, scale=0.5)`), `code line ${line} is missing`);
  }
  assert.ok(all[all.length - 1].includes("END_OF_DOCUMENT"));
});

test("defects: verify.js reports the blank page and the leaked asterisks", () => {
  const result = inspectPdf(path.join(outdir, "defects.pdf"));

  assert.deepEqual(result.problems, ["literal ** on page(s) 3", "blank page(s) 2"]);
});
