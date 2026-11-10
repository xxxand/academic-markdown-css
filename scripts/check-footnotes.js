// Footnote problems that do not fail a conversion: marked-footnote prints an
// undefined reference as literal text and drops an unused definition, so the
// PDF looks fine unless someone reads it. render.js prints these as warnings.

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const DEFINITION = /^ {0,3}\[\^([^\]\s]+)\]:/;
const REFERENCE = /\[\^([^\]\s]+)\](?!:)/g;
const SUP_NUMBER = /(^\s*|[。！？；.!?])<sup>\s*\d+\s*<\/sup>/;

function stripFrontMatter(markdown) {
  const match = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return match ? markdown.slice(0, match[0].length).replace(/[^\n]/g, "") + markdown.slice(match[0].length) : markdown;
}

function findFootnoteProblems(markdown) {
  const definitions = new Map();
  const references = new Map();
  const problems = [];
  let fence = null;

  stripFrontMatter(markdown)
    .split(/\r?\n/)
    .forEach((rawLine, index) => {
      const line = index + 1;
      const opening = rawLine.match(FENCE);

      if (fence) {
        if (opening && opening[1][0] === fence[0] && opening[1].length >= fence.length && rawLine.trim() === opening[1]) fence = null;
        return;
      }
      if (opening) {
        fence = opening[1];
        return;
      }

      const text = rawLine.replace(/(`+).*?\1/g, "");
      const definition = text.match(DEFINITION);
      if (definition) {
        const label = definition[1];
        if (definitions.has(label)) problems.push({ line, message: `footnote [^${label}] is defined more than once (first on line ${definitions.get(label)})` });
        else definitions.set(label, line);
      }

      for (const [, label] of text.replace(DEFINITION, "").matchAll(REFERENCE)) {
        if (!references.has(label)) references.set(label, line);
      }

      if (SUP_NUMBER.test(text)) {
        problems.push({ line, message: "<sup>number</sup> is plain text, not a footnote; write [^label] and a [^label]: definition" });
      }
    });

  for (const [label, line] of references) {
    if (!definitions.has(label)) problems.push({ line, message: `footnote [^${label}] is referenced but never defined` });
  }
  for (const [label, line] of definitions) {
    if (!references.has(label)) problems.push({ line, message: `footnote [^${label}] is defined but never referenced` });
  }

  return problems.sort((a, b) => a.line - b.line);
}

module.exports = { findFootnoteProblems };
