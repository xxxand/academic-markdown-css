const path = require("path");

// Generic configuration: works with any Markdown file in this project.
module.exports = {
  stylesheet: [path.resolve(__dirname, "academic-markdown.css")],
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
          color: #546072;
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
          color: #546072;
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
          color: #546072;
          text-align: center;
          -webkit-print-color-adjust: exact;
        }
        .page-footer .slash { color: #b5bdc8; }
      </style>
      <div class="page-footer">
        第 <span class="pageNumber"></span> 页
        <span class="slash">/</span>
        共 <span class="totalPages"></span> 页
      </div>
    `,
  },
};
