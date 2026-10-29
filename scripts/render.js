const fs = require("fs");
const path = require("path");
const { parseArgs } = require("util");

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
      const names = fs.readdirSync(resolved).filter((name) => name.endsWith(".md")).sort();
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
  const config = require("../md-to-pdf.config.js");

  if (values.outdir) fs.mkdirSync(path.resolve(values.outdir), { recursive: true });

  const failed = [];
  for (const { file, dest, basedir } of jobs) {
    try {
      await mdToPdf({ path: file }, { ...config, basedir, dest });
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
