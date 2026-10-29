const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { parseArgs } = require("util");

const config = require("../md-to-pdf.config.js");

const PT_PER_MM = 72 / 25.4;

const USAGE = `Usage: node scripts/verify.js [options] <file.pdf|directory>...

Checks that each PDF is safe to print: no Type 3 fonts, no literal "**" left
over from Markdown emphasis, and no blank pages. A directory stands for the
*.pdf files directly inside it. Requires poppler (pdfinfo, pdffonts, pdftotext).

Options:
  --expect-katex     also require at least one embedded KaTeX font
  --allow-asterisks  accept "**" in the text, for documents that show Markdown syntax
  -h, --help         show this help
`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function poppler(tool, args) {
  try {
    return execFileSync(tool, args, {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(`${tool} not found; install poppler-utils`);
    const lines = String(error.stderr || error.message).trim().split("\n");
    throw new Error(`${tool} failed: ${lines[lines.length - 1]}`);
  }
}

function parsePageInfo(output) {
  const size = output.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m);

  return {
    pages: Number((output.match(/^Pages:\s+(\d+)/m) || [])[1] || 0),
    width: size ? Number(size[1]) : 0,
    height: size ? Number(size[2]) : 0,
  };
}

function parseFonts(output) {
  // The first two lines are the column header and its underline.
  const rows = output.split("\n").slice(2).filter((row) => row.trim());

  return {
    type3: rows.filter((row) => /\sType 3\s/.test(row)).length,
    katex: rows.filter((row) => row.split(/\s+/)[0].includes("KaTeX_")).length,
  };
}

// pdftotext separates pages with a form feed.
function findLiteralMarkers(text) {
  return text.split("\f").flatMap((page, index) => (page.includes("**") ? [index + 1] : []));
}

// A page is blank when no text sits inside the margins; the running header and
// footer live in the margins, so cropping to the content box excludes them.
function findBlankPages(file, { pages, width, height }) {
  const { margin } = config.pdf_options;
  const [top, right, bottom, left] = [margin.top, margin.right, margin.bottom, margin.left].map(
    (value) => parseFloat(value) * PT_PER_MM,
  );
  const [x, y, w, h] = [left, top, width - left - right, height - top - bottom].map((value) =>
    String(Math.round(value)),
  );
  const blank = [];

  for (let page = 1; page <= pages; page++) {
    const range = String(page);
    const text = poppler("pdftotext", ["-f", range, "-l", range, "-x", x, "-y", y, "-W", w, "-H", h, file, "-"]);
    if (!text.trim()) blank.push(page);
  }

  return blank;
}

function inspectPdf(file, { expectKatex = false, allowAsterisks = false } = {}) {
  let info;
  let fonts;
  let markerPages;
  let blankPages;

  try {
    info = parsePageInfo(poppler("pdfinfo", [file]));
    fonts = parseFonts(poppler("pdffonts", [file]));
    markerPages = findLiteralMarkers(poppler("pdftotext", [file, "-"]));
    blankPages = findBlankPages(file, info);
  } catch (error) {
    return { file, problems: [`cannot inspect PDF: ${error.message}`] };
  }

  const problems = [];
  if (!info.pages) problems.push("no pages");
  if (fonts.type3) problems.push(`${fonts.type3} Type 3 fonts`);
  if (markerPages.length && !allowAsterisks) problems.push(`literal ** on page(s) ${markerPages.join(", ")}`);
  if (blankPages.length) problems.push(`blank page(s) ${blankPages.join(", ")}`);
  if (expectKatex && !fonts.katex) problems.push("no KaTeX fonts embedded");

  return { file, pages: info.pages, fonts, problems };
}

function displayName(file) {
  const relative = path.relative(process.cwd(), file);
  return relative.startsWith("..") ? file : relative;
}

function collectPdfs(inputs) {
  const files = [];

  for (const input of inputs) {
    const resolved = path.resolve(input);
    if (!fs.existsSync(resolved)) fail(`No such file or directory: ${input}`);

    if (fs.statSync(resolved).isDirectory()) {
      const names = fs.readdirSync(resolved).filter((name) => name.endsWith(".pdf")).sort();
      files.push(...names.map((name) => path.join(resolved, name)));
    } else {
      files.push(resolved);
    }
  }

  return files;
}

function main() {
  const { values, positionals } = parseArgs({
    options: {
      "expect-katex": { type: "boolean" },
      "allow-asterisks": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }
  if (!positionals.length) fail(USAGE);

  const files = collectPdfs(positionals);
  if (!files.length) fail("No PDF files found.");

  for (const file of files) {
    const { pages, fonts, problems } = inspectPdf(file, {
      expectKatex: values["expect-katex"],
      allowAsterisks: values["allow-asterisks"],
    });
    const name = displayName(file);

    if (problems.length) {
      process.exitCode = 1;
      console.log(`FAIL  ${name}`);
      problems.forEach((problem) => console.log(`        - ${problem}`));
    } else {
      console.log(`PASS  ${name}  ${pages} pages, ${fonts.katex} KaTeX fonts`);
    }
  }
}

if (require.main === module) main();

module.exports = { parsePageInfo, parseFonts, findLiteralMarkers, inspectPdf };
