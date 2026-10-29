const fs = require("fs");
const path = require("path");
const hljs = require("highlight.js");
const markedKatex = require("marked-katex-extension");

const KATEX_DIR = path.dirname(require.resolve("katex"));
const KATEX_CSS_PATH = path.join(KATEX_DIR, "katex.min.css");

// KaTeX's stylesheet references its fonts relative to the CSS file. The PDF
// page is served from the configured basedir, which may not contain
// node_modules, so embed the woff2 files directly in the stylesheet.
const katexCss = fs.readFileSync(KATEX_CSS_PATH, "utf8").replace(/src:([^;}]+)(?=[;}])/g, (match, sources) => {
  const woff2 = sources.match(/url\((["']?)fonts\/([^)"']+\.woff2)\1\)/);
  if (!woff2) return match;

  const fontData = fs.readFileSync(path.join(KATEX_DIR, "fonts", woff2[2])).toString("base64");
  return `src:url(data:font/woff2;base64,${fontData}) format("woff2")`;
});

const PAGE = {
  width: 210,
  height: 297,
  margin: { top: 24, right: 20, bottom: 22, left: 20 },
};
const CONTENT_WIDTH_MM = PAGE.width - PAGE.margin.left - PAGE.margin.right;
const CONTENT_HEIGHT_PX = Math.round(((PAGE.height - PAGE.margin.top - PAGE.margin.bottom) / 25.4) * 96);
const HEADER_LABEL = process.env.MD_HEADER_LABEL || "ACADEMIC NOTES";

const SERIF_FONT = '"Noto Serif SC", "Noto Serif CJK SC", "Noto Sans", serif';
const SANS_FONT = '"Noto Sans SC", "Noto Sans CJK SC", "Noto Sans", sans-serif';
const DIAGRAM_FONT =
  '"Noto Sans SC", "Noto Sans CJK SC", "Noto Sans", "Noto Serif SC", "Noto Serif CJK SC", sans-serif';

const MERMAID_BUNDLE = require.resolve("mermaid/dist/mermaid.min.js");

const THEME = process.env.MD_THEME || "light";
const NIGHT = THEME === "night";
const MONO = THEME === "mono";
const PAGE_COLORS = NIGHT
  ? {
      headerText: "#a8c0cc",
      headerBg: "#0b1b23",
      headerAccent: "#8ecae6",
      footerText: "#a8c0cc",
      footerBg: "#0b1b23",
      footerSlash: "#4f6b78",
    }
  : MONO
    ? {
        headerText: "#333333",
        headerBg: "transparent",
        headerAccent: "#000000",
        footerText: "#333333",
        footerBg: "transparent",
        footerSlash: "#666666",
      }
    : {
        headerText: "#546072",
        headerBg: "transparent",
        headerAccent: "#546072",
        footerText: "#546072",
        footerBg: "transparent",
        footerSlash: "#8a949e",
      };
const MERMAID_VARIABLES = NIGHT
  ? {
      fontFamily: DIAGRAM_FONT,
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
      labelTextColor: "#e8f0f4",
    }
  : MONO
    ? {
        fontFamily: DIAGRAM_FONT,
        primaryColor: "#f2f2f2",
        primaryTextColor: "#111111",
        primaryBorderColor: "#000000",
        mainBkg: "#f2f2f2",
        nodeBorder: "#000000",
        nodeTextColor: "#111111",
        textColor: "#111111",
        lineColor: "#333333",
        secondaryColor: "#e8e8e8",
        tertiaryColor: "#ffffff",
        clusterBkg: "#f7f7f7",
        clusterBorder: "#888888",
        edgeLabelBackground: "#ffffff",
        actorBkg: "#f2f2f2",
        actorBorder: "#000000",
        actorTextColor: "#111111",
        signalColor: "#333333",
        signalTextColor: "#111111",
        labelBoxBkgColor: "#f2f2f2",
        labelBoxBorderColor: "#888888",
        labelTextColor: "#111111",
      }
    : {
        fontFamily: DIAGRAM_FONT,
        primaryColor: "#eceef1",
        primaryTextColor: "#232830",
        primaryBorderColor: "#546072",
        lineColor: "#546072",
        secondaryColor: "#f7f8f9",
        tertiaryColor: "#ffffff",
        clusterBkg: "#f7f8f9",
        clusterBorder: "#b5bdc8",
        edgeLabelBackground: "#ffffff",
      };
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

// CommonMark's emphasis rules do not treat full-width punctuation as a valid
// closing boundary in some CJK cases, e.g. **中文（说明）**后文. Insert a word
// joiner at the inner edge of the delimiter so marked can parse the strong
// span without changing the visible text. Code spans, fenced code blocks, and
// maths are protected first so their ** sequences are left untouched.
function fixCjkEmphasis(markdown) {
  const stash = [];
  const putAside = (value) => {
    const token = `\u0000CJK${stash.length}\u0000`;
    stash.push(value);
    return token;
  };
  let text = markdown;

  text = text.replace(/(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[^\n]*(?=\n|$)/g, (match) =>
    putAside(match),
  );
  text = text.replace(/(`+)([\s\S]*?)\1/g, (match) => putAside(match));
  text = text.replace(/\$\$[\s\S]*?\$\$/g, (match) => putAside(match));
  text = text.replace(/\$(?!\$)[^$\n]*?\$/g, (match) => putAside(match));

  let result = "";
  let cursor = 0;

  while (cursor < text.length) {
    const open = text.indexOf("**", cursor);
    if (open === -1) {
      result += text.slice(cursor);
      break;
    }

    if (
      (open > 0 && text[open - 1] === "\\") ||
      text[open + 2] === "*" ||
      text[open - 1] === "*"
    ) {
      result += text.slice(cursor, open + 2);
      cursor = open + 2;
      continue;
    }

    const close = text.indexOf("**", open + 2);
    if (close === -1) {
      result += text.slice(cursor);
      break;
    }

    if (text[close + 2] === "*") {
      result += text.slice(cursor, close + 2);
      cursor = close + 2;
      continue;
    }

    const inner = text.slice(open + 2, close);
    if (!inner.trim()) {
      result += text.slice(cursor, close + 2);
      cursor = close + 2;
      continue;
    }

    let fixedInner = inner;
    if (/^[\s“（【《「『‘〈〔［｛(\[]/.test(inner)) fixedInner = `\u2060${fixedInner}`;
    if (/[\s”’）】》」』〉〕］｝)\]。，、；：？！]$/.test(inner)) {
      fixedInner += "\u2060";
    }

    result += `${text.slice(cursor, open + 2)}${fixedInner}**`;
    cursor = close + 2;
  }

  return result.replace(/\u0000CJK(\d+)\u0000/g, (_, index) => stash[Number(index)]);
}

const cjkEmphasisExtension = {
  hooks: {
    preprocess: fixCjkEmphasis,
  },
};

// Render code blocks ourselves so marked 5+ no longer relies on the removed
// highlight/langPrefix options. Mermaid fences become containers that the
// browser-side runtime can replace with SVG.
const codeExtension = {
  renderer: {
    code({ text, lang }) {
      const language = (lang || "").trim().split(/\s+/)[0].toLowerCase();

      if (language === "mermaid") {
        return `<pre class="mermaid">${escapeHtml(text)}</pre>\n`;
      }

      const highlighted = hljs.getLanguage(language)
        ? hljs.highlight(text, { language }).value
        : hljs.highlight(text, { language: "plaintext" }).value;
      const className = language ? `hljs language-${language}` : "hljs";

      return `<pre><code class="${className}">${highlighted}</code></pre>\n`;
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
// PDF is printed. It also marks blocks that are tall enough to break across
// pages, measured at the final print content width.
const pageRuntime = `
  await document.fonts.ready;

  var blocks = document.querySelectorAll("pre.mermaid");
  if (blocks.length) {
    try {
      if (!window.mermaid) throw new Error("Mermaid 脚本未加载");

      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "neutral",
        fontFamily: ${JSON.stringify(DIAGRAM_FONT)},
        themeVariables: ${JSON.stringify(MERMAID_VARIABLES, null, 2)},
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

  var previousWidth = document.body.style.width;
  document.body.style.width = ${JSON.stringify(`${CONTENT_WIDTH_MM}mm`)};
  var pageHeight = ${CONTENT_HEIGHT_PX};

  document.querySelectorAll("pre:not(.mermaid), blockquote, table, details").forEach(function (element) {
    if (element.getBoundingClientRect().height > pageHeight * 0.4) {
      element.classList.add("may-break");
    }
  });

  document.body.style.width = previousWidth;
`;
const pageRuntimeUrl = "data:text/javascript;base64," + Buffer.from(pageRuntime, "utf8").toString("base64");

// Generic configuration: works with any Markdown file in this project.
module.exports = {
  stylesheet: [
    path.resolve(__dirname, "academic-markdown.css"),
    ...(NIGHT
      ? [path.resolve(__dirname, "academic-markdown-night.css")]
      : MONO
        ? [path.resolve(__dirname, "academic-markdown-mono.css")]
        : []),
  ],
  css: katexCss,
  page_media_type: "print",
  marked_extensions: [
    markedKatex({
      nonStandard: true,
      throwOnError: false,
      strict: "ignore",
    }),
    alertsExtension,
    codeExtension,
    cjkEmphasisExtension,
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

        var closingPunctuation = "）】，。、；：？！》」』”’";
        var textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
          acceptNode: function (node) {
            var parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest("pre, code, svg, script, style, textarea")) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        });
        var textNodes = [];
        while (textWalker.nextNode()) textNodes.push(textWalker.currentNode);

        var punctuationPattern = new RegExp("[ \\t]*([" + closingPunctuation + "])", "g");
        var inlineElements = /^(A|CODE|EM|STRONG|SPAN|MARK|KBD|SUB|SUP|DEL|S|INS)$/;

        textNodes.forEach(function (node) {
          if (node.nodeValue.indexOf("\u2060") !== -1) return;

          var previous = node.previousSibling;
          var afterInline = previous && previous.nodeType === Node.ELEMENT_NODE
            && inlineElements.test(previous.tagName);

          node.nodeValue = node.nodeValue.replace(punctuationPattern, function (match, closer, offset) {
            var hasSpace = match.length > closer.length;
            if (!hasSpace && !(offset === 0 && afterInline)) return match;
            return "\u2060" + closer;
          });
        });
      `,
    },
    { path: MERMAID_BUNDLE },
    { type: "module", url: pageRuntimeUrl },
  ],
  pdf_options: {
    format: "A4",
    printBackground: true,
    outline: true,
    displayHeaderFooter: true,
    margin: {
      top: `${PAGE.margin.top}mm`,
      right: `${PAGE.margin.right}mm`,
      bottom: `${PAGE.margin.bottom}mm`,
      left: `${PAGE.margin.left}mm`,
    },
    headerTemplate: `
      <style>
        * { box-sizing: border-box; }
        .page-header {
          width: 100%;
          padding: 0 ${PAGE.margin.right}mm 0 ${PAGE.margin.left}mm;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 10mm;
          font-family: ${SERIF_FONT};
          font-size: 7.8pt;
          line-height: 1.4;
          letter-spacing: 0.03em;
          color: ${PAGE_COLORS.headerText};
          background: ${PAGE_COLORS.headerBg};
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
          font-family: ${SANS_FONT};
          font-size: 7.4pt;
          letter-spacing: 0.12em;
          color: ${PAGE_COLORS.headerAccent};
        }
      </style>
      <div class="page-header">
        <span class="title"></span>
        <span class="rhs">${escapeHtml(HEADER_LABEL)}</span>
      </div>
    `,
    footerTemplate: `
      <style>
        * { box-sizing: border-box; }
        .page-footer {
          width: 100%;
          padding: 0 ${PAGE.margin.right}mm 0 ${PAGE.margin.left}mm;
          font-family: ${SERIF_FONT};
          font-size: 7.8pt;
          line-height: 1.4;
          letter-spacing: 0.05em;
          color: ${PAGE_COLORS.footerText};
          background: ${PAGE_COLORS.footerBg};
          text-align: center;
          -webkit-print-color-adjust: exact;
        }
        .page-footer .slash { color: ${PAGE_COLORS.footerSlash}; }
      </style>
      <div class="page-footer">
        第 <span class="pageNumber"></span> 页
        <span class="slash">/</span>
        共 <span class="totalPages"></span> 页
      </div>
    `,
  },
};
