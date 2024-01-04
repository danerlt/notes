# 三种索引方式提升RAG性能



## 为什么是索引

1.  索引是RAG pipeline中的关键组成部分
    1.  Document Loaders 文档加载器
    2.  Text Splitters 文本分割器
    3.  VectorStores 向量数据库
    4.  Retrievers 检索器
2.  数据索引为 LLM 模型提供额外的数据，从而生成更好的答案
3.  索引方式对检索性能产生影响



## 常用框架中默认的索引方式

![image-20240104171555900](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240104171555900.png)

索引阶段：

-   文档首先被分隔成比较小的块
-   然后将每个块做embedding转换成向量
-   将向量存入向量数据库

检索阶段：

-   对查询做embedding转换成向量

-   通过相似度算法，从向量数据库查询出和查询最相似的向量

-   找到查询出来的向量对应的块

    

## 三种索引方法的详细介绍

### 1.按子部分索引

不是直接对整个拆分的文本块进行索引，而是将每个文本块再拆分成更小的文本块（例如拆分成单句），然后对这些小块进行多次索引。

![image-20240104172249207](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240104172249207.png)

**实用场景：包含多个主题或有冲突信息的复杂长文本块/大型文档/索引**

提升原理：大的文本块中可能包含了更多的无关信息，这个对于查询来说属于噪音。拆分成更小的句子之后，检索到的内容相关度更高，生成的结果就可能更好。

### 2.按文本块回答的问题索引

可以让 LLM 对拆分的文本块生成相关的假设性问题，并对这些问题进行索引，而不是直接对整个块进行索引。

![image-20240104172855764](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240104172855764.png)

**实用场景：如何用户没有提出非常明确的问题，该索引方法可以减少模糊性**

### 3.按文本块的摘要索引

使用文本块的摘要来创建索引。

![image-20240104173450493](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240104173450493.png)

**实用场景：当文本块中有多余信息或与用户查询无关的细节时，这种方法通常很有用**



## 可能引发的一些疑问

### 与 Langchain 中的 Parent Document Retriever有何不同

>   Parent Document Retriever 就是按子部分索引这一种方法，它通过分割和存储小块数据来实现索引，在检索过程中，先获取小数据块，然后找到其父ID，然后返回比较大的文档。



### LlamaIndex 中是否包含具体的实现

>   LlamaIndex 中的 Node Sentence Window，它将文档解析每个节点的单句。它还包含了节点句子两侧的句子。实现了第1中方法中按句子拆分的方法。



### 具体的实现方式是什么

-   按子部分索引数据库：Smaller chunks
-   按文本块可回答的问题索引数据块： Hypothetical questions 
-   按文件块的摘要索引数据库： Summary



## 参考链接 

-   [3种高级索引方法，有效提升RAG性能](https://www.bilibili.com/video/BV1dH4y1C7Ck/?spm_id_from=333.337.search-card.all.click&vd_source=b6b1fb0 d0dc845e6405d6d2a186ba228) by [可乐i_Klay](https://space.bilibili.com/410342313)

-   [Langchain Parent Document Retriever](https://python.langchain.com/docs/modules/data_connection/retrievers/parent_document_retriever)
