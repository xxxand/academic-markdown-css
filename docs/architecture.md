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
3. 模块脚本（`pageRuntime`）：等字体就绪，渲染 Mermaid，再按打印版心宽度处理表格（标记不换行的列、必要时缩小字号），最后量高度，给过高的块加 `may-break`。

## 文件职责

| 文件 | 职责 |
|---|---|
| `md-to-pdf.config.js` | 流水线中心：marked 扩展、KaTeX 字体内联、页面脚本、`pdf_options`、页眉页脚（`buildHeaderTemplate(label)` 也导出给 `render.js`），以及各主题的 `PAGE_COLORS` 和 `MERMAID_VARIABLES` |
| `md-to-pdf.night.config.js`、`md-to-pdf.mono.config.js` | 设置 `MD_THEME` 后重新导出基础配置 |
| `academic-markdown.css` | 版式和浅色主题；颜色集中在 `:root` 变量里 |
| `academic-markdown-night.css`、`academic-markdown-mono.css` | 颜色覆盖层，在基础样式之后加载，只改颜色 |
| `scripts/render.js` | 批量渲染：`--outdir`、`--theme`、`--basedir`；每篇文档的同名样式表和 frontmatter 的 `header_label` |
| `scripts/verify.js` | PDF 验收：Type 3 字体、裸 `**`、Mermaid/KaTeX 渲染错误、空白页、KaTeX 字体 |
| `docs/ai-markdown-guide.md` | 交给 AI 的写作规范：标点、空格、公式写法 |
| `scripts/build-night.js`、`scripts/build-mono.js` | 替换 `example.md` 里的配色说明和插图后渲染示例 |
| `scripts/check-contrast.mjs` | 夜间和黑白色对的 WCAG 检查 |
| `test/` | `markdown`、`verify`、`cli` 三个测试文件不需要浏览器，CI 只跑它们；`render.test.js` 用真实流水线渲染 `fixtures/` |

## 设计决策

1. **静态 TTF，不用可变字体或 `fonts-noto-cjk`。** Chrome/Skia 导出时，可变字体和 CFF/OTC 会退化成 Type 3，体积约翻倍，还影响印刷预检；静态 TTF 才会嵌入为 CID TrueType。`verify.js` 把 Type 3 数量作为硬指标。
2. **KaTeX 字体内联为 data URI。** `md-to-pdf` 用 HTTP 服务托管 `basedir`，KaTeX 样式里的相对字体路径在 `basedir` 不是项目目录时会 404，公式静默退回系统字体。配置加载时把 woff2 读成 base64 写进 `css`。
3. **marked 18 加自定义 `code` renderer。** marked 4.x 在中文全角标点紧贴 `**` 时会把星号印出来，所以用 `overrides` 把 `md-to-pdf` 下的 marked 升到 18（Mermaid 保留自己的 16）。marked 5 起删除了 `highlight` 和 `langPrefix`，`md-to-pdf` 的代码高亮随之失效，因此由 `codeExtension` 自己调用 highlight.js，并把 `mermaid` 围栏输出成容器。
4. **`marked-cjk-friendly` 处理强调边界。** marked 18 仍不把全角标点当作合法的闭合边界，例如 `**中文（说明）**后文`。这个扩展按 CJK 规则判断强调的两端，不改文本，也不会误处理 `2 ** 3 ** 4` 这类带空格的 `**`。它是 ESM 包，配置通过 `require(...).default` 加载，依赖 Node 22.12 起默认开启的 `require(esm)`。
5. **按高度分页，并在打印版心宽度下测量。** `blockquote`、`pre`、`details`、`figure`、`.alert` 和不足 9 行的表格默认不跨页，表格行始终保持完整；高度超过版心 40% 的块加 `may-break`，允许在行间断开，否则会把整页推成空白。屏幕宽度和打印版心不同，量高度前先把 `body` 临时设为版心宽（170 mm）。表头用 `table-header-group` 在续页重复。容器 `.keep-together` 让内容整体不拆页，`.allow-break` 让里面的块一律加 `may-break`，两者都是手动开关，运行时不再按高度判断。
6. **`page_media_type: "print"`。** `md-to-pdf` 默认以 screen 媒体生成 PDF，`@media print` 规则不会生效，这里统一用 print。
7. **主题 = 基础层 + 颜色层。** 版式、字体和分页不随主题变化。页眉页脚模板是独立文档，Mermaid 用 `themeVariables`，两者读不到页面的 CSS 变量，所以它们的颜色在 `md-to-pdf.config.js` 里按主题另写一份。
8. **`verify.js` 按版心裁剪。** 空白页检测先用 `pdftotext -x -y -W -H` 裁到版心看文字；没有文字的页再用 `pdftoppm` 渲染同一块区域，所有像素相同才算空白，所以只放插图的页不会误报。页眉页脚在页边距内，不会算作内容；裁剪尺寸取自 `pdf_options.margin`，与排版共用同一份页边距。
9. **KaTeX 固定在 0.18.10。** `marked-katex-extension` 的 peer 范围是 `>=0.16 <0.19`，所以不能用 0.19；0.18.11 被维护者标为弃用，0.18.10 是范围内最新的可用版本。Mermaid 12 依赖 `katex ^0.18`，与根依赖共用同一份。
10. **Mermaid 固定 `look: "classic"`，并把 `flowchart.wrappingWidth` 提到 400。** Mermaid 12 默认的 neo 外观带投影，投影会被栅格化成位图写进 PDF；默认的 `wrappingWidth`（200）还会把 `Markdown 源文件` 这样的短中文标签折成孤字。两项都由 `test/render.test.js` 里的 Mermaid 用例守住。布局引擎保持 Mermaid 12 的默认值 ELK。
11. **渲染错误要能被检出。** Mermaid 逐块渲染，一张图出错只替换它自己，并印出“Mermaid 渲染失败”；KaTeX 因 `throwOnError: false` 把无法解析的公式印成红色源码，运行时在其前面加上“KaTeX 渲染失败”。转换本身仍然成功，`verify.js` 靠这两句话找出问题页。
12. **宽公式缩放，而不是滚动。** `.katex-display` 在屏幕上可横向滚动，打印时超出的部分直接被裁掉。运行时在打印版心宽度下量每个行间公式，过宽的用 `zoom` 等比缩到刚好放下。
13. **主题文件里的行内代码规则要和基础层同级。** 基础层用 `h1 code … h4 code`、`table code` 去掉标题和表格里行内代码的底色；夜间和黑白的 `body code` 选择器优先级相同、加载更晚，所以两个主题文件里各有一份同样的覆盖规则。

14. **脚注由 `marked-footnote` 生成，印在文末。** Chromium 不支持 `float: footnote`，没法把脚注排到每页底部，所以统一收在文档末尾。扩展用 `description: "脚注"` 和 `headingClass: "footnotes-title"` 把小标题改成中文并去掉屏幕阅读器专用的 `sr-only`；回链箭头 ↩ 在纸上没有用，由 `a[data-footnote-backref]` 隐藏。样式只用已有的 CSS 变量，所以三个主题共用基础层里的一份规则。
15. **脚注小标题是 `h2`。** 它会出现在 PDF 书签里，这是有意保留的，方便跳到文末。未定义的引用 `[^x]` 会原样印出，没有被引用的定义会被丢弃，PDF 里看不出来，`verify.js` 也读不到源码，所以由 `scripts/check-footnotes.js` 在 `render.js` 渲染前检查源文件：缺少定义、没有被引用、重复定义，以及 `<sup>数字</sup>` 冒充脚注。这些只是警告，不中止渲染，旧文档不会因此无法出 PDF；检查会跳过 frontmatter、围栏代码块和行内代码。

16. **宽表由 CSS 和页面脚本分工，策略是先保护、再让步、最后缩小。**
    - 根因：`body` 的 `overflow-wrap: anywhere` 被单元格继承，把最小内容宽度算成一个字符，自动列宽可以把任何列压到几乎为零，于是 `29.7` 在小数点处断开、`NQ` 拆成 `N / Q`。正文单元格仍保留 `anywhere`，否则一个长网址会撑破整张表；表头 `th` 改用 `overflow-wrap: normal` 加 `word-break: keep-all`，词不会从中间拆开。
    - 字号档位按列数用 `:has(thead th:nth-child(N))` 选表（7 列起 8.6 pt，9 列起 8 pt），不依赖脚本。
    - 页面脚本按列判断：最宽的单元格不超过 5 em 的列一律加 `.nowrap`，不超过 12 em 的“中等列”在放得下时才加。表超出版心时先取消中等列的 `.nowrap`（它们恢复正常换行），取消之后仍然超出就恢复，因为这时只有缩小字号才有用；最后仍然超出的表缩小 `--table-size`。宽度按字符估算：CJK 为 1 em，其余 0.55 em。
    - 缩放改 `--table-size` 变量，与列数档位共用同一个入口，内边距以 em 计，会同比缩小。没有用 `zoom`：它是非标准属性，在 `zoom` 下 `offsetWidth` 和 `getBoundingClientRect` 的单位不一致，反复测量时容易算错。公式仍用 `zoom`，因为那里只量一次。
    - Chromium 会把越过版心的内容直接裁掉，被裁的文字不在 PDF 里，所以 `verify.js` 无从检出，只能靠 `test/fixtures/wide-table.md` 的断言：关键数字和标签是完整的词、最后一列还在、所有词都在右边距之内。含 `colspan` / `rowspan` 的表无法按列索引，只做档位和整表缩放。

17. **拆页的表两侧至少留两行。** 第一行 `break-after: avoid`，最后一行 `break-before: avoid`，Chromium 会遵守。没有它们时，拆页的表常在页底留下一行、或在页首留下最后一行：`test/fixtures/table-split.md` 有 16 张表，关掉这两条规则后，6 张拆页的表里有 2 张出现单行。表只放得下一行时，整张表移到下一页，页底多出一行的空白。

18. **每篇文档的设置只在 `render.js` 里生效。** 页眉模板是 Chromium 单独渲染的页面，读不到正文，所以 `header_label` 必须在渲染前由脚本取出，再换一份页眉模板，原生 `md-to-pdf` 命令做不到。脚本用 `gray-matter` 读 frontmatter，和 `md-to-pdf` 一样关闭 JS 引擎，渲染文档不会执行文档里的代码。同名样式表（`report.css`）追加在主题样式表之后；`md-to-pdf` 的 `--stylesheet` 和 frontmatter 的 `stylesheet` 是替换，所以不用它们。`MD_HEADER_LABEL` 用 `??` 取默认值，设成空字符串可以隐藏标签。

19. **`package.json` 的 `allowScripts` 放行 Puppeteer。** 新版 npm 默认拦截依赖的安装脚本，Puppeteer 下载 Chrome 的 postinstall 会被跳过，第一次渲染才报 `Could not find Chrome`。条目带版本号（`puppeteer@25.15.0`），升级 Puppeteer 时要同步更新。

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
- 裸 `**` 检测会把代码示例里的 `**` 也算进去，此时用 `--allow-asterisks`。
- `verify.js` 不检查版面：被拆开的数字、被压扁的列照样通过，Chromium 裁掉的溢出内容也不在 PDF 里。
- 行内公式启用了 `marked-katex-extension` 的 `nonStandard`：`$...$` 前后不要求空格，`设$a$为常数`、`（$a$）`、`$a$；` 都能渲染。代价是同一行里成对的未转义 `$` 会被当成公式，`$5 … $10` 会变成公式，所以非公式的 `$` 必须写成 `\$`。标准规则要求开头 `$` 前是空格或行首、结尾 `$` 后是空白或 `，。：？！,.:`，不满足时公式不渲染也不报错，中文行文里很难避开，所以没有采用。
- `md-to-pdf` 每次转换都会把扩展再登记到全局 `marked` 上，所以 `render.js` 在每个文件前用 `marked.setOptions(getDefaults())` 重置，避免批量渲染时扩展叠加。
- `mermaid.min.js` 是自包含的打包文件，Mermaid 自己用的 KaTeX 编译在里面（12.2.0 内嵌 0.18.11），不受 `package.json` 里 `katex` 版本控制；要更新它只能升级 Mermaid。
- `md-to-pdf` 在转换抛错时不会关闭它的静态服务，所以 `render.js` 结束时显式 `process.exit`，否则失败后进程不会退出。
