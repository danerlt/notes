# Bash常用

## 变量

使用`变量名=变量值` 的方式定义变量，使用`$变量名`或者`${变量名}`的方式获取变量的值。

<p style="color: RED"> **注意**：等号两边不能有空格。</p>

```bash
# 定义两个变量 a 和 b
a=1
b="hello world"

# 打印变量的值 类似于Python中的print函数
echo "a: ${a}"
echo "b: $b"
```

## 打印输出

### echo

在` Bash shell` 中，`echo` 命令是用于将文本输出到终端的基本命令。可以使用 `echo` 命令来在`shell`中打印消息或变量值。

默认情况下，`echo` 命令会在输出文本的末尾添加一个换行符。如果不想在输出的末尾添加换行符，可以使用 `-n` 选项。
 
`echo` 命令的 `-e` 选项是用于启用解释反斜杠-控制字符的特殊处理，可以用来输出具有特殊格式的文本

以下是一些基本的 echo 命令用法：
```bash
# 打印文本
echo "Hello, World!"

# 打印变量值
var1="Hello"
var2="World"
echo "${var1}, ${var2}!"

# 打印多行文本
echo "Line 1
Line 2
Line 3"

# 打印带有转义字符的文本
echo "This is a \"quoted\" text."

# 不输出行尾的换行符
echo -n "This is a text without a trailing newline."

# 输出到 stderr
echo "This is an error message." >&2

# 输出到文件
echo "This is a text." > output.txt

# 多个参数合并为一个字符串以一个空格分隔
echo "Hello" "World"
# 等价于
echo "Hello World"

# 输出带有特殊格式的文本
echo -e "This is a \033[1;31mred\033[0m text."

# 输出一个制表符
echo -e "Name\tAge"

# 输出一个换行符
echo -e "Line 1\nLine 2"

```

在 Bash shell 中，`echo` 命令的 `-e` 选项可以用于输出带有特殊格式的文本，包括文本颜色。可以使用 ANSI 转义序列来指定输出的文本颜色。

下面是一些常见 ANSI 转义序列：

- `\033[0m`：重置所有的文本属性
- `\033[1m`：将文本设置为粗体
- `\033[4m`：将文本设置为下划线
- `\033[31m`：将文本设置为红色
- `\033[32m`：将文本设置为绿色
- `\033[33m`：将文本设置为黄色
- `\033[34m`：将文本设置为蓝色
- `\033[35m`：将文本设置为洋红色
- `\033[36m`：将文本设置为青色

以下是一些示例，演示如何使用 ANSI 转义序列将文本输出成特定的颜色：

```bash
# 将文本颜色设置为黄色
echo -e "\033[33mThis is yellow text\033[0m"

# 将文本颜色设置为红色、背景颜色设置为蓝色
echo -e "\033[31;44mThis is red text on blue background\033[0m"

# 将文本颜色设置为绿色、背景颜色设置为灰色
echo -e "\033[32;40mThis is green text on gray background\033[0m"

# 将文本颜色设置为粗体的粉色
echo -e "\033[1;35mThis is bold magenta text\033[0m"
```

在上面的示例中，`\033` 表示转义字符，后面的数字表示需要设置的文本属性。使用分号可以同时设置多种属性，以在一行命令中实现多种颜色和其他样式的混合。

请注意，`\033[0m` 应该在每次设置文本颜色后重置颜色，以避免在下一个行中显示错误的颜色。

总之，您可以使用 ANSI 转义序列在 Bash shell 中将文本输出成特定的颜色。

### printf

在 Bash shell 中，`printf` 是一个功能强大的命令，可以根据格式字符串和参数来格式化和打印数据。`printf` 命令与 `echo` 命令不同之处在于它可以更好地控制字符串格式，并允许您指定输出的字段宽度、填充字符、小数精度、对齐方式和其他细节。

以下是一些常见的 `printf` 命令用法：

```bash
# 打印普通文本
printf "Hello, World!\n"

# 填充字符串
printf "%-10s %-10s %-10s\n" "Name" "Age" "Gender"
printf "%-10s %-10s %-10s\n" "Bob" "18" "Male"
printf "%-10s %-10s %-10s\n" "Alice" "21" "Female"

# 指定字段宽度和精度
printf "%10s %10s %10s\n" "Name" "Age" "Salary"
printf "%10s %10.2f %10d\n" "Bob" 1200.75 5000
printf "%10s %10.2f %10d\n" "Alice" 1500.50 8000

# 控制小数位数
printf "%.3f\n" 3.1415926

# 输出十六进制数
printf "Hex: %x, %X\n" 255 255

# 输出八进制数
printf "Octal: %o\n" 255

# 输出科学计数法
printf "%e\n" 1230000

# 输出百分比
printf "%d%%\n" 50
```

在上述示例中：

- `%s` 表示字符串占位符
- `%d` 表示整数占位符
- `%f` 表示浮点数占位符
- `%x`, `%X` 表示十六进制数占位符
- `%o` 表示八进制数占位符
- `%e`, `%E` 表示科学计数法占位符
- `%c` 表示字符


## for循环用法

### 根据索引遍历数组
```bash
# 定义一个数组，数组的元素用空格分隔
list=("a" "b" "c")
# 遍历数组 i 为索引
for i in ${!list[@]}
do
    echo "index: $i"
    # 获取索引对应的值
    item=${list[$i]}
    echo "item: ${item}"
done
```

### 直接遍历数组
```bash
# 定义数组
list=("a" "b" "c")
# 遍历数组 item 为列表的元素
for item in ${list[@]}
do
    echo "item: $item"
done
```

### 