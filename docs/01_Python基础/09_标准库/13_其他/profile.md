# Python 性能分析器

性能分析器简介
cProfile 和 profile 提供了 Python 程序的 确定性性能分析 。 profile 是一组统计数据，描述程序的各个部分执行的频率和时间。这些统计数据可以通过 pstats 模块格式化为报表。

Python 标准库提供了同一分析接口的两种不同实现：

对于大多数用户，建议使用 cProfile ；这是一个 C 扩展插件，因为其合理的运行开销，所以适合于分析长时间运行的程序。该插件基于 lsprof ，由 Brett Rosen 和 Ted Chaotter 贡献。

profile 是一个纯 Python 模块（cProfile 就是模拟其接口的 C 语言实现），但它会显著增加配置程序的开销。如果你正在尝试以某种方式扩展分析器，则使用此模块可能会更容易完成任务。该模块最初由 Jim Roskind 设计和编写。

## 使用示例

要分析采用单个参数的函数，可以执行以下操作：
```python
import cProfile
import re
cProfile.run('re.compile("foo|bar")')
```
上述操作将运行 `re.compile()` 并打印分析结果，如下所示：
```
   214 function calls (207 primitive calls) in 0.002 seconds

Ordered by: cumulative time

ncalls  tottime  percall  cumtime  percall filename:lineno(function)
     1    0.000    0.000    0.002    0.002 {built-in method builtins.exec}
     1    0.000    0.000    0.001    0.001 <string>:1(<module>)
     1    0.000    0.000    0.001    0.001 __init__.py:250(compile)
     1    0.000    0.000    0.001    0.001 __init__.py:289(_compile)
     1    0.000    0.000    0.000    0.000 _compiler.py:759(compile)
     1    0.000    0.000    0.000    0.000 _parser.py:937(parse)
     1    0.000    0.000    0.000    0.000 _compiler.py:598(_code)
     1    0.000    0.000    0.000    0.000 _parser.py:435(_parse_sub)
```
第一行表示共监控了214个函数调用。其中207个是原始的，即该调用不是通过递归调用引起的。
下一行：按累计时间排序，表示最右侧列中的文本字符串被用于对输出进行排序。列标题包括：

- ncalls: 调用次数
- tottime: 在指定函数中消耗的总时间（不包括调用子函数的时间）
- percall: 是 tottime 除以 ncalls 的商
- cumtime: 指定的函数及其所有子函数（从调用到退出）消耗的累积时间。这个数字对于递归函数来说是准确的。
- percall: 是 cumtime 除以原始调用（次数）的商（即：函数运行一次的平均时间）
- filename:lineno(function): 提供相应数据的每个函数

如果第一列中有两个数字（例如3/1），则表示函数递归。第二个值是原始调用次数，第一个是调用的总次数。请注意，当函数不递归时，这两个值是相同的，并且只打印单个数字。

profile 运行结束时，打印输出不是必须的。也可以通过为 run() 函数指定文件名，将结果保存到文件中：
```python
import cProfile
import re
cProfile.run('re.compile("foo|bar")', 'restats')
```
pstats.Stats 类从文件中读取 profile 结果，并以各种方式对其进行格式化。

cProfile 和 profile 文件也可以作为脚本调用，以分析另一个脚本。例如：

```shell
python -m cProfile [-o output_file] [-s sort_order] (-m module | myscript.py)
```

`-o` 将`profile` 结果写入文件而不是标准输出
`-s` 指定 `sort_stats()` 排序值之一以对输出进行排序。这仅适用于未提供 -o 的情况
`-m` 指定要分析的是模块而不是脚本。
    3.7 新版功能: cProfile 添加 -m 选项
    3.8 新版功能: profile 添加 -m 选项
`pstats` 模块的 `Stats` 类具有各种方法用来操纵和打印保存到性能分析结果文件的数据。

```python
import pstats
from pstats import SortKey
p = pstats.Stats('restats')
p.strip_dirs().sort_stats(-1).print_stats()
```

## 参考链接

- [Python 性能分析器](https://docs.python.org/zh-cn/3/library/profile.html)
