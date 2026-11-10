# 脚注回归样例

本文件检查脚注引用和文末脚注区：第一处引用[^first]，第二处引用[^second]，同一条脚注被引用两次[^first]，用中文名作标签[^中文]。

全角句号后的引用紧贴标点：GAPMARK。[^gap]

| 项目 | 说明 |
|---|---|
| 表格里的引用[^intable] | x |

> [!NOTE]
> 提示块里的引用[^innote]。

[^first]: FIRST_NOTE：脚注里有 `code`、**粗体** 和公式 $x^2$ 。
[^second]: SECOND_NOTE：第二条脚注。

    这是第二条脚注的续段。
[^中文]: ZH_NOTE：标签可以是中文。
[^intable]: TABLE_NOTE。
[^innote]: ALERT_NOTE。
[^gap]: GAP_NOTE。
