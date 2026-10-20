# Academic Markdown CSS

一套中文优先的学术风格 Markdown 样式，配合 [md-to-pdf](https://github.com/simonhaenisch/md-to-pdf) 生成 A4 PDF。

正文与标题使用 Noto Serif / Sans CJK SC，代码使用 Sarasa Mono SC；页面采用首行缩进、两端对齐、三线表、页眉页码和 PDF 书签。

![渲染预览](assets/preview.png)

[查看示例 PDF](example.pdf) · [查看示例 Markdown](example.md)

## 特性

- A4 学术排版：10.5pt 正文、1.8 行距、首行缩进、两端对齐
- 三线表、跨页表头重复、短表不拆页
- 页眉自动显示文档标题，页脚显示页码
- 按标题自动生成 PDF 书签
- 代码块、行内代码、引用块、图片图注
- 任务列表、定义列表、`<details>` 折叠问答
- 自动展开 `<details>`，便于打印
- 通用配置：自动读取每个 Markdown 的第一个 `h1` 作为标题
- Cambridge 官方色板，配色来源写在 CSS 顶部

## 环境

- Node.js >= 18
- Noto Serif CJK SC
- Noto Sans CJK SC
- Sarasa Mono SC（代码字体）

Debian / Ubuntu 可安装 Noto 字体：

```bash
sudo apt install fonts-noto-cjk
```

Sarasa Mono SC 从 [Sarasa Gothic Releases](https://github.com/be5invis/Sarasa-Gothic/releases) 下载 TTF 版本，安装到系统字体目录后刷新字体缓存：

```bash
# 以实际下载路径为准
sudo cp SarasaMonoSC-*.ttf /usr/local/share/fonts/
sudo fc-cache -f
```

可以用下面的命令确认字体：

```bash
fc-list | grep -iE "Noto (Serif|Sans) CJK SC|Sarasa Mono SC"
```

## 快速开始

```bash
npm install
npm run build
```

`npm run build` 会渲染 `example.md`，生成 `example.pdf`。

## 渲染自己的文档

```bash
npm run render -- path/to/your-file.md
```

输出 PDF 默认生成在 Markdown 文件旁边。也可以直接使用 `md-to-pdf`：

```bash
md-to-pdf your-file.md --config-file md-to-pdf.config.js
```

如果文件不在项目目录内，需要额外指定 `--basedir`。

## 标题与页眉

默认取文档的第一个 `h1` 作为：

- PDF 元数据标题
- 页眉左侧文字

页眉右侧固定为 `ACADEMIC NOTES`。如果某个文档需要单独指定标题，可以在 Markdown 开头写 frontmatter：

```markdown
---
document_title: 我的文档标题
---

# 正文标题
```

frontmatter 中的 `document_title` 会覆盖自动提取的标题。

## 自定义

颜色、字号、行距和页边距集中在这两个文件：

- `academic-markdown.css`：`:root` 里的颜色变量、正文与标题字号、行距
- `md-to-pdf.config.js`：A4 页边距、页眉页脚、PDF 书签

色板来自 [University of Cambridge Colour Guidelines](https://www.cam.ac.uk/brand-resources/guidelines/colour)，主要色值：

| 用途 | 色值 |
|---|---|
| 正文 | `#232830` |
| 强调色 | `#133844` |
| 辅助灰 | `#546072` |
| 分隔线 | `#B5BDC8` |
| 浅色底 | `#ECEEF1` |
| 代码辅助色 | `#911449` / `#13553A` / `#29347A` |

## 项目结构

```text
.
├── academic-markdown.css     # 学术排版样式
├── md-to-pdf.config.js       # md-to-pdf 通用配置
├── example.md                # 样式示例
├── example.pdf               # 示例渲染结果
├── assets/
│   ├── example-figure.svg    # 示例图片
│   └── preview.png           # README 预览图
├── package.json
└── README.md
```

## 说明

- 当前不包含 Mermaid 或 LaTeX 的自动渲染；如需使用，建议在构建前把图或公式预渲染成 SVG。
- 短表保持整表不拆页、长表允许跨页，依赖 Chromium 的 CSS 分页能力。
- 示例文档仅用于展示样式，可直接替换为自己的 Markdown。
