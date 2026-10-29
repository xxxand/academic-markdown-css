# Academic Markdown CSS

中文优先的 A4 学术 PDF 主题 · 浅色 / 夜间 / 黑白

[中文](README.md) · [English](README.en.md)

| 浅色 | 夜间 | 黑白 |
|:--:|:--:|:--:|
| [![浅色预览](assets/preview.png)](example.pdf) | [![夜间预览](assets/preview-night.png)](example-night.pdf) | [![黑白预览](assets/preview-mono.png)](example-mono.pdf) |

[示例 Markdown](example.md) · [浅色 PDF](example.pdf) · [夜间 PDF](example-night.pdf) · [黑白 PDF](example-mono.pdf)

> 本项目是 [md-to-pdf](https://github.com/simonhaenisch/md-to-pdf) 的中文学术排版主题与配置：CSS、字体、分页、页眉页脚和三套配色。它不是 Markdown 编辑器，也不是完整的 LaTeX 文档引擎。

| 能力 | 内容 |
|---|---|
| 排版 | A4、10.5pt 正文、1.8 行距、首行缩进、两端对齐、三线表、跨页表头、页眉页码、PDF 书签 |
| 内容 | 代码高亮、Diff、GitHub Alerts、KaTeX、Mermaid、`<details>`、任务列表、定义列表 |
| 主题 | 浅色 / 夜间 / 黑白，三套色板均通过 WCAG 2.2 AA 对比度检查 |
| 输出 | CID TrueType 字体嵌入、KaTeX 字体内联、长表/长代码块按高度分页 |

`example.md` 第 11 节是一份可逐页检查的回归清单，覆盖字体嵌入、分页、中文强调、标点禁则和代码行宽。

## 快速开始

```bash
npm install
npm run build
```

`npm run build` 渲染浅色版 `example.md`，生成 `example.pdf`。夜间和黑白示例：

```bash
npm run build:night  # example-night.pdf
npm run build:mono   # example-mono.pdf
```

## 渲染自己的文档

```bash
npm run render -- path/to/your-file.md
npm run render:night -- path/to/your-file.md
npm run render:mono -- path/to/your-file.md
```

PDF 默认写在 Markdown 旁边；`md-to-pdf` 5.2.5 没有 `--dest`，需要输出到其他目录时用 Node API（参考 `scripts/build-night.js`）。

如果文件不在项目目录内，把 `--basedir` 指向包含它的目录。KaTeX 字体已经内联，不会因 `--basedir` 丢公式字体；图片等相对资源仍要放在该目录下。

WSL/CI 的非登录 shell 里先加载 nvm：

```bash
source "$HOME/.nvm/nvm.sh"
npm run render -- path/to/your-file.md
```

页眉右侧默认 `ACADEMIC NOTES`，可按课程或项目覆盖：

```bash
MD_HEADER_LABEL="机器人学导论" npm run render -- path/to/your-file.md
```

默认取第一个 `h1` 作为标题；需要单独指定时用 frontmatter：

```markdown
---
document_title: 我的文档标题
---
```

## 主题

| 主题 | 构建 | 渲染 | 背景 | 正文 | 强调 / 链接 |
|---|---|---|---|---|---|
| 浅色 / 默认 | `npm run build` | `npm run render` | `#ffffff` | `#232830` | `#133844` |
| 夜间 | `npm run build:night` | `npm run render:night` | `#0b1b23` | `#e8f0f4` | `#8ecae6` |
| 黑白 | `npm run build:mono` | `npm run render:mono` | `#ffffff` | `#111111` | `#000000` |

夜间和黑白主题只叠加颜色，版式、字体和分页与浅色主题共用。

## 环境与字体

- Node.js >= 22.12
- Noto Serif SC / Noto Sans SC：静态 TTF，建议 400 / 600 / 700
- Noto Sans：希腊字母、上下标等符号回退，通常随 `fonts-noto-core` 安装
- Sarasa Mono SC：代码字体，TTF

**必须使用静态 TTF。** `NotoSerifSC[wght].ttf` 这类可变字体在 Chrome/Skia 导出时仍会退化为 Type 3；`fonts-noto-cjk` 的 CFF/OTC 也会。Type 3 会让体积约大一倍，并影响印刷预检和部分 RIP。

```bash
css=$(curl -fsSL 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@400;600;700')
mkdir -p "$HOME/.local/share/fonts/noto-sc-ttf"
printf '%s\n' "$css" | grep -o 'https://[^)]*\.ttf' | while read -r url; do
  curl -fsSL "$url" -o "$HOME/.local/share/fonts/noto-sc-ttf/$(basename "$url")"
done
fc-cache -f
```

Sarasa Mono SC 从 [Sarasa Gothic Releases](https://github.com/be5invis/Sarasa-Gothic/releases) 下载 TTF，安装后刷新缓存：

```bash
sudo cp SarasaMonoSC-*.ttf /usr/local/share/fonts/
sudo fc-cache -f
```

确认字体：

```bash
fc-match "Noto Serif SC"
fc-match "Noto Sans SC"
fc-match "Noto Sans"
fc-list | grep -i "Sarasa Mono SC"
```

## 自定义

- `academic-markdown.css`：基础版式与浅色主题；字体栈在 `--font-serif`、`--font-sans`、`--font-mono`
- `academic-markdown-night.css` / `academic-markdown-mono.css`：夜间 / 黑白配色覆盖层
- `md-to-pdf.config.js`：页边距（`PAGE`）、页眉页脚、Mermaid、分页阈值
- `md-to-pdf.night.config.js` / `md-to-pdf.mono.config.js`：主题入口

表格列宽默认自动分配。需要固定某一列时，可按表格位置覆盖：

```css
table:nth-of-type(2) th:nth-child(1) { width: 12%; }
table:nth-of-type(2) th:nth-child(2) { width: 40%; }
table:nth-of-type(2) th:nth-child(3) { width: 48%; }
```

不建议全局打开 `table-layout: fixed`，那会让所有表格变成等宽列。

## 扩展语法

| 语法 | 写法 | 说明 |
|---|---|---|
| Alerts | `> [!NOTE]` | 支持 NOTE / TIP / IMPORTANT / WARNING / CAUTION |
| KaTeX | `$...$` / `$$...$$` | 行内与行间公式；不是完整 LaTeX |
| Diff | `diff` 代码块 | `+` / `-` 行分别着色 |
| Mermaid | `mermaid` 代码块 | Chromium 内渲染为 SVG |
| 折叠问答 | `<details><summary>` | 打印时自动展开 |

完整可运行示例见 [example.md](example.md)。

## 可访问性

- 正文对比度：浅色 14.81:1，夜间 15.23:1，黑白 18.88:1
- 链接保持下划线；Alerts 有类型标题，Diff 保留 `+` / `-`，不只看颜色
- 运行 `npm run check:contrast` 检查夜间与黑白主题的关键色对

## 说明

- Mermaid、KaTeX、Alerts 全部本地处理，不依赖 CDN。
- 夜间适合屏幕；打印建议浅色或黑白。黑白适合单色打印、影印和弱化色彩干扰。
- 短表尽量整表不拆页；超过约 40% 版心高度的表格、代码块和引用块允许跨页。
- 代码块使用 `pre-wrap`；Chromium 对软折行不悬挂缩进，建议单行不超过 100 字符。
- `fixCjkEmphasis` 预处理修正中文全角标点紧贴 `**` 的强调解析，只在标记内侧插入零宽字符，不改代码块和公式。

## License

MIT License — 可自由使用、修改、分发，保留版权声明。详见 [LICENSE](LICENSE)。
