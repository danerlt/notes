# Nvidia 大模型记录

## RAG介绍

关键： 提高检索能力



### 检索前

在向量数据库中进行相似度搜索

- 查询路由
- 查询转换
  - 重写查询
  - HyDE ：生成答案，检索答案
  - 子查询
- Small  Size  of chunk: 划分成小的
  - Sentence-window retrieval
  - Auto-merge retrieval

### 检索中

- 混合索引
  - 关键字检索
  - 向量相似度检索

### 检索后

- Re-ranker： 相似的不一定相关，通过另一个模型对检索结果做一个相关性计算，然后重新排序，取出相关性最近的topK
- 元数据过滤：给文档添加元数据，在
- 提示词压缩：将提示词中的噪声去掉，精简内容，减少token消耗 







痛点：

- 轻松部署
- 多模型，模型轻松切换
- 高可用
- RAGAS
- trulens





## Nvidia解决方案

Nvidia 自研的embeddings model: recall benchmark 79%

相似度算法： ANN算法：  RAPIDS RAFT 提供GPU加速的能力

提供多种大语言模型

TensorRT-LLM框架： 部署LLM的框架，集成了常见的基于transformer的模型

Nemo Guardrails  : 开源项目

RAG Evaluation Tool: 评估RAG

GenerativeAISamples: RAG原型应用程序

ChipNemo: 基于RAG，微调，预训练完成芯片设计



zilliz RAG 应用样例：

百万下直接暴力搜索 100% recall

百万级直接用HW算法





osschat.io

milvus RAG 样例：https://github.com/zilliztech/akcio





向量数据库评测：https://github.com/zilliztech/VectorDBBench



towhee example
