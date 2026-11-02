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

test("katex: formula fonts are embedded when the base directory has no node_modules", () => {
  const result = inspectPdf(path.join(outdir, "katex.pdf"), { expectKatex: true });

  assert.deepEqual(result.problems, []);
});

test("mermaid: diagrams are drawn into the PDF instead of leaving their source or an error", () => {
  const text = pdfText("mermaid.pdf");

  for (const label of ["Markdown 源文件", "生成 PDF", "报告错误", "提交文档", "返回结果"]) {
    assert.ok(text.includes(label), `${label} is missing`);
  }
  for (const leaked of ["flowchart", "sequenceDiagram", "-->", "Mermaid 渲染失败"]) {
    assert.ok(!text.includes(leaked), `${leaked} appears in the PDF text`);
  }
  assert.deepEqual(inspectPdf(path.join(outdir, "mermaid.pdf")).problems, []);

  // Mermaid's neo look rasterises its drop shadows; the diagrams must stay vector.
  const images = execFileSync("pdfimages", ["-list", path.join(outdir, "mermaid.pdf")], { encoding: "utf8" });
  assert.deepEqual(images.trim().split("\n").slice(2), [], "the PDF contains bitmaps");
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

test("alert: a tall alert starts after the preceding text instead of moving to the next page", () => {
  const all = pages("alert.pdf");
  const start = all.findIndex((page) => page.includes("ALERT_FIRST_LINE"));
  const end = all.findIndex((page) => page.includes("提示第 30 行"));

  assert.equal(start, 0, `the alert starts on page ${start + 1}`);
  assert.ok(end > start, `the alert starts on page ${start + 1} and ends on page ${end + 1}`);
  assert.deepEqual(inspectPdf(path.join(outdir, "alert.pdf")).problems, []);
});

test("errors: a failed diagram does not replace the working one, and verify.js reports it", () => {
  const text = pdfText("errors.pdf");

  assert.ok(text.includes("GOOD_NODE") || text.includes("正确的节点"), "the valid diagram is missing");
  assert.ok(text.includes("Mermaid 渲染失败"), "the Mermaid error is not shown");
  assert.ok(text.includes("KaTeX 渲染失败"), "the KaTeX error is not shown");
  assert.deepEqual(inspectPdf(path.join(outdir, "errors.pdf")).problems, ["diagram or formula render error on page(s) 1"]);
});

// Words that end beyond the right margin are clipped by the page or the printer.
const RIGHT_LIMIT_PT = (210 - 20) * (72 / 25.4) + 1;
const wordsEnding = (name, pattern) => {
  const html = execFileSync("pdftotext", ["-bbox", path.join(outdir, name), "-"], { encoding: "utf8" });
  return [...html.matchAll(/<word [^>]*xMax="([\d.]+)"[^>]*>([^<]*)<\/word>/g)]
    .filter(([, , word]) => pattern.test(word))
    .map(([, xMax]) => Number(xMax));
};

test("overflow: a long inline code span wraps inside the right margin", () => {
  const ends = wordsEnding("overflow.pdf", /ier_/);

  assert.ok(ends.length >= 2, "the code span should wrap onto several lines");
  assert.ok(Math.max(...ends) <= RIGHT_LIMIT_PT, `a line ends at ${Math.max(...ends)}pt`);
});

test("overflow: a wide display formula is scaled to fit the content width", () => {
  const ends = wordsEnding("overflow.pdf", /ENDMARK|END/);

  assert.ok(ends.length >= 1, "the end of the formula is missing from the PDF");
  assert.ok(Math.max(...ends) <= RIGHT_LIMIT_PT, `the formula ends at ${Math.max(...ends)}pt`);
});

test("overflow: a long address, link and table cell wrap inside the right margin without losing text", () => {
  for (const marker of ["TEXT_END", "LINK_END", "CELL_END"]) {
    assert.ok(pdfText("long-url.pdf").includes(marker), `${marker} is missing`);
  }
  for (const pattern of [/ENDURL/, /segment29/, /CELL_END/]) {
    const ends = wordsEnding("long-url.pdf", pattern);

    assert.ok(ends.length >= 1, `${pattern} is missing from the PDF`);
    assert.ok(Math.max(...ends) <= RIGHT_LIMIT_PT, `${pattern} ends at ${Math.max(...ends)}pt`);
  }
});

test("figure-page: a page holding only a figure is not reported as blank", () => {
  assert.equal(pages("figure-page.pdf").length, 2);
  assert.deepEqual(inspectPdf(path.join(outdir, "figure-page.pdf")).problems, []);
});

test("footnotes: the notes are printed after the text without back-link arrows", () => {
  const text = pdfText("footnote.pdf");
  const notes = text.slice(text.indexOf("脚注\n"));

  for (const marker of ["FIRST_NOTE", "SECOND_NOTE", "ZH_NOTE", "TABLE_NOTE", "ALERT_NOTE"]) {
    assert.ok(notes.includes(marker), `${marker} is missing from the footnotes`);
  }
  assert.ok(!text.includes("↩"), "the back-link arrow is printed");
  assert.ok(!text.includes("[^"), "a reference was left unresolved");
  assert.deepEqual(inspectPdf(path.join(outdir, "footnote.pdf")).problems, []);
});

test("themes: Markdown column alignment applies, and code is not justified", async () => {
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });

  try {
    const css = fs.readFileSync(path.join(root, "academic-markdown.css"), "utf8");
    const page = await browser.newPage();

    await page.setContent(`<style>${css}</style><table><tr><th id="n">n</th><th id="c" align="center">c</th><td id="r" align="right">r</td></tr></table><pre id="p">p</pre>`);
    const align = await page.evaluate(() =>
      ["n", "c", "r", "p"].map((id) => getComputedStyle(document.getElementById(id)).textAlign),
    );

    // Chromium reports the presentational align attribute with a -webkit- prefix.
    assert.deepEqual(align.map((value) => value.replace("-webkit-", "")), ["left", "center", "right", "left"]);
  } finally {
    await browser.close();
  }
});

// Theme files only recolour; code in headings and tables stays unboxed in all of them.
test("themes: inline code in headings and tables has no background", async () => {
  const puppeteer = require("puppeteer");
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });

  try {
    for (const suffix of ["", "-night", "-mono"]) {
      const css = ["", ...(suffix ? [suffix] : [])].map((part) =>
        fs.readFileSync(path.join(root, `academic-markdown${part}.css`), "utf8"),
      );
      const page = await browser.newPage();

      await page.setContent(`<style>${css.join("\n")}</style><h2><code id="h">c</code></h2><table><tr><td><code id="t">c</code></td></tr></table><p><code id="p">c</code></p>`);
      const colors = await page.evaluate(() =>
        ["h", "t", "p"].map((id) => getComputedStyle(document.getElementById(id)).backgroundColor),
      );

      assert.equal(colors[0], "rgba(0, 0, 0, 0)", `heading code in theme "${suffix || "light"}"`);
      assert.equal(colors[1], "rgba(0, 0, 0, 0)", `table code in theme "${suffix || "light"}"`);
      assert.notEqual(colors[2], "rgba(0, 0, 0, 0)", `paragraph code in theme "${suffix || "light"}"`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
