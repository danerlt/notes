# Query Translation(查询转换)

## MultiQueryRetriever（多查询）

> MultiQueryRetriever 通过使用 LLM 从不同角度为给定的用户输入查询生成多个查询，从而自动执行提示调整过程。
> 对于每个查询，它都会检索一组相关文档，并采用所有查询之间的唯一并集来获取更大的一组潜在相关文档。
> 通过对同一问题生成多个视角， MultiQueryRetriever 或许能够克服基于距离的检索的一些限制，并获得更丰富的结果集。


![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-02-23-GOJAG3.png)

流程如下：


1. 对于 `Question`，使用大模型生成多个不同的 `question`，如`Q1`，`Q2`，`Q3`。
2. 然后对每个 `question` 进行检索得到对应的 `context`，如`C1`，`C2`，`C3`。
3. 然后将 `C1`，`C2`，`C3` 的文档求交集，得到最终的 `context`。
4. 将原始的`Question`和最终的`context`传给大模型得到答案。

## RAG-Fusion（RAG融合）

>   RAG-Fusion，一种旨在缩小传统搜索范式与人类查询的多方面维度之间差距的搜索方法。受检索增强生成（RAG）的能力启发，该项目更进一步地采用了多种查询生成和倒排融合来对搜索结果进行重新排序。



![image-20240227015531521](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240227015531521.png)

`RAG Fusion`和`MultiQueryRetriever`的流程基本相似，唯一的区别是`MultiQueryRetriever`是对检索的结果求交集，而`RAG-Fusion`是对结果使用倒排算法（reciprocal rank fusion）融合结果。

流程如下：

1. 对于 `Question`，使用大模型生成多个不同的 `question`，如`Q1`，`Q2`，`Q3`。
2. 然后对每个 `question` 进行检索得到对应的 `context`，如`C1`，`C2`，`C3`。
3. 然后将 `C1`，`C2`，`C3` 的文档使用RRF（Reciprocal Rank Fusion)算法重排 ，得到最终的 `context`。
4. 将原始的`Question`和最终的`context`传给大模型得到答案。

倒排算法流程图：

![image-20240227020203487](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240227020203487.png)



## Decomposition（分解）

>   Decomposition: 将一个原始问题分解成多个子问题，通过对子问题的回答来得到最终的问题。



这种方法有两种具体的实现模式。分别是`Answer Recursively`和`Answer Individually`



### Answer Recursively(递归回答)

>   Answer Recursively:  将一个原始问题分解成多个子问题，顺序解决子问题。后面的子问题的答案建立在前面的子问题的答案之上。

![image-20240227021521269](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240227021521269.png)

流程如下：

1.  对于 `Question`，使用大模型生成多个不同的子 `question`，如`Q1`，`Q2`，`Q3`。
2.  然后对第1子问题`Q1`进行检索得到对应的 `context`，如`C1`，将`(Q1,C1)`传给大模型回答得到答案`A1`，构造问答对`[(Q1,A1)]`。
3.  然后对第2子问题`Q2`进行检索得到对应的 `context`，如`C2` ，将前一步得到的问答对`[(Q1,A1)]`和`C2`传给大模型回答得到答案`A2`，构造问答对`[(Q1,A1),(Q2,A2)]`。
4.  然后对第3子问题`Q3`进行检索得到对应的 `context`，如`C3` ，将前一步得到的问答对`[(Q1,A1),(Q2,A2)]`和`C3`传给大模型回答得到答案`A3`。
5.  `Question`对应的答案就是最后一个子问题的回答，如`A3`。

### Answer Individually(单独回答)

>   Answer Individually:  将一个原始问题分解成多个子问题，单独回答子问题。然后通过每个子问题的回答得到最终的答案。

![image-20240227022443047](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240227022443047.png)

流程如下：

1.  对于 `Question`，使用大模型生成多个不同的子 `question`，如`Q1`，`Q2`，`Q3`。
2.  然后对每一个子问题进行检索得到对应的 `context`，将`(question,context)`传给大模型回答得到答案`answer`。
3.  构造问答对`[(qutstion,answer)]`。
4.  将`Question`和其对应子问题的问答对传递给大模型得到最终答案。



## Step Back



## HyDE（Hypothetical Document Embeddings）

>   HyDE 是一种技术，在给定自然语言查询的情况下，首先生成假设的文档/答案。然后，该假设文档用于嵌入查找而不是原始查询。







## 参考链接：
- [https://github.com/langchain-ai/rag-from-scratch](https://github.com/langchain-ai/rag-from-scratch)
- [下一代的RAG范式：RAG-Fusion](https://mp.weixin.qq.com/s/delaJc2KDxLWfUUtGo-V-A)
- [Decompositon Answer recursively方法对应的论文](https://arxiv.org/pdf/2205.10625.pdf)
- [Decompositon Answer individually方法对应的论文](https://arxiv.org/pdf/2212.10509.pdf)
