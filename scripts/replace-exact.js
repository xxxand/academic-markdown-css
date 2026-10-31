// String.prototype.replace silently does nothing when the text is absent; the
// example builds must fail instead of shipping another theme's wording.
function replaceExact(text, replacements) {
  return replacements.reduce((result, [search, replacement]) => {
    if (!result.includes(search)) throw new Error(`example.md no longer contains: ${search}`);
    return result.replace(search, replacement);
  }, text);
}

module.exports = { replaceExact };
