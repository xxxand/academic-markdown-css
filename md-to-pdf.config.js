const fs = require("fs");
const path = require("path");
const markedKatex = require("marked-katex-extension");

const KATEX_DIR = path.dirname(require.resolve("katex"));
const KATEX_CSS_PATH = path.join(KATEX_DIR, "katex.min.css");
const KATEX_FONTS_DIR = path.join(KATEX_DIR, "fonts");
const KATEX_FONTS_URL = "/" + path.relative(process.cwd(), KATEX_FONTS_DIR).split(path.sep).join("/");

// KaTeX's stylesheet references its fonts relative to the CSS file. The PDF
// page is served from the project root, so rewrite those URLs for the local
// file server instead of relying on a CDN.
const katexCss = fs
  .readFileSync(KATEX_CSS_PATH, "utf8")
  .replace(/url\((["']?)fonts\//g, (match, quote) => `url(${quote}${KATEX_FONTS_URL}/`);

const MERMAID_BUNDLE = require.resolve("mermaid/dist/mermaid.min.js");
const ALERT_LABELS = {
  NOTE: "说明 NOTE",
  TIP: "提示 TIP",
  IMPORTANT: "重要 IMPORTANT",
  WARNING: "警告 WARNING",
  CAUTION: "小心 CAUTION",
};
const ALERT_PATTERN = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Turn ```mermaid fences into containers that the browser-side Mermaid
// runtime can replace with SVG. The code is escaped so it is treated as text
// until Mermaid reads it back.
const mermaidExtension = {
  renderer: {
    code(code, infostring) {
      const language = (infostring || "").trim().split(/\s+/)[0].toLowerCase();
      if (language !== "mermaid") return false;

      return `<pre class="mermaid">${escapeHtml(code)}</pre>\n`;
    },
  },
};

// GitHub-flavored alerts: a blockquote whose first line is [!NOTE], [!TIP],
// [!IMPORTANT], [!WARNING], or [!CAUTION].
const alertsExtension = {
  walkTokens(token) {
    if (token.type !== "blockquote") return;

    const paragraph = token.tokens && token.tokens[0];
    if (!paragraph || paragraph.type !== "paragraph") return;

    const match = paragraph.text.match(ALERT_PATTERN);
    if (!match) return;

    const type = match[1].toUpperCase();
    const inline = paragraph.tokens && paragraph.tokens[0];

    if (inline) {
      if (typeof inline.raw === "string") {
        inline.raw = inline.raw.replace(ALERT_PATTERN, "");
      }
      if (typeof inline.text === "string") {
        inline.text = inline.text.replace(ALERT_PATTERN, "");
      }

      if (
        (!inline.text || !inline.text.trim()) &&
        paragraph.tokens[1] &&
        paragraph.tokens[1].type === "br"
      ) {
        paragraph.tokens.splice(1, 1);
      }
    }

    paragraph.raw = paragraph.raw.replace(ALERT_PATTERN, "");
    paragraph.text = paragraph.text.replace(ALERT_PATTERN, "");
    if (!paragraph.text.trim()) token.tokens.shift();

    token.type = "alert";
    token.alertType = type;
  },

  extensions: [
    {
      name: "alert",
      level: "block",
      renderer(token) {
        const type = token.alertType;
        return `<div class="alert alert-${type.toLowerCase()}">
<p class="alert-title">${ALERT_LABELS[type]}</p>
${this.parser.parse(token.tokens)}
</div>
`;
      },
    },
  ],
};

// A module script with top-level await is injected through a data URL. This
// makes Puppeteer's addScriptTag wait for Mermaid (and KaTeX fonts) before the
// PDF is printed.
const mermaidRuntime = `
  await document.fonts.ready;

  var blocks = document.querySelectorAll("pre.mermaid");
  if (blocks.length) {
    try {
      if (!window.mermaid) throw new Error("Mermaid 脚本未加载");

      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "neutral",
        fontFamily: '"Noto Sans CJK SC", "Noto Serif CJK SC", sans-serif',
        themeVariables: {
          fontFamily: '"Noto Sans CJK SC", "Noto Serif CJK SC", sans-serif',
          primaryColor: "#132a34",
          primaryTextColor: "#e8f0f4",
          primaryBorderColor: "#8ecae6",
          mainBkg: "#132a34",
          nodeBorder: "#8ecae6",
          nodeTextColor: "#e8f0f4",
          textColor: "#e8f0f4",
          lineColor: "#8ecae6",
          secondaryColor: "#0f222b",
          tertiaryColor: "#0b1b23",
          clusterBkg: "#102631",
          clusterBorder: "#6f8b98",
          edgeLabelBackground: "#0b1b23",
          actorBkg: "#132a34",
          actorBorder: "#8ecae6",
          actorTextColor: "#e8f0f4",
          signalColor: "#8ecae6",
          signalTextColor: "#e8f0f4",
          labelBoxBkgColor: "#102631",
          labelBoxBorderColor: "#6f8b98",
          labelTextColor: "#e8f0f4"
        },
        flowchart: {
          htmlLabels: false,
          useMaxWidth: true
        },
        sequence: {
          useMaxWidth: true
        }
      });

      await window.mermaid.run({ nodes: blocks });
      await document.fonts.ready;
    } catch (error) {
      blocks.forEach(function (block) {
        block.classList.add("mermaid-error");
        block.textContent = "Mermaid 渲染失败：" + (error && error.message ? error.message : String(error));
      });
    }
  }
`;
const mermaidRuntimeUrl =
  "data:text/javascript;base64," + Buffer.from(mermaidRuntime, "utf8").toString("base64");

// Generic configuration: works with any Markdown file in this project.
module.exports = {
  stylesheet: [
    path.resolve(__dirname, "academic-markdown.css"),
    path.resolve(__dirname, "academic-markdown-night.css"),
  ],
  css: katexCss,
  marked_extensions: [
    markedKatex({
      nonStandard: true,
      throwOnError: false,
      strict: "ignore",
    }),
    alertsExtension,
    mermaidExtension,
  ],
  script: [
    {
      content: `
        document.documentElement.lang = "zh-CN";

        var heading = document.querySelector("h1");
        if (!document.title) {
          document.title = heading
            ? heading.textContent.replace(/\\s+/g, " ").trim()
            : "Academic Notes";
        }

        document.querySelectorAll("details").forEach(function (details) {
          details.open = true;
          var summary = details.querySelector("summary");
          if (!summary) return;

          var walker = document.createTreeWalker(summary, NodeFilter.SHOW_TEXT);
          var nodes = [];
          while (walker.nextNode()) nodes.push(walker.currentNode);

          nodes.forEach(function (node) {
            var parts = node.nodeValue.split(/(\`[^\`]+\`)/g);
            if (parts.length === 1) return;

            var fragment = document.createDocumentFragment();
            parts.forEach(function (part) {
              if (part.length > 1 && part[0] === "\`" && part[part.length - 1] === "\`") {
                var code = document.createElement("code");
                code.textContent = part.slice(1, -1);
                fragment.appendChild(code);
              } else if (part) {
                fragment.appendChild(document.createTextNode(part));
              }
            });
            node.parentNode.replaceChild(fragment, node);
          });
        });
      `,
    },
    { path: MERMAID_BUNDLE },
    { type: "module", url: mermaidRuntimeUrl },
  ],
  pdf_options: {
    format: "A4",
    printBackground: true,
    outline: true,
    displayHeaderFooter: true,
    margin: {
      top: "24mm",
      right: "20mm",
      bottom: "22mm",
      left: "20mm",
    },
    headerTemplate: `
      <style>
        * { box-sizing: border-box; }
        .page-header {
          width: 100%;
          padding: 0 20mm;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 10mm;
          font-family: "Noto Serif CJK SC", serif;
          font-size: 7.8pt;
          line-height: 1.4;
          letter-spacing: 0.03em;
          color: #a8c0cc;
          background: #0b1b23;
          -webkit-print-color-adjust: exact;
        }
        .page-header .title {
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .page-header .rhs {
          flex: 0 0 auto;
          font-family: "Noto Sans CJK SC", sans-serif;
          font-size: 7.4pt;
          letter-spacing: 0.12em;
          color: #8ecae6;
        }
      </style>
      <div class="page-header">
        <span class="title"></span>
        <span class="rhs">ACADEMIC NOTES</span>
      </div>
    `,
    footerTemplate: `
      <style>
        * { box-sizing: border-box; }
        .page-footer {
          width: 100%;
          padding: 0 20mm;
          font-family: "Noto Serif CJK SC", serif;
          font-size: 7.8pt;
          line-height: 1.4;
          letter-spacing: 0.05em;
          color: #a8c0cc;
          background: #0b1b23;
          text-align: center;
          -webkit-print-color-adjust: exact;
        }
        .page-footer .slash { color: #4f6b78; }
      </style>
      <div class="page-footer">
        第 <span class="pageNumber"></span> 页
        <span class="slash">/</span>
        共 <span class="totalPages"></span> 页
      </div>
    `,
  },
};
