# 架构说明

写给维护者：文件如何分工、数据如何流动，以及几个不显然的设计为什么这样做。使用方法见 [README](../README.md)。

## 数据流

```text
Markdown
  → gray-matter 拆出 frontmatter（document_title 等会覆盖配置）
  → marked + marked_extensions → HTML
  → Chromium 打开这份 HTML：注入样式表、KaTeX CSS 和三段脚本
  → page.pdf()：A4、页边距、页眉页脚模板、书签
```

流水线由 `md-to-pdf` 5.2.5 提供，本项目不 fork 它，只通过配置项接入：`stylesheet`、`css`、`script`、`marked_extensions`、`pdf_options`、`page_media_type`。

页面里按顺序执行三段脚本：

1. 普通脚本：设置 `lang`、补 `<title>`、展开 `<details>`、清理关闭标点前的空格。
2. Mermaid 打包文件。
3. 模块脚本（`pageRuntime`）：等字体就绪，渲染 Mermaid，再按打印版心宽度量高度，给过高的块加 `may-break`。

## 文件职责

| 文件 | 职责 |
|---|---|
| `md-to-pdf.config.js` | 流水线中心：marked 扩展、KaTeX 字体内联、页面脚本、`pdf_options`、页眉页脚，以及各主题的 `PAGE_COLORS` 和 `MERMAID_VARIABLES` |
| `md-to-pdf.night.config.js`、`md-to-pdf.mono.config.js` | 设置 `MD_THEME` 后重新导出基础配置 |
| `academic-markdown.css` | 版式和浅色主题；颜色集中在 `:root` 变量里 |
| `academic-markdown-night.css`、`academic-markdown-mono.css` | 颜色覆盖层，在基础样式之后加载，只改颜色 |
| `scripts/render.js` | 批量渲染：`--outdir`、`--theme`、`--basedir` |
| `scripts/verify.js` | PDF 验收：Type 3 字体、裸 `**`、空白页、KaTeX 字体 |
| `scripts/build-night.js`、`scripts/build-mono.js` | 替换 `example.md` 里的配色说明和插图后渲染示例 |
| `scripts/check-contrast.mjs` | 夜间和黑白色对的 WCAG 检查 |
| `test/` | `markdown`、`verify`、`cli` 三个测试文件不需要浏览器，CI 只跑它们；`render.test.js` 用真实流水线渲染 `fixtures/` |

## 设计决策

1. **静态 TTF，不用可变字体或 `fonts-noto-cjk`。** Chrome/Skia 导出时，可变字体和 CFF/OTC 会退化成 Type 3，体积约翻倍，还影响印刷预检；静态 TTF 才会嵌入为 CID TrueType。`verify.js` 把 Type 3 数量作为硬指标。
2. **KaTeX 字体内联为 data URI。** `md-to-pdf` 用 HTTP 服务托管 `basedir`，KaTeX 样式里的相对字体路径在 `basedir` 不是项目目录时会 404，公式静默退回系统字体。配置加载时把 woff2 读成 base64 写进 `css`。
3. **marked 18 加自定义 `code` renderer。** marked 4.x 在中文全角标点紧贴 `**` 时会把星号印出来，所以用 `overrides` 把 `md-to-pdf` 下的 marked 升到 18（Mermaid 保留自己的 16）。marked 5 起删除了 `highlight` 和 `langPrefix`，`md-to-pdf` 的代码高亮随之失效，因此由 `codeExtension` 自己调用 highlight.js，并把 `mermaid` 围栏输出成容器。
4. **`fixCjkEmphasis` 预处理。** marked 18 仍不把全角标点当作合法的闭合边界，例如 `**中文（说明）**后文`。预处理在 `**` 内侧插入 U+2060，不改可见文字；行内代码、围栏代码和公式先被摘出，不受影响。
5. **按高度分页，并在打印版心宽度下测量。** `blockquote`、`pre`、`details`、`figure`、`.alert` 和不足 9 行的表格默认不跨页，表格行始终保持完整；高度超过版心 40% 的块加 `may-break`，允许在行间断开，否则会把整页推成空白。屏幕宽度和打印版心不同，量高度前先把 `body` 临时设为版心宽（170 mm）。表头用 `table-header-group` 在续页重复。
6. **`page_media_type: "print"`。** `md-to-pdf` 默认以 screen 媒体生成 PDF，`@media print` 规则不会生效，这里统一用 print。
7. **主题 = 基础层 + 颜色层。** 版式、字体和分页不随主题变化。页眉页脚模板是独立文档，Mermaid 用 `themeVariables`，两者读不到页面的 CSS 变量，所以它们的颜色在 `md-to-pdf.config.js` 里按主题另写一份。
8. **`verify.js` 按版心裁剪。** 空白页检测用 `pdftotext -x -y -W -H` 裁到版心，页眉页脚在页边距内，不会算作内容；裁剪尺寸取自 `pdf_options.margin`，与排版共用同一份页边距。
9. **KaTeX 固定在 0.18.10。** `marked-katex-extension` 的 peer 范围是 `>=0.16 <0.19`，所以不能用 0.19；0.18.11 被维护者标为弃用，0.18.10 是范围内最新的可用版本。Mermaid 12 依赖 `katex ^0.18`，与根依赖共用同一份。
10. **Mermaid 固定 `look: "classic"`，并把 `flowchart.wrappingWidth` 提到 400。** Mermaid 12 默认的 neo 外观带投影，投影会被栅格化成位图写进 PDF；默认的 `wrappingWidth`（200）还会把 `Markdown 源文件` 这样的短中文标签折成孤字。两项都由 `test/render.test.js` 里的 Mermaid 用例守住。布局引擎保持 Mermaid 12 的默认值 ELK。

## 扩展点

**新增主题**

1. 新建 `academic-markdown-<name>.css`，只覆盖 `:root` 变量和颜色规则，可参考黑白主题。
2. 新建 `md-to-pdf.<name>.config.js`：设置 `MD_THEME` 后 `require` 基础配置。
3. 在 `md-to-pdf.config.js` 里为新主题补三处：`stylesheet` 列表、`PAGE_COLORS`、`MERMAID_VARIABLES`。
4. 把名字加进 `scripts/render.js` 的 `THEMES`，在 `scripts/check-contrast.mjs` 加色对，再按 `build:mono` 的做法加示例构建。

**新增 Markdown 语法**：往 `marked_extensions` 追加扩展。需要分页控制时，在 `academic-markdown.css` 加 `break-inside` 规则，并把选择器加进 `pageRuntime` 里 `may-break` 的 `querySelectorAll`。

**修改版心**：改 `md-to-pdf.config.js` 的 `PAGE`。页边距、版心宽高、页眉页脚内边距、分页测量和 `verify.js` 的裁剪区域都由它派生。

## 已知限制

- `md-to-pdf` 5.2.5 没有 `--dest`，指定输出目录请用 `render:all`；原生命令只能写在 Markdown 旁边。
- `basedir` 是静态服务的根目录：输入文件必须在其中，相对路径的图片也只能放在其下。
- 代码块使用 `pre-wrap`，Chromium 不对软折行的续行做悬挂缩进，建议单行不超过 100 字符。
- `PAGE_COLORS`、`MERMAID_VARIABLES` 与 CSS 变量里的颜色各存一份，没有单一来源。改主题色时要同步修改，并重跑 `npm run check:contrast`。
- `verify.js` 的空白页检测只看文字；裸 `**` 检测会把代码示例里的 `**` 也算进去，此时用 `--allow-asterisks`。
- `mermaid.min.js` 是自包含的打包文件，Mermaid 自己用的 KaTeX 编译在里面（12.2.0 内嵌 0.18.11），不受 `package.json` 里 `katex` 版本控制；要更新它只能升级 Mermaid。
- `md-to-pdf` 在转换抛错时不会关闭它的静态服务，所以 `render.js` 结束时显式 `process.exit`，否则失败后进程不会退出。
