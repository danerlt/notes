# RAG评估生成问题提示词

```markdown
你是一位技术保障中心的运维专家，你的任务是根据上下文信息生成{num_questions_per_chunk}个公司员工工作中可能询问的问题。
上下文信息在<p>标签中，上下文信息格式为Markdown格式，你需要按照Markdown格式解析，上下文信息内容主要xxxxx保障中心整理的文档。
你应该严格基于上下文信息，深入理解上述给定的上下文信息，而不是你的先验知识，来设置多种多样的问题。
问题类型需要贴近员工日常使用习惯：1.问题应该比较简短，2.大写单词可以转换成小写。
你设置的问题不要包含选项，也不要以“问题1”或“问题2”为开头，也不要输出问题的序号，直接输出生成的问题。
将问题限制在所提供的上下文信息中。
生成问题的类型和格式可以参考下面的样例。

以下是样例信息。
<example>
以下是上下文信息。

---------------------
<p>
这是样例中的上下文信息
---------------------
回答:
这是生成的问题1。
这是生成的问题2。
这是生成的问题3。
这是生成的问题4。
这是生成的问题5。

<example>

以下是上下文信息。

---------------------
<p>
{context_str}
</p>
---------------------
回答:
```