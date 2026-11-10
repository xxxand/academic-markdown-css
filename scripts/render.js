const fs = require("fs");
const path = require("path");
const { parseArgs } = require("util");
const matter = require("gray-matter");
const { findFootnoteProblems } = require("./check-footnotes.js");

const THEMES = ["light", "night", "mono"];

const USAGE = `Usage: node scripts/render.js [options] <file.md|directory>...

Renders each Markdown file to an A4 PDF. A directory stands for the *.md files
directly inside it.

Options:
  --theme <light|night|mono>  colour theme (default: light)
  --outdir <dir>              write PDFs here instead of next to each source
  --basedir <dir>             serve relative assets from this directory; it must
                              contain every input (default: each file's own folder)
  -h, --help                  show this help

Per document:
  Footnote problems (undefined or unused notes, <sup>1</sup> used as a note)
  are printed as warnings and do not stop the render.
  report.css next to report.md is added after the theme's stylesheets.
  header_label in the front matter replaces the label at the right of the
  running header (MD_HEADER_LABEL sets it for every document).
`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function collectFiles(inputs) {
  const files = [];

  for (const input of inputs) {
    const resolved = path.resolve(input);
    if (!fs.existsSync(resolved)) fail(`No such file or directory: ${input}`);

    if (fs.statSync(resolved).isDirectory()) {
      const names = fs
        .readdirSync(resolved, { withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.md$/i.test(entry.name))
        .map((entry) => entry.name)
        .sort();
      files.push(...names.map((name) => path.join(resolved, name)));
    } else {
      files.push(resolved);
    }
  }

  return files;
}

function isInside(directory, file) {
  const relative = path.relative(directory, file);
  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function planJobs(files, { outdir, basedir }) {
  const destinations = new Map();

  return files.map((file) => {
    const name = `${path.basename(file, path.extname(file))}.pdf`;
    const dest = outdir ? path.join(outdir, name) : path.join(path.dirname(file), name);
    const fileBasedir = basedir || path.dirname(file);

    if (!isInside(fileBasedir, file)) fail(`${file} is outside --basedir ${fileBasedir}`);
    if (destinations.has(dest)) fail(`${file} and ${destinations.get(dest)} would both write ${dest}`);
    destinations.set(dest, file);

    return { file, dest, basedir: fileBasedir };
  });
}

// md-to-pdf reads the front matter itself, but only this script can use it to
// choose the header template. The JS front-matter engine stays disabled, as in
// md-to-pdf, so rendering a document never runs code from it.
const FRONT_MATTER_OPTIONS = { engines: { javascript: () => new Error("The JS front-matter engine is disabled.") } };

function warnAboutFootnotes(file) {
  for (const { line, message } of findFootnoteProblems(fs.readFileSync(file, "utf8"))) {
    console.warn(`warning: ${file}:${line}: ${message}`);
  }
}

function documentConfig(config, file) {
  const overrides = {};
  const stylesheet = path.join(path.dirname(file), `${path.basename(file, path.extname(file))}.css`);
  if (fs.existsSync(stylesheet)) overrides.stylesheet = [...config.stylesheet, stylesheet];

  const label = matter.read(file, FRONT_MATTER_OPTIONS).data.header_label;
  if (typeof label === "string" || typeof label === "number") {
    overrides.pdf_options = { ...config.pdf_options, headerTemplate: config.buildHeaderTemplate(String(label)) };
  }

  return overrides;
}

(async () => {
  const { values, positionals } = parseArgs({
    options: {
      theme: { type: "string", default: "light" },
      outdir: { type: "string" },
      basedir: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }
  if (!positionals.length) fail(USAGE);
  if (!THEMES.includes(values.theme)) fail(`Unknown theme "${values.theme}"; use ${THEMES.join(", ")}.`);

  const files = collectFiles(positionals);
  if (!files.length) fail("No Markdown files found.");

  const jobs = planJobs(files, {
    outdir: values.outdir && path.resolve(values.outdir),
    basedir: values.basedir && path.resolve(values.basedir),
  });

  // The config reads MD_THEME when it is loaded, so set it first.
  process.env.MD_THEME = values.theme;
  const { mdToPdf } = require("md-to-pdf");
  const { marked, getDefaults } = require("marked");
  const config = require("../md-to-pdf.config.js");

  if (values.outdir) fs.mkdirSync(path.resolve(values.outdir), { recursive: true });

  const failed = [];
  for (const { file, dest, basedir } of jobs) {
    warnAboutFootnotes(file);
    try {
      // md-to-pdf registers the extensions on the global marked on every call;
      // start each file from a clean instance so they are not stacked.
      marked.setOptions(getDefaults());
      await mdToPdf({ path: file }, { ...config, ...documentConfig(config, file), basedir, dest });
      console.log(`wrote ${isInside(process.cwd(), dest) ? path.relative(process.cwd(), dest) : dest}`);
    } catch (error) {
      failed.push(file);
      console.error(`failed ${file}: ${error.message}`);
    }
  }

  if (failed.length) console.error(`${failed.length} of ${jobs.length} files failed.`);

  // md-to-pdf leaves its static server (and possibly the browser) open when a
  // conversion throws, which would keep the process alive after a failure.
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
