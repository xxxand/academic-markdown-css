const pairs = [
  ["body text", "#e8f0f4", "#0b1b23", 4.5],
  ["muted text", "#a8c0cc", "#0b1b23", 4.5],
  ["links", "#8ecae6", "#0b1b23", 4.5],
  ["code comment", "#a8c0cc", "#0f222b", 4.5],
  ["code keyword", "#8ecae6", "#0f222b", 4.5],
  ["code string", "#9ed8c8", "#0f222b", 4.5],
  ["code number", "#f2c7a2", "#0f222b", 4.5],
  ["note title", "#8ecae6", "#102b37", 4.5],
  ["note body", "#e8f0f4", "#102b37", 4.5],
  ["tip title", "#9ed8c8", "#0f2b2a", 4.5],
  ["important title", "#f2c7a2", "#2a1a20", 4.5],
  ["warning title", "#f5c77e", "#2b2417", 4.5],
  ["caution title", "#ff9aa8", "#2a1a20", 4.5],
  ["diff addition", "#9ed8c8", "#102b26", 4.5],
  ["diff deletion", "#ff9aa8", "#2a1a20", 4.5],
  ["borders", "#4f6b78", "#0b1b23", 3],
  ["link underline", "#6f8b98", "#0b1b23", 3],
];

function luminance(hex) {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((index) =>
    parseInt(value.slice(index, index + 2), 16) / 255,
  );

  const linear = channels.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4),
  );

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort(
    (x, y) => y - x,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

let failed = false;

for (const [name, foreground, background, minimum] of pairs) {
  const ratio = contrast(foreground, background);
  const passed = ratio >= minimum;
  failed ||= !passed;
  console.log(
    `${passed ? "PASS" : "FAIL"}  ${name.padEnd(18)} ${ratio.toFixed(2)}:1 (min ${minimum}:1)`,
  );
}

if (failed) {
  process.exitCode = 1;
}
