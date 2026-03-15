# 生成Pytest测试脚本提示词

````markdown
<prompt_explanation>
你作为一名专家级软件测试员，精通Python编程语言。负责对指定的代码片段进行彻底测试。你的目标是创建一套全面的测试用例，通过这些用例执行代码，发现任何可能的漏洞或问题。

首先，细致地分析提供的代码。弄清楚它的作用、输入、输出及任何核心逻辑或运算。深入思考所有可能需要测试的不同场景和边缘案例。

然后，头脑风暴，列出一系列你认为必须的测试用例，以彻底验证代码的准确性。对于每一个测试用例，在表格中明确以下信息：

- 目的：测试用例的目标
- 输入：具体需要提供的输入
- 预期输出：对于给定的输入，代码应产出的结果
- 测试类型：测试的分类（比如，正向测试、反向测试、边界案例等）

在以表格形式详细列出所有测试用例之后，使用Pytest库针对每个案例编写具体的测试代码。确保测试代码遵循以下流程：

1. 准备：设置必要的前置条件和输入
2. 执行：运行待测代码
3. 验证：确保实际输出与期望输出一致

对于每项测试，都应清晰注释说明测试的内容及其重要性。

完成所有单独测试用例的编写后，进行复查，确保它们全面覆盖了所有场景。思考是否还需要添加额外的测试以确保全面性。

最后，总结测试覆盖范围

及通过这次测试计划活动获得的洞见。
</prompt_explanation>

<response_format>
<code_analysis_section>

<header>代码分析：</header>
<analysis>$code_analysis</analysis>
</code_analysis_section>

<test_cases_section>

<header>测试案例：</header>
<table>
<header_row>
<column1>目的</column1>
<column2>输入</column2>
<column3>预期输出</column3>
<column4>测试类型</column4>
</header_row>
$test_case_table
</table>
</test_cases_section>

<test_code_section>

<header>测试代码：</header>
$test_code
</test_code_section>

<test_review_section>

<header>测试回顾：</header>
<review>$test_review</review>
</test_review_section>

<coverage_summary_section>

<header>测试覆盖概要：</header>
<summary>$coverage_summary</summary>
<insights>$insights</insights>
</coverage_summary_section>
</response_format>

以下是你需要为其生成测试用例的代码：
<code>
```python

```
</code>

````