# 渲染错误回归样例

本文件含一张正确的图、一张语法错误的图和一个无法解析的公式，用来确认出错的块不会拖累正确的图，并且 `scripts/verify.js` 能检出错误。

```mermaid
flowchart LR
    GOOD_NODE[正确的节点] --> B[另一个节点]
```

```mermaid
flowchart TD
  A[缺少右括号 -->
```

无法解析的公式： $\badcommand{x}$。
