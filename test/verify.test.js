const assert = require("node:assert/strict");
const { test } = require("node:test");

const { parsePageInfo, parseFonts, findLiteralMarkers } = require("../scripts/verify.js");

const FONT_HEADER = `name                                 type              encoding         emb sub uni object ID
------------------------------------ ----------------- ---------------- --- --- --- ---------
`;

test("parseFonts counts Type 3 and KaTeX fonts", () => {
  const output = `${FONT_HEADER}AAAAAA+NotoSerifSC-Bold              CID TrueType      Identity-H       yes yes yes      4  0
BAAAAA+KaTeX_Math-Italic             CID TrueType      Identity-H       yes yes yes     34  0
CAAAAA+KaTeX_Main-Regular            CID TrueType      Identity-H       yes yes yes     35  0
DAAAAA+NotoSerifCJKsc-Regular        Type 3            Custom           yes no  no      36  0
`;

  assert.deepEqual(parseFonts(output), { type3: 1, katex: 2 });
});

test("parseFonts accepts a PDF without fonts", () => {
  assert.deepEqual(parseFonts(FONT_HEADER), { type3: 0, katex: 0 });
});

test("parsePageInfo reads the page count and size", () => {
  const output = `Title:           Example
Pages:           8
Page size:       595.92 x 841.92 pts (A4)
`;

  assert.deepEqual(parsePageInfo(output), { pages: 8, width: 595.92, height: 841.92 });
});

test("findLiteralMarkers reports the pages that contain **", () => {
  assert.deepEqual(findLiteralMarkers("clean\fprinted **bold**\fclean\f**\f"), [2, 4]);
  assert.deepEqual(findLiteralMarkers("clean\fclean\f"), []);
});
