# AGENTS.md

Chinese-first A4 PDF themes for `md-to-pdf` (CommonJS, Node >= 22.12, npm). No bundler or linter. `docs/architecture.md` has the design rationale; read it before changing pagination, fonts, KaTeX, or Mermaid.

## Commands

- CI equivalent (no Chromium needed): `npm run check:contrast && npm run test:unit`, plus `node --check` on `md-to-pdf*.js scripts/*.js scripts/*.mjs test/*.js`.
- `npm test` runs everything, including `test/render.test.js`, which renders fixtures with real Chromium and needs static Noto Serif/Sans SC TTFs, Sarasa Mono SC, and poppler (`pdfinfo`, `pdffonts`, `pdftotext`, `pdftoppm`, `pdfimages`). Use `npm run test:unit` if those are missing.
- Single test file: `node --test test/markdown.test.js`.
- Render with outputs elsewhere: `npm run render:all -- --theme night --outdir dist file.md` (`scripts/render.js`). The native `npm run render*` commands (raw `md-to-pdf`) can only write next to the source and need `--basedir` for files outside the repo.
- Rebuild the committed examples with `npm run build:all`, then `npm run verify:examples`. `example.pdf`, `example-night.pdf`, and `example-mono.pdf` are tracked; other `*.pdf` and `example.html` are gitignored.
- `build:night` and `build:mono` do string replacement on `example.md`. If you edit the strings they match (color description, figure path, `"配色": "Cambridge Slate"`), update the scripts too.

## Architecture

- `md-to-pdf.config.js` is the whole pipeline: marked extensions, KaTeX CSS inlined as data URIs, injected page scripts, `pdf_options`, header and footer templates. Theme is chosen by the `MD_THEME` env var at load time (`light`, `night`, `mono`). The `md-to-pdf.{night,mono}.config.js` files only set it and re-export. `render.js` must set `MD_THEME` before requiring the config.
- Theme = shared layout in `academic-markdown.css` + color-only overlay CSS. Do not put layout in the night/mono files.
- Colors live in three places with no single source: CSS `:root` variables, `PAGE_COLORS` (header/footer), and `MERMAID_VARIABLES` in the config. Change them together and run `npm run check:contrast`.
- Page geometry comes only from `PAGE` in the config. `verify.js` and the pagination measurement derive from it.
- New markdown syntax goes in `marked_extensions`. If it needs page-break control, also add it to the `may-break` `querySelectorAll` in `pageRuntime`.
- Adding a theme touches several files. Follow "新增主题" in `docs/architecture.md`.

## Gotchas

- Fonts must be static TTF. Variable fonts and `fonts-noto-cjk` (CFF/OTC) make Chrome emit Type 3 fonts, and `verify.js` fails on those.
- Version pins are deliberate. KaTeX stays at 0.18.10 because of the `marked-katex-extension` peer range. `overrides` forces marked 18 under `md-to-pdf`. Mermaid is pinned at `look: "classic"` with `wrappingWidth: 400`. Do not bump any of these without reading `docs/architecture.md`.
- `md-to-pdf` serves files from `basedir`, so inputs and their relative images must live inside it.
- A failed Mermaid diagram or KaTeX formula does not fail the conversion; the PDF prints "Mermaid 渲染失败" or "KaTeX 渲染失败" and only `verify.js` reports it. KaTeX's `errorColor` is `#cc0001` on purpose; the runtime detects it.
- `verify.js` flags literal `**`. Use `--allow-asterisks` for documents that legitimately show it.
- Code comments and CLI messages are English. README, `docs/architecture.md`, and `example.md` are Chinese (`README.en.md` is the English README).
- Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`, `build(deps):`, `test:`, `ci:`).
