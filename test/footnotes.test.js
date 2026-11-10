const assert = require("node:assert/strict");
const { test } = require("node:test");

const { findFootnoteProblems } = require("../scripts/check-footnotes.js");

const messages = (markdown) => findFootnoteProblems(markdown).map(({ line, message }) => `${line}: ${message}`);

test("paired references and definitions raise nothing", () => {
  assert.deepEqual(messages("正文[^a]，再引用[^中文]。\n\n[^a]: 注 A。\n\n    续段。\n[^中文]: 注 B，引用[^a]。\n"), []);
});

test("an undefined reference is reported at its first use", () => {
  assert.deepEqual(messages("甲[^x]。\n\n乙[^x]。\n"), ["1: footnote [^x] is referenced but never defined"]);
});

test("an unused definition is reported", () => {
  assert.deepEqual(messages("正文。\n\n[^a]: 没人引用。\n"), ["3: footnote [^a] is defined but never referenced"]);
});

test("a duplicated label is reported on the second definition", () => {
  assert.deepEqual(messages("正文[^a]。\n\n[^a]: 一。\n[^a]: 二。\n"), ["4: footnote [^a] is defined more than once (first on line 3)"]);
});

test("<sup>number</sup> as a note marker is reported, while exponents are not", () => {
  const problems = messages("知识。<sup>1</sup>\n\n<sup>1</sup> 说明文字。\n\n单位 m<sup>2</sup> 与 10<sup>3</sup>。\n");

  assert.equal(problems.length, 2);
  assert.match(problems[0], /^1: <sup>number<\/sup>/);
  assert.match(problems[1], /^3: <sup>number<\/sup>/);
});

test("code blocks, inline code and front matter are ignored", () => {
  const markdown = "---\ntitle: [^f]\n---\n\n```md\n[^a]\n<sup>1</sup>\n```\n\n行内 `[^b]` 与 ~~~\n\n~~~\n[^c]: x\n~~~\n";

  assert.deepEqual(messages(markdown), []);
});
