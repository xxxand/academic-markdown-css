# 分页回归样例

本文件用于检查长表和长代码块的分页：表头在续页重复，代码块在行与行之间断开，任何行都不丢失，也不出现空白页。

## 短表

| 名称 | 说明 |
|---|---|
| 甲 | 第一行 |
| 乙 | 第二行 |
| 丙 | 第三行 |

## 长表

| 编号 | 指标名称 | 数值 |
|---:|:---|---:|
| 1 | 指标 1 | 1.25 |
| 2 | 指标 2 | 2.50 |
| 3 | 指标 3 | 3.75 |
| 4 | 指标 4 | 5.00 |
| 5 | 指标 5 | 6.25 |
| 6 | 指标 6 | 7.50 |
| 7 | 指标 7 | 8.75 |
| 8 | 指标 8 | 10.00 |
| 9 | 指标 9 | 11.25 |
| 10 | 指标 10 | 12.50 |
| 11 | 指标 11 | 13.75 |
| 12 | 指标 12 | 15.00 |
| 13 | 指标 13 | 16.25 |
| 14 | 指标 14 | 17.50 |
| 15 | 指标 15 | 18.75 |
| 16 | 指标 16 | 20.00 |
| 17 | 指标 17 | 21.25 |
| 18 | 指标 18 | 22.50 |
| 19 | 指标 19 | 23.75 |
| 20 | 指标 20 | 25.00 |
| 21 | 指标 21 | 26.25 |
| 22 | 指标 22 | 27.50 |
| 23 | 指标 23 | 28.75 |
| 24 | 指标 24 | 30.00 |
| 25 | 指标 25 | 31.25 |
| 26 | 指标 26 | 32.50 |
| 27 | 指标 27 | 33.75 |
| 28 | 指标 28 | 35.00 |
| 29 | 指标 29 | 36.25 |
| 30 | 指标 30 | 37.50 |
| 31 | 指标 31 | 38.75 |
| 32 | 指标 32 | 40.00 |
| 33 | 指标 33 | 41.25 |
| 34 | 指标 34 | 42.50 |
| 35 | 指标 35 | 43.75 |
| 36 | 指标 36 | 45.00 |
| 37 | 指标 37 | 46.25 |
| 38 | 指标 38 | 47.50 |
| 39 | 指标 39 | 48.75 |
| 40 | 指标 40 | 50.00 |
| 41 | 指标 41 | 51.25 |
| 42 | 指标 42 | 52.50 |
| 43 | 指标 43 | 53.75 |
| 44 | 指标 44 | 55.00 |
| 45 | 指标 45 | 56.25 |
| 46 | 指标 46 | 57.50 |
| 47 | 指标 47 | 58.75 |
| 48 | 指标 48 | 60.00 |
| 49 | 指标 49 | 61.25 |
| 50 | 指标 50 | 62.50 |
| 51 | 指标 51 | 63.75 |
| 52 | 指标 52 | 65.00 |
| 53 | 指标 53 | 66.25 |
| 54 | 指标 54 | 67.50 |
| 55 | 指标 55 | 68.75 |
| 56 | 指标 56 | 70.00 |
| 57 | 指标 57 | 71.25 |
| 58 | 指标 58 | 72.50 |
| 59 | 指标 59 | 73.75 |
| 60 | 指标 60 | 75.00 |

## 长代码块

```python
# 分页回归测试：这个代码块故意超过一页。

value_1 = compute(1, scale=0.5)  # 第 1 行
value_2 = compute(2, scale=0.5)  # 第 2 行
value_3 = compute(3, scale=0.5)  # 第 3 行
value_4 = compute(4, scale=0.5)  # 第 4 行
value_5 = compute(5, scale=0.5)  # 第 5 行
value_6 = compute(6, scale=0.5)  # 第 6 行
value_7 = compute(7, scale=0.5)  # 第 7 行
value_8 = compute(8, scale=0.5)  # 第 8 行
value_9 = compute(9, scale=0.5)  # 第 9 行
value_10 = compute(10, scale=0.5)  # 第 10 行
value_11 = compute(11, scale=0.5)  # 第 11 行
value_12 = compute(12, scale=0.5)  # 第 12 行
value_13 = compute(13, scale=0.5)  # 第 13 行
value_14 = compute(14, scale=0.5)  # 第 14 行
value_15 = compute(15, scale=0.5)  # 第 15 行
value_16 = compute(16, scale=0.5)  # 第 16 行
value_17 = compute(17, scale=0.5)  # 第 17 行
value_18 = compute(18, scale=0.5)  # 第 18 行
value_19 = compute(19, scale=0.5)  # 第 19 行
value_20 = compute(20, scale=0.5)  # 第 20 行
value_21 = compute(21, scale=0.5)  # 第 21 行
value_22 = compute(22, scale=0.5)  # 第 22 行
value_23 = compute(23, scale=0.5)  # 第 23 行
value_24 = compute(24, scale=0.5)  # 第 24 行
value_25 = compute(25, scale=0.5)  # 第 25 行
value_26 = compute(26, scale=0.5)  # 第 26 行
value_27 = compute(27, scale=0.5)  # 第 27 行
value_28 = compute(28, scale=0.5)  # 第 28 行
value_29 = compute(29, scale=0.5)  # 第 29 行
value_30 = compute(30, scale=0.5)  # 第 30 行
value_31 = compute(31, scale=0.5)  # 第 31 行
value_32 = compute(32, scale=0.5)  # 第 32 行
value_33 = compute(33, scale=0.5)  # 第 33 行
value_34 = compute(34, scale=0.5)  # 第 34 行
value_35 = compute(35, scale=0.5)  # 第 35 行
value_36 = compute(36, scale=0.5)  # 第 36 行
value_37 = compute(37, scale=0.5)  # 第 37 行
value_38 = compute(38, scale=0.5)  # 第 38 行
value_39 = compute(39, scale=0.5)  # 第 39 行
value_40 = compute(40, scale=0.5)  # 第 40 行
value_41 = compute(41, scale=0.5)  # 第 41 行
value_42 = compute(42, scale=0.5)  # 第 42 行
value_43 = compute(43, scale=0.5)  # 第 43 行
value_44 = compute(44, scale=0.5)  # 第 44 行
value_45 = compute(45, scale=0.5)  # 第 45 行
value_46 = compute(46, scale=0.5)  # 第 46 行
value_47 = compute(47, scale=0.5)  # 第 47 行
value_48 = compute(48, scale=0.5)  # 第 48 行
value_49 = compute(49, scale=0.5)  # 第 49 行
value_50 = compute(50, scale=0.5)  # 第 50 行
value_51 = compute(51, scale=0.5)  # 第 51 行
value_52 = compute(52, scale=0.5)  # 第 52 行
value_53 = compute(53, scale=0.5)  # 第 53 行
value_54 = compute(54, scale=0.5)  # 第 54 行
value_55 = compute(55, scale=0.5)  # 第 55 行
value_56 = compute(56, scale=0.5)  # 第 56 行
value_57 = compute(57, scale=0.5)  # 第 57 行
value_58 = compute(58, scale=0.5)  # 第 58 行
value_59 = compute(59, scale=0.5)  # 第 59 行
value_60 = compute(60, scale=0.5)  # 第 60 行
value_61 = compute(61, scale=0.5)  # 第 61 行
value_62 = compute(62, scale=0.5)  # 第 62 行
value_63 = compute(63, scale=0.5)  # 第 63 行
value_64 = compute(64, scale=0.5)  # 第 64 行
value_65 = compute(65, scale=0.5)  # 第 65 行
value_66 = compute(66, scale=0.5)  # 第 66 行
value_67 = compute(67, scale=0.5)  # 第 67 行
value_68 = compute(68, scale=0.5)  # 第 68 行
value_69 = compute(69, scale=0.5)  # 第 69 行
value_70 = compute(70, scale=0.5)  # 第 70 行
value_71 = compute(71, scale=0.5)  # 第 71 行
value_72 = compute(72, scale=0.5)  # 第 72 行
value_73 = compute(73, scale=0.5)  # 第 73 行
value_74 = compute(74, scale=0.5)  # 第 74 行
value_75 = compute(75, scale=0.5)  # 第 75 行
value_76 = compute(76, scale=0.5)  # 第 76 行
value_77 = compute(77, scale=0.5)  # 第 77 行
value_78 = compute(78, scale=0.5)  # 第 78 行
value_79 = compute(79, scale=0.5)  # 第 79 行
value_80 = compute(80, scale=0.5)  # 第 80 行
value_81 = compute(81, scale=0.5)  # 第 81 行
value_82 = compute(82, scale=0.5)  # 第 82 行
value_83 = compute(83, scale=0.5)  # 第 83 行
value_84 = compute(84, scale=0.5)  # 第 84 行
value_85 = compute(85, scale=0.5)  # 第 85 行
value_86 = compute(86, scale=0.5)  # 第 86 行
value_87 = compute(87, scale=0.5)  # 第 87 行
value_88 = compute(88, scale=0.5)  # 第 88 行
value_89 = compute(89, scale=0.5)  # 第 89 行
value_90 = compute(90, scale=0.5)  # 第 90 行
print("LAST_LINE_MARKER")
```

文末标记：END_OF_DOCUMENT
