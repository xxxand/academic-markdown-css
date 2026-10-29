const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Marked } = require("marked");

const config = require("../md-to-pdf.config.js");

const marked = new Marked().use(...config.marked_extensions);
const preprocess = config.marked_extensions.find((extension) => extension.hooks).hooks.preprocess;

// The word joiners inserted by the preprocess hook are invisible; drop them so
// expectations can be written the way the text reads.
const html = (markdown) => marked.parse(markdown).replace(/\u2060/g, "").trim();

// marked 18 still leaves the ** in place for these; the preprocess hook fixes them.
const HOOK_CASES = [
  ["closing bracket before CJK text", "**内部传感器（位形检测）**检测机器人", "内部传感器（位形检测）"],
  ["curly quotes around the span", "旁标了**“误差增大”**：预测", "“误差增大”"],
  ["full stop before CJK text", "**权重就越小。**与第 4 讲", "权重就越小。"],
  ["opening full-width bracket", "前文**（说明）正文**后文", "（说明）正文"],
  ["corner brackets", "见**「方法」**一节", "「方法」"],
  ["question mark before CJK text", "他问**为什么？**然后离开", "为什么？"],
];

// marked 4.x printed the ** for these; marked 18 parses them, so they guard the
// pinned version.
const VERSION_CASES = [
  ["percent before a full-width comma", "概率 **68%**，对应 **95%**", "68%"],
  ["code span as the whole span", "定义 **`F_x`**（第 3 行）", "<code>F_x</code>"],
  ["code span at the end", "**第 1 步：更新 `s_{t-1}`**（第 13 页）", "第 1 步：更新 <code>s_{t-1}</code>"],
  ["ASCII call before a colon", "**atan2(y, x)**：反三角函数", "atan2(y, x)"],
];

const EMPHASIS_CASES = [...HOOK_CASES, ...VERSION_CASES];

for (const [name, markdown, strong] of EMPHASIS_CASES) {
  test(`CJK emphasis: ${name}`, () => {
    const output = html(markdown);

    assert.ok(output.includes(`<strong>${strong}</strong>`), output);
    assert.ok(!output.includes("**"), output);
    assert.equal(preprocess(markdown).replace(/\u2060/g, ""), markdown);
  });
}

const UNTOUCHED = [
  ["inline code", "示例 `**（x）**y` 结束"],
  ["fenced code", "```\n**（x）**后文\n```"],
  ["display maths", "$$\na ** （b） ** c\n$$"],
  ["inline maths", "公式 $a**（b）**c$ 后文"],
  ["escaped asterisks", "\\**（x）**后文"],
  ["unclosed marker", "**未闭合（说明）后文"],
];

for (const [name, markdown] of UNTOUCHED) {
  test(`CJK emphasis leaves ${name} unchanged`, () => {
    assert.equal(preprocess(markdown), markdown);
  });
}

test("code blocks keep highlight.js classes", () => {
  const output = html("```python\ndef f():\n    return 1\n```");

  assert.match(output, /<code class="hljs language-python">/);
  assert.match(output, /<span class="hljs-keyword">def<\/span>/);
});

test("mermaid fences become mermaid containers", () => {
  assert.equal(
    html("```mermaid\nflowchart LR\n  A --> B\n```"),
    '<pre class="mermaid">flowchart LR\n  A --&gt; B</pre>',
  );
});

test("alerts render with a typed title", () => {
  const output = html("> [!WARNING]\n> 小心。");

  assert.match(output, /<div class="alert alert-warning">/);
  assert.match(output, /<p class="alert-title">警告 WARNING<\/p>/);
});

test("maths renders through KaTeX", () => {
  assert.match(html("行内 $E = mc^2$ 公式"), /class="katex"/);
});
