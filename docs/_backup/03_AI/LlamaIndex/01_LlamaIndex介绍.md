# LlamaIndex介绍

## 什么是 LlamaIndex

`LlamaIndex` 是一个用于构建上下文增强 LLM 应用程序的框架。

上下文增强是指在私有或特定于域的数据之上应用 LLMs 的任何用例。一些流行的用例包括：

-   问答聊天机器人（通常称为 RAG （Retrieval-Augmented Generation）系统）

-   文档理解和提取
-   可以进行研究并采取行动的自主代理（Agent）

`LlamaIndex` 提供了构建上述任何用例（从原型到生产）的工具。这些工具允许您提取/处理这些数据，并实现将数据访问与 LLM 提示相结合的复杂查询工作流程。

![image-20240426074154962](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240426074154962.png)

## 为什么要进行上下文增强

LLM 提供了人类与数据之间的自然语言接口。

广泛可用的 LLM 是根据大量公开数据进行预先训练的。但是，大模型没有使用你的私有数据或一些特定领域的数据进行训练。它隐藏在 API 后面、SQL 数据库中，或者隐藏在 PDF 或PPT中。

LlamaIndex 提供了支持上下文增强的工具。一个流行的例子是检索增强生成（RAG），它在推理时将上下文与 LLMs 结合起来。另一个是微调。



## LlamaIndex主要组件？

`LlamaIndex` 提供了5大核心工具：
- Data connectors: 提取数据，从API,PDF SQL 等等中提取数据。

- Data indexes：以中间表示形式构建数据，这些中间表示形式对于 LLM 来说既简单又高效。

- Engines：使用自然语言对数据进行访问

    - Query Engine: 强大的问答接口，例如RAG pipeline.
    - Chat Engine: 对话接口，多轮对话，来回交互

- Agents：通过使用工具增强，从简单的辅助函数到API集成等等

- Observability/Evaluation： 能够在良性循环中严格实验、评估和监控您的应用程序

    

![image-20240426074102110](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240426074102110.png)





## 一个简单的LlamaIndex应用

[01_Introduction.ipynb](./01_Introduction.ipynb)