const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const root = path.resolve(__dirname, "..");
const run = (script, args, options) =>
  spawnSync(process.execPath, [path.join(root, "scripts", script), ...args], {
    cwd: root,
    encoding: "utf8",
    ...options,
  });

// These cases are rejected while validating arguments, before a browser starts.
const REJECTED = [
  ["render.js", ["--theme", "neon", "example.md"], /Unknown theme "neon"/],
  ["render.js", ["no-such-file.md"], /No such file or directory/],
  ["render.js", ["--basedir", "assets", "example.md"], /is outside --basedir/],
  ["render.js", [], /Usage:/],
  ["verify.js", ["no-such-file.pdf"], /No such file or directory/],
  ["verify.js", [], /Usage:/],
];

for (const [script, args, message] of REJECTED) {
  test(`${script} ${args.join(" ") || "(no arguments)"} exits with an error`, () => {
    const result = run(script, args);

    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
  });
}

test("render.js refuses two inputs that would write the same PDF", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "academic-markdown-"));

  try {
    const inputs = ["a", "b"].map((name) => path.join(directory, name, "same.md"));
    for (const input of inputs) {
      fs.mkdirSync(path.dirname(input));
      fs.writeFileSync(input, "# x\n");
    }
    const outdir = path.join(directory, "out");
    const result = run("render.js", ["--outdir", outdir, ...inputs]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /would both write/);
    assert.ok(!fs.existsSync(outdir));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

// md-to-pdf leaves its static server open when a conversion throws, so without
// an explicit exit the process would hang after reporting the failure. The
// timeout turns such a hang into a failed assertion instead of a stuck test run.
test("render.js exits with an error when the browser cannot start", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "academic-markdown-"));

  try {
    const result = run("render.js", ["--outdir", directory, "test/fixtures/katex.md"], {
      env: { ...process.env, PUPPETEER_EXECUTABLE_PATH: path.join(directory, "no-such-chrome") },
      timeout: 20000,
    });

    assert.equal(result.status, 1, `signal: ${result.signal}`);
    assert.match(result.stderr, /failed .*katex\.md/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("render.js warns about footnote problems before rendering", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "academic-markdown-"));

  try {
    const input = path.join(directory, "note.md");
    fs.writeFileSync(input, "# x\n\n正文[^missing]。\n\n[^unused]: 说明。\n");
    const result = run("render.js", ["--outdir", directory, input], {
      env: { ...process.env, PUPPETEER_EXECUTABLE_PATH: path.join(directory, "no-such-chrome") },
      timeout: 20000,
    });

    assert.match(result.stderr, /warning: .*note\.md:3: footnote \[\^missing\] is referenced but never defined/);
    assert.match(result.stderr, /warning: .*note\.md:5: footnote \[\^unused\] is defined but never referenced/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("the config rejects an unknown MD_THEME", () => {
  const result = spawnSync(process.execPath, ["-e", 'require("./md-to-pdf.config.js")'], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, MD_THEME: "nigth" },
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown MD_THEME "nigth"/);
});

const headerTemplate = (label) => {
  const env = { ...process.env };
  delete env.MD_HEADER_LABEL;
  if (label !== undefined) env.MD_HEADER_LABEL = label;

  return spawnSync(process.execPath, ["-e", 'console.log(require("./md-to-pdf.config.js").pdf_options.headerTemplate)'], {
    cwd: root,
    encoding: "utf8",
    env,
  }).stdout;
};

test("MD_HEADER_LABEL sets the header label and an empty value hides it", () => {
  assert.match(headerTemplate(), /<span class="rhs">ACADEMIC NOTES<\/span>/);
  assert.match(headerTemplate("机器人学"), /<span class="rhs">机器人学<\/span>/);
  assert.match(headerTemplate(""), /<span class="rhs"><\/span>/);
});

test("buildHeaderTemplate escapes the label", () => {
  const { buildHeaderTemplate } = require("../md-to-pdf.config.js");

  assert.match(buildHeaderTemplate("A&B <C>"), /<span class="rhs">A&amp;B &lt;C&gt;<\/span>/);
});
