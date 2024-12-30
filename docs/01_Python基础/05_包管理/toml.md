# TOML

Tom 的显而易见的，最小的语言。

作者：Tom Preston-Werner, Pradyun Gedam 等。

## 目标

TOML 旨在成为一种易于阅读的最小配置文件格式，具有明显的语义。TOML 设计为可以明确映射到哈希表。TOML 应该易于解析为各种语言中的数据结构。

## 目录

- [预备知识](#user-content-preliminaries)
- [注释](#user-content-comment)
- [键/值对](#user-content-keyvalue-pair)
- [键](#user-content-keys)
- [字符串](#user-content-string)
- [整数](#user-content-integer)
- [浮点数](#user-content-float)
- [布尔值](#user-content-boolean)
- [偏移日期时间](#user-content-offset-date-time)
- [本地日期时间](#user-content-local-date-time)
- [本地日期](#user-content-local-date)
- [本地时间](#user-content-local-time)
- [数组](#user-content-array)
- [表](#user-content-table)
- [内联表](#user-content-inline-table)
- [表的数组](#user-content-array-of-tables)
- [文件扩展名](#user-content-filename-extension)
- [MIME 类型](#user-content-mime-type)
- [ABNF 语法](#user-content-abnf-grammar)

## 预备知识

- TOML 是区分大小写的。
- 空白字符指的是制表符 (U+0009) 或空格 (U+0020)。
- 换行符指的是 LF (U+000A) 或 CRLF (U+000D U+000A)。
- TOML 文件必须是有效的 UTF-8 编码的 Unicode 文档。

  具体来说，这意味着文件整体必须形成一个 [良好格式的代码单元序列](https://unicode.org/glossary/#well_formed_code_unit_sequence)。否则，必须拒绝（最好）或根据 Unicode 规范将格式错误的字节序列替换为 U+FFFD。

## 注释

井号标记行的其余部分为注释，除非在字符串内。

```toml
# 这是一个完整行的注释
key = "value"  # 这是行尾的注释
another = "# 这不是注释"
```

注释可以包含任何 Unicode 代码点，但以下控制代码除外，这些代码在编辑或处理期间可能会导致问题：U+0000 和 U+000A 到 U+000D。

注释应用于文件的人类读者之间的交流。解析器不得根据注释的存在（或内容）修改键或值。

## 键/值对

TOML 文档的主要构建块是键/值对。

键在等号的左侧，值在右侧。键名和值周围的空白会被忽略。键、等号和值必须在同一行上（尽管某些值可以分成多行）。

```toml
key = "value"
```

值必须具有以下类型之一。

- [字符串](#user-content-string)
- [整数](#user-content-integer)
- [浮点数](#user-content-float)
- [布尔值](#user-content-boolean)
- [偏移日期时间](#user-content-offset-date-time)
- [本地日期时间](#user-content-local-date-time)
- [本地日期](#user-content-local-date)
- [本地时间](#user-content-local-time)
- [数组](#user-content-array)
- [内联表](#user-content-inline-table)

未指定的值无效。

```toml
key = # 无效
```

键/值对后必须有换行符（或 EOF）。（参见 [内联表](#user-content-inline-table) 了解例外情况。)

```
first = "Tom" last = "Preston-Werner" # 无效
```

## key

key 可以是不带引号的 key（裸键）、带引号的 key（引号键） 或带点号的 key（点分键）。

**裸键**可以包含任何 Unicode 脚本中的字母或数字字符，以及 ASCII 数字、破折号和下划线。不允许使用标点符号、空格、箭头、框绘制和私有使用字符。请注意，裸键可以仅由 ASCII 数字组成，例如 1234，但始终被解释为字符串。

&#x2139;&#xfe0f; 允许的代码点的确切范围可以在 [ABNF 语法文件][abnf] 中找到。

```toml
key = "value"
bare_key = "value"
bare-key = "value"
1234 = "value"
Fuß = "value"
😂 = "value"
汉语大字典 = "value"
辭源 = "value"
பெண்டிரேம் = "value"
```

**引号键**遵循与基本字符串或字面字符串相同的规则，允许您在键名中使用任何 Unicode 字符，包括空格。**最佳实践是使用裸键，除非绝对必要。**

```toml
"127.0.0.1" = "value"
"character encoding" = "value"
'quoted "value"' = "value"
"╠═╣" = "value"
"⋰∫∬∭⋱" = "value"
```

裸键必须非空，但允许使用空引号键（尽管不推荐）。您不能使用多行字符串来定义引号键。

```toml
= "没有键名"           # 无效
"""key""" = "不允许" # 无效
"" = "空白"              # 有效但不推荐
'' = '空白'              # 有效但不推荐
```

**点分键**是由点连接的一系列裸键或引号键。这允许将相似的属性分组在一起：

```toml
name = "Orange"
physical.color = "orange"
physical.shape = "round"
site."google.com" = true
பெண்.டிரேம் = "我们是女人"
```

在 JSON 中，这将为您提供以下结构：

```json
{
  "name": "Orange",
  "physical": {
    "color": "orange",
    "shape": "round"
  },
  "site": {
    "google.com": true
  },
  "பெண்": {
    "டிரேம்": "我们是女人"
  }
}
```

有关点分键定义的表的详细信息，请参阅下面的 [表](#user-content-table) 部分。

点分部分周围的空白会被忽略。然而，最佳实践是不使用任何多余的空白。

```toml
fruit.name = "banana"       # 这是最佳实践
fruit. color = "yellow"     # 与 fruit.color 相同
fruit . flavor = "banana"   # 与 fruit.flavor 相同
```

缩进被视为空白并被忽略。

多次定义一个键是无效的。

```
# 不要这样做
name = "Tom"
name = "Pradyun"
```

请注意，裸键和引号键是等效的：

```
# 这将不起作用
spelling = "favorite"
"spelling" = "favourite"
```

只要一个键没有被直接定义，您仍然可以写入它及其内部的名称。

```toml
# 这将键 "fruit" 变成一个表。
fruit.apple.smooth = true

# 然后您可以像这样向表 "fruit" 添加内容：
fruit.orange = 2
```

```
# 以下是无效的

# 这将 fruit.apple 的值定义为整数。
fruit.apple = 1

# 但这将 fruit.apple 视为表。
# 您不能将整数转换为表。
fruit.apple.smooth = true
```

不按顺序定义点分键是不推荐的。

```toml
# 有效但不推荐

apple.type = "fruit"
orange.type = "fruit"

apple.skin = "thin"
orange.skin = "thick"

apple.color = "red"
orange.color = "orange"
```

```toml
# 推荐

apple.type = "fruit"
apple.skin = "thin"
apple.color = "red"

orange.type = "fruit"
orange.skin = "thick"
orange.color = "orange"
```

由于裸键可以仅由 ASCII 整数组成，因此可以编写看起来像浮点数但实际上是两部分点分键的点分键。除非有充分的理由（您可能没有），否则不要这样做。

```toml
3.14159 = "pi"
```

上面的 TOML 映射到以下 JSON。

```json
{ "3": { "14159": "pi" } }
```

## 字符串

有四种表达字符串的方法：基本、多行基本、字面和多行字面。所有字符串必须仅包含 Unicode 字符。

**基本字符串**用引号（`"`）括起来。可以使用任何 Unicode 字符，但必须转义的字符除外：引号、反斜杠和除制表符外的控制字符（U+0000 到 U+0008、U+000A 到 U+001F、U+007F）。

```toml
str = "I'm a string. \"You can quote me\". Name\tJos\xE9\nLocation\tSF."
```

为了方便起见，一些流行的字符有一个紧凑的转义序列。

```
\b         - 退格符       (U+0008)
\t         - 制表符       (U+0009)
\n         - 换行符       (U+000A)
\f         - 换页符       (U+000C)
\r         - 回车符       (U+000D)
\e         - 转义符       (U+001B)
\"         - 引号         (U+0022)
\\         - 反斜杠       (U+005C)
\xHH       - Unicode      (U+00HH)
\uHHHH     - Unicode      (U+HHHH)
\UHHHHHHHH - Unicode      (U+HHHHHHHH)
```

可以使用 `\xHH`、`\uHHHH` 或 `\UHHHHHHHH` 形式转义任何 Unicode 字符。转义代码必须是 Unicode [标量值](https://unicode.org/glossary/#unicode_scalar_value)。

请记住，所有 TOML 字符串都是 Unicode 字符序列，而不是字节序列。对于二进制数据，请避免使用这些转义代码。相反，建议使用外部二进制到文本编码策略，如十六进制序列或 [Base64](https://www.base64decode.org/)，用于在字节和字符串之间进行转换。

所有未列出的转义序列均为保留；如果使用它们，TOML 应产生错误。

有时您需要表达文本段落（例如翻译文件）或希望将非常长的字符串分成多行。TOML 使这变得简单。

**多行基本字符串**用三个引号括起来，并允许换行符。紧跟在开头定界符之后的换行符将被修剪。所有其他空白和换行符保持不变。

```toml
str1 = """
Roses are red
Violets are blue"""
```

TOML 解析器可以自由地将换行符标准化为适合其平台的内容。

```toml
# 在 Unix 系统上，上述多行字符串很可能与以下内容相同：
str2 = "Roses are red\nViolets are blue"

# 在 Windows 系统上，它很可能等同于：
str3 = "Roses are red\r\nViolets are blue"
```

为了在不引入多余空白的情况下编写长字符串，请使用“行尾反斜杠”。当行上的最后一个非空白字符是未转义的 `\` 时，它将与所有空白（包括换行符）一起被修剪，直到下一个非空白字符或关闭定界符。所有对基本字符串有效的转义序列对多行基本字符串也有效。

```toml
# 以下字符串在字节上是等效的：
str1 = "The quick brown fox jumps over the lazy dog."

str2 = """
The quick brown \

  fox jumps over \
    the lazy dog."""

str3 = """\
       The quick brown \
       fox jumps over \
       the lazy dog.\
       """
```

可以使用任何 Unicode 字符，但必须转义的字符除外：反斜杠和除制表符、换行符和回车符（U+0000 到 U+0008、U+000B、U+000C、U+000E 到 U+001F、U+007F）以外的控制字符。回车符（U+000D）仅允许作为换行符序列的一部分。

您可以在多行基本字符串中随意编写引号或两个相邻的引号。它们也可以写在定界符内。

```toml
str4 = """Here are two quotation marks: "". Simple enough."""
# str5 = """Here are three quotation marks: """."""  # 无效
str5 = """Here are three quotation marks: ""\"."""
str6 = """Here are fifteen quotation marks: ""\"""\"""\"""\"""\"."""

# "This," she said, "is just a pointless statement."
str7 = """"This," she said, "is just a pointless statement.""""
```

如果您是 Windows 路径或正则表达式的频繁指定者，那么必须转义反斜杠很快就会变得繁琐且容易出错。为此，TOML 支持字面字符串，它不允许任何转义。

**字面字符串**用单引号括起来。与基本字符串一样，它们必须出现在单行上：

```toml
# 所见即所得。
winpath  = 'C:\Users\nodejs\templates'
winpath2 = '\\ServerX\admin$\system32\'
quoted   = 'Tom "Dubs" Preston-Werner'
regex    = '<\i\c*\s*>'
```

由于没有转义，因此无法在由单引号括起来的字面字符串中编写单引号。幸运的是，TOML 支持多行字面字符串版本，可以解决此问题。

**多行字面字符串**用三个单引号括起来，并允许换行符。与字面字符串一样，完全没有转义。紧跟在开头定界符之后的换行符将被修剪。TOML 解析器必须以与多行基本字符串相同的方式标准化换行符。

定界符之间的所有其他内容都按原样解释，不进行修改。

```toml
regex2 = '''I [dw]on't need \d{2} apples'''
lines  = '''
The first newline is
trimmed in literal strings.
   All other whitespace
   is preserved.
'''
```

您可以在多行字面字符串中随意编写 1 或 2 个单引号，但不允许三个或更多单引号的序列。

```toml
quot15 = '''Here are fifteen quotation marks: """"""""""""""""'''

# apos15 = '''Here are fifteen apostrophes: ''''''''''''''''''  # 无效
apos15 = "Here are fifteen apostrophes: '''''''''''''''"

# 'That,' she said, 'is still pointless.'
str = ''''That,' she said, 'is still pointless.''''
```

除制表符外，字面字符串中不允许使用控制字符。

## 整数

整数是整数。正数可以加上加号前缀。负数以减号为前缀。

```toml
int1 = +99
int2 = 42
int3 = 0
int4 = -17
```

对于大数字，您可以在数字之间使用下划线以增强可读性。每个下划线必须由至少一个数字包围。

```toml
int5 = 1_000
int6 = 5_349_221
int7 = 53_49_221  # 印度数字系统分组
int8 = 1_2_3_4_5  # 有效但不推荐
```

不允许前导零。整数值 `-0` 和 `+0` 有效并且与无前缀的零相同。

非负整数值也可以用十六进制、八进制或二进制表示。在这些格式中，不允许使用前导 `+`，并且允许使用前导零（在前缀之后）。十六进制值不区分大小写。允许在数字之间使用下划线（但不允许在前缀和值之间使用）。

```toml
# 十六进制，前缀为 `0x`
hex1 = 0xDEADBEEF
hex2 = 0xdeadbeef
hex3 = 0xdead_beef

# 八进制，前缀为 `0o`
oct1 = 0o01234567
oct2 = 0o755 # 用于 Unix 文件权限

# 二进制，前缀为 `0b`
bin1 = 0b11010110
```

应接受任意 64 位有符号整数（从 −2^63 到 2^63−1）并无损处理。如果整数无法无损表示，则必须抛出错误。

## 浮点数

浮点数应实现为 IEEE 754 binary64 值。

浮点数由整数部分（遵循与十进制整数值相同的规则）后跟小数部分和/或指数部分组成。如果同时存在小数部分和指数部分，则小数部分必须在指数部分之前。

```toml
# 小数
flt1 = +1.0
flt2 = 3.1415
flt3 = -0.01

# 指数
flt4 = 5e+22
flt5 = 1e06
flt6 = -2E-2

# 两者
flt7 = 6.626e-34
```

小数部分是小数点后跟一个或多个数字。

指数部分是一个 E（大写或小写），后跟一个整数部分（遵循与十进制整数值相同的规则，但可以包含前导零）。

如果使用小数点，则必须由至少一个数字包围。

```
# 无效浮点数
invalid_float_1 = .7
invalid_float_2 = 7.
invalid_float_3 = 3.e+20
```

与整数类似，您可以使用下划线来增强可读性。每个下划线必须由至少一个数字包围。

```toml
flt8 = 224_617.445_991_228
```

浮点值 `-0.0` 和 `+0.0` 有效，并应根据 IEEE 754 映射。

特殊浮点值也可以表示。它们始终为小写。

```toml
# 无穷大
sf1 = inf  # 正无穷大
sf2 = +inf # 正无穷大
sf3 = -inf # 负无穷大

# 非数字
sf4 = nan  # 实际 sNaN/qNaN 编码是实现特定的
sf5 = +nan # 与 `nan` 相同
sf6 = -nan # 有效，实际编码是实现特定的
```

## 布尔值

布尔值只是您习惯的标记。始终为小写。

```toml
bool1 = true
bool2 = false
```

## 偏移日期时间

为了明确表示特定的时间点，您可以使用 [RFC 3339](https://tools.ietf.org/html/rfc3339) 格式的带偏移量的日期时间。

```toml
odt1 = 1979-05-27T07:32:00Z
odt2 = 1979-05-27T00:32:00-07:00
odt3 = 1979-05-27T00:32:00.999999-07:00
```

为了提高可读性，您可以用空格字符替换日期和时间之间的 T 分隔符（如 RFC 3339 第 5.6 节所允许）。

```toml
odt4 = 1979-05-27 07:32:00Z
```

允许 RFC 3339 的一个例外：可以省略秒数，在这种情况下将假定为 `:00`。偏移量紧跟在分钟之后。

```toml
odt5 = 1979-05-27 07:32Z
odt6 = 1979-05-27 07:32-07:00
```

需要毫秒精度。更高精度的分秒是实现特定的。如果值包含比实现支持的更高的精度，则必须截断而不是舍入额外的精度。

## 本地日期时间

如果您省略 [RFC 3339](https://tools.ietf.org/html/rfc3339) 格式的日期时间中的偏移量，它将表示给定的日期时间，而与偏移量或时区无关。无法在没有附加信息的情况下将其转换为时间点。如果需要，转换为时间点是实现特定的。

```toml
ldt1 = 1979-05-27T07:32:00
ldt2 = 1979-05-27T00:32:00.999999
```

可以省略秒数，在这种情况下将假定为 `:00`。

```toml
ldt3 = 1979-05-27T07:32
```

需要毫秒精度。更高精度的分秒是实现特定的。如果值包含比实现支持的更高的精度，则必须截断而不是舍入额外的精度。

## 本地日期

如果您仅包含 [RFC 3339](https://tools.ietf.org/html/rfc3339) 格式的日期时间的日期部分，它将表示整天，而与偏移量或时区无关。

```toml
ld1 = 1979-05-27
```

## 本地时间

如果您仅包含 [RFC 3339](https://tools.ietf.org/html/rfc3339) 格式的日期时间的时间部分，它将表示一天中的时间，而与特定日期或任何偏移量或时区无关。

```toml
lt1 = 07:32:00
lt2 = 00:32:00.999999
```

可以省略秒数，在这种情况下将假定为 `:00`。

```toml
lt3 = 07:32
```

需要毫秒精度。更高精度的分秒是实现特定的。如果值包含比实现支持的更高的精度，则必须截断而不是舍入额外的精度。

## 数组

数组是方括号中包含的值。空白会被忽略。元素由逗号分隔。数组可以包含与键/值对中允许的相同数据类型的值。可以混合不同类型的值。

```toml
integers = [ 1, 2, 3 ]
colors = [ "red", "yellow", "green" ]
nested_arrays_of_ints = [ [ 1, 2 ], [3, 4, 5] ]
nested_mixed_array = [ [ 1, 2 ], ["a", "b", "c"] ]
string_array = [ "all", 'strings', """are the same""", '''type''' ]

# 允许混合类型数组
numbers = [ 0.1, 0.2, 0.5, 1, 2, 5 ]
contributors = [
  "Foo Bar <foo@example.com>",
  { name = "Baz Qux", email = "bazqux@example.com", url = "https://example.com/bazqux" }
]
```

数组可以跨多行。允许在数组的最后一个值之后使用终止逗号（也称为尾随逗号）。在值、逗号和关闭括号之前可以有任意数量的换行符和注释。数组值和逗号之间的缩进被视为空白并被忽略。

```toml
integers2 = [
  1, 2, 3
]

integers3 = [
  1,
  2, # 这没问题
]
```

## 表

表（也称为哈希表或字典）是键/值对的集合。它们由标题定义，标题在单独的一行上用方括号括起来。您可以通过数组来区分标题，因为数组仅是值。

```toml
[table]
```

在此之下，直到下一个标题或 EOF，都是该表的键/值。表中的键/值对不保证按任何特定顺序排列。

```toml
[table-1]
key1 = "some string"
key2 = 123

[table-2]
key1 = "another string"
key2 = 456
```

表的命名规则与键相同（请参阅上面的 [键](#user-content-keys) 定义）。

```toml
[dog."tater.man"]
type.name = "pug"
```

在 JSON 中，这将为您提供以下结构：

```json
{ "dog": { "tater.man": { "type": { "name": "pug" } } } }
```

键周围的空白会被忽略。然而，最佳实践是不使用任何多余的空白。

```toml
[a.b.c]            # 这是最佳实践
[ d.e.f ]          # 与 [d.e.f] 相同
[ g .  h  . i ]    # 与 [g.h.i] 相同
[ j . "ʞ" . 'l' ]  # 与 [j."ʞ".'l'] 相同
```

缩进被视为空白并被忽略。

如果您不想，可以不指定所有超级表。TOML 知道如何为您完成。

```toml
# [x] 你
# [x.y] 不
# [x.y.z] 需要这些
[x.y.z.w] # 这样就可以工作

[x] # 之后定义超级表是可以的
```

允许空表，只是其中没有键/值对。

与键一样，您不能多次定义一个表。这样做是无效的。

```
# 不要这样做

[fruit]
apple = "red"

[fruit]
orange = "orange"
```

```
# 也不要这样做

[fruit]
apple = "red"

[fruit.apple]
texture = "smooth"
```

不按顺序定义表是不推荐的。

```toml
# 有效但不推荐
[fruit.apple]
[animal]
[fruit.orange]
```

```toml
# 推荐
[fruit.apple]
[fruit.orange]
[animal]
```

顶级表，也称为根表，从文档的开头开始，并在第一个表头（或 EOF）之前结束。与其他表不同，它是无名的，不能重新定位。

```toml
# 顶级表开始。
name = "Fido"
breed = "pug"

# 顶级表结束。
[owner]
name = "Regina Dogman"
member_since = 1999-08-04
```

点分键为最后一个键部分之前的每个键部分创建并定义一个表。任何此类表必须在当前 `[table]` 标题下定义其所有键/值对，或者如果在所有标题之前定义，则在根表中定义，或者在一个内联表中定义。

```toml
fruit.apple.color = "red"
# 定义一个名为 fruit 的表
# 定义一个名为 fruit.apple 的表

fruit.apple.taste.sweet = true
# 定义一个名为 fruit.apple.taste 的表
# fruit 和 fruit.apple 已经创建
```

由于表不能多次定义，因此不允许使用 `[table]` 标题重新定义此类表。同样，不允许使用点分键重新定义已在 `[table]` 形式中定义的表。然而，`[table]` 形式可以用于定义通过点分键定义的表中的子表。

```toml
[fruit]
apple.color = "red"
apple.taste.sweet = true

# [fruit.apple]  # 无效
# [fruit.apple.taste]  # 无效

[fruit.apple.texture]  # 您可以添加子表
smooth = true
```

## 内联表

内联表提供了一种更紧凑的语法来表示表。它们对于可以快速变得冗长的分组嵌套数据特别有用。

内联表在大括号 `{` 和 `}` 中完全定义。在大括号内，可以出现零个或多个逗号分隔的键/值对。键/值对的形式与标准表中的键/值对相同。允许所有值类型，包括内联表。

内联表可以在同一行上有多个键/值对，也可以放在不同的行上。允许在最后一个键/值对之后使用终止逗号（也称为尾随逗号）。

```toml
name = { first = "Tom", last = "Preston-Werner" }
point = {x=1, y=2}
animal = { type.name = "pug" }
contact = {
    personal = {
        name = "Donald Duck",
        email = "donald@duckburg.com",
    },
    work = {
        name = "Coin cleaner",
        email = "donald@ScroogeCorp.com",
    },
}
```

上面的内联表与以下标准表定义相同：

```toml
[name]
first = "Tom"
last = "Preston-Werner"

[point]
x = 1
y = 2

[animal]
type.name = "pug"

[contact.personal]
name = "Donald Duck"
email = "donald@duckburg.com"

[contact.work]
name = "Coin cleaner"
email = "donald@ScroogeCorp.com"
```

内联表是完全自包含的，并在其中定义所有键和子表。不能在大括号外添加键和子表。

```toml
[product]
type = { name = "Nail" }
# type.edible = false  # 无效
```

同样，内联表不能用于向已定义的表添加键或子表。

```toml
[product]
type.name = "Nail"
# type = { edible = false }  # 无效
```

## 表的数组

尚未描述的最后一种语法允许编写表的数组。可以通过使用带有双括号的名称的标题来表示这些。该标题的第一个实例定义数组及其第一个表元素，每个后续实例在该数组中创建并定义一个新表元素。表按遇到的顺序插入到数组中。

```toml
[[product]]
name = "Hammer"
sku = 738594937

[[product]]  # 数组中的空表

[[product]]
name = "Nail"
sku = 284758393

color = "gray"
```

在 JSON 中，这将为您提供以下结构。

```json
{
  "product": [
    { "name": "Hammer", "sku": 738594937 },
    {},
    { "name": "Nail", "sku": 284758393, "color": "gray" }
  ]
}
```

对表的数组的任何引用都指向该数组的最近定义的表元素。这允许您在最近的表中定义子表，甚至是子表的数组。

```toml
[[fruits]]
name = "apple"

[fruits.physical]  # 子表
color = "red"
shape = "round"

[[fruits.varieties]]  # 嵌套的表数组
name = "red delicious"

[[fruits.varieties]]
name = "granny smith"

[[fruits]]
name = "banana"

[[fruits.varieties]]
name = "plantain"
```

上面的 TOML 映射到以下 JSON。

```json
{
  "fruits": [
    {
      "name": "apple",
      "physical": {
        "color": "red",
        "shape": "round"
      },
      "varieties": [{ "name": "red delicious" }, { "name": "granny smith" }]
    },
    {
      "name": "banana",
      "varieties": [{ "name": "plantain" }]
    }
  ]
}
```

如果表或表的数组的父级是数组元素，则必须在定义子级之前定义该元素。尝试颠倒该顺序必须在解析时产生错误。

```
# 无效的 TOML 文档
[fruit.physical]  # 子表，但它应该属于哪个父元素？
color = "red"
shape = "round"

[[fruit]]  # 解析器在发现 "fruit" 是数组而不是表时必须抛出错误
name = "apple"
```

即使该数组是静态定义的数组，尝试附加到该数组也必须在解析时产生错误。

```
# 无效的 TOML 文档
fruits = []

[[fruits]] # 不允许
```

尝试定义与已建立的数组同名的普通表必须在解析时产生错误。尝试将普通表重新定义为数组也必须在解析时产生解析错误。

```
# 无效的 TOML 文档
[[fruits]]
name = "apple"

[[fruits.varieties]]
name = "red delicious"

# 无效：此表与先前的表数组冲突
[fruits.varieties]
name = "granny smith"

[fruits.physical]
color = "red"
shape = "round"

# 无效：此表数组与先前的表冲突
[[fruits.physical]]
color = "green"
```

您还可以在适当的地方使用内联表：

```toml
points = [ { x = 1, y = 2, z = 3 },
           { x = 7, y = 8, z = 9 },
           { x = 2, y = 4, z = 8 } ]
```

## 文件扩展名

TOML 文件应使用扩展名 `.toml`。

## MIME 类型

在互联网上传输 TOML 文件时，适当的 MIME 类型是 `application/toml`。

## ABNF 语法

TOML 的语法的正式描述可作为单独的 [ABNF 文件][abnf]。

[abnf]: https://github.com/toml-lang/toml/blob/main/toml.abnf
