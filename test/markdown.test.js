const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Marked } = require("marked");

const config = require("../md-to-pdf.config.js");

const marked = new Marked().use(...config.marked_extensions);

const html = (markdown) => marked.parse(markdown).trim();

const EMPHASIS_CASES = [
  ["closing bracket before CJK text", "**内部传感器（位形检测）**检测机器人", "内部传感器（位形检测）"],
  ["curly quotes around the span", "旁标了**“误差增大”**：预测", "“误差增大”"],
  ["full stop before CJK text", "**权重就越小。**与第 4 讲", "权重就越小。"],
  ["opening full-width bracket", "前文**（说明）正文**后文", "（说明）正文"],
  ["corner brackets", "见**「方法」**一节", "「方法」"],
  ["question mark before CJK text", "他问**为什么？**然后离开", "为什么？"],
  ["percent before a full-width comma", "概率 **68%**，对应 **95%**", "68%"],
  ["code span as the whole span", "定义 **`F_x`**（第 3 行）", "<code>F_x</code>"],
  ["code span at the end", "**第 1 步：更新 `s_{t-1}`**（第 13 页）", "第 1 步：更新 <code>s_{t-1}</code>"],
  ["ASCII call before a colon", "**atan2(y, x)**：反三角函数", "atan2(y, x)"],
];

for (const [name, markdown, strong] of EMPHASIS_CASES) {
  test(`CJK emphasis: ${name}`, () => {
    const output = html(markdown);

    assert.ok(output.includes(`<strong>${strong}</strong>`), output);
    assert.ok(!output.includes("**"), output);
    assert.ok(!output.includes("\u2060"), "no invisible characters are inserted");
  });
}

test("CJK emphasis leaves a spaced ** operator alone", () => {
  assert.equal(html("计算 2 ** 3 ** 4 的结果。"), "<p>计算 2 ** 3 ** 4 的结果。</p>");
});

test("CJK emphasis does not pair markers across paragraphs", () => {
  assert.equal(html("x ** y\n\n**粗体**文本"), "<p>x ** y</p>\n<p><strong>粗体</strong>文本</p>");
});

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

test("maths: dollar amounts stay text", () => {
  for (const markdown of ["价格 $5 和 $10。", "成本为 $5，利润 $10。", "价格 \\$5 和 \\$10。"]) {
    const output = html(markdown);

    assert.ok(!output.includes("katex"), output);
    assert.ok(output.includes("$5"), output);
  }
});

test("maths: a formula needs a space before the opening dollar sign", () => {
  assert.ok(!html("设$a$为常数").includes("katex"));
  assert.match(html("设 $a$ 为常数"), /class="katex"/);
});

test("code blocks: an info string cannot add attributes", () => {
  const output = html('```js"onmouseover="x\ncode\n```');

  assert.ok(!output.includes("onmouseover"), output);
  assert.match(output, /<code class="hljs">/);
});
