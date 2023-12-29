# RAG（Retrieval-Augmented Generation）学习笔记

## 论文：Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks

论文名称： Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks（知识密集型 NLP 任务的检索增强生成）

论文地址： https://arxiv.org/abs/2005.11401


### 提出的问题是什么

实验表明预训练语言模型能够从海量数据中学习到广泛的世界知识，**这些知识以参数的形式存储在模型中，经过适当的微调就能在下游任务中取得SOTA表现，而不需要访问或检索额外的外部知识库**。但是，这类通用语言模型在处理**知识密集型(knowledge-intensive)** 任务时仍旧存在一定的局限性，常常落后于面向特定任务的模型结构。预训练模型容量再大也无法记住所有的知识，一旦训练好了很难方便的扩展和修改知识。

问题：知识密集型任务中，如何提高预训练模型在知识密集型任务上的表现，并且扩展性更好？

### 用的什么解决方法

给大模型添加外部知识库。在当前的知识密集型任务的研究中，具有实用价值的模型基本都依赖于外部知识库，**开放域问答系统(Open-domain QA)** 是最经典也最重要的知识密集型任务之一，目前的SOTA模型基本都包含两个模块：文档检索器和文档生成器，前者负责检索召回和查询相关的文档，后者负责从这些文档中编辑或抽取出答案片段。**这种检索-抽取范式类似于开卷考试，而单纯依靠模型参数来保存知识类似于闭卷考试**，前者当然要简单可靠得多。



### 成果如何

在开放域问答任务中，作者对比了RAG和一些流行的抽取式QA模型，包括依赖于非参数知识(Open Book)的REALM和DPR，以及仅依靠参数知识(Closed Book)的生成式模型T5，评估指标为EM分数。在其余三项任务中，作者还对比测试了BART模型和利用了文档监督信息的SOTA模型。

![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/v2-2266b8891c7bc9635e50050f3d0d07e6_720w.webp)



下面是一些主要结论：

-   总体来说，Open Book范式比Closed Book范式的表现好不少，因此引入外部知识库对开放域问答任务来说还是很重要的，而**RAG很好地将seq2seq模型的灵活性和检索模型的高效性结合了起来**，并且不像REALM，RAG的训练成本更小，另外RAG的检索器虽然是用DPR的检索器初始化的，但原始的DPR模型后续采用了BERT来对文档做重排和答案抽取，而RAG表明这两者是不必要的。

-   虽然可以直接从文档中抽取答案片段，但直接生成答案有一些额外的好处，比如有些文档并不直接包含整个答案，但包含答案的线索，**这些线索就能帮助模型生成更正确的答案**，而这对抽取式模型来说是做不到的。在一些极端情况下，比如被检索到的文档全都不包含正确答案，RAG也能生成相对合理的答案，此时RAG借助的就是生成器中存储的参数知识，而REALM这类抽取式QA模型就无法回答这些问题。在NQ数据集中，RAG对于这类问题的正确率是11.8%，而抽取式模型的正确率是0%。

-   作者对BART和RAG模型在问题生成任务上的表现进行了人工评估，如左图所示，评估结果表明RAG生成的问题更符合事实(factual)，也更具体(specific)，而右图计算了不同的tri-grams与所有tri-grams的比值，该比值能够反映生成的多样性，计算结果和样本观察均表明RAG的生成结果是更多样化的。

    ![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/v2-90f3d16f2b1a9f6aa0b24459c88d3e15_720w.webp)

    ![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/v2-c2b91a3920a0a2a1cd81ad4bc213526d_720w.webp)

-   另外，我们可以发现在问题生成任务中RAG-Token的表现比RAG-Sequence更好，这实际上得益于前者在生成时可以关注到多个文档，从而生成信息更丰富的问题，下面的一个例子就表明了RAG-Token在生成不同的单词时，不同文档的后验概率是不同的。有趣的是，在生成某个实体的第一个词之后，该实体对应的文档的后验概率就回归正常了，这表明**生成器依靠参数知识完全有能力补全后续部分，文档信息仅仅起到了提示和引导的作用**，因此整个RAG模型主要依靠的还是参数知识，而在生成实体时非参数知识才会起到作用。

    ![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/v2-523842e23b2e0fba43fdc3b990dda037_720w.webp)

### 原理是啥

-   RAG 的思路其实很简单, 我们知道, 生成模型通过建模条件分布:

    $$
    p(y|x)
    $$

    并从中不断地采样序列.

-   不依赖检索的生成模型可以理解为 $$ x→y $$ 的过程, 现在我们希望赋予模型检索的能力, 即希望通过如下方式进行生成

    $$
    x→(x,z)→y
    $$

    即模型需要先通过 $$x$$ 检索得到 $$z$$ 并一起生成最后的 $$y$$.

-   实际上, 就是 (此处的积分是勒贝格积分)

-   其中 $p_{\theta}, p_{\eta}$ 是我们构建的两个条件模型:

    ![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/1603215-20230718143654762-686920493.png)

其中有两种实际的模型：

-   **RAG-Sequence:** 即通过检索后的文档生成完整的序列, 假设我们检索出 (相同的) Tok-k 最相关的文档 (注意这些文档), 我们可以用如下方式近似 

    $$
    p(\boldsymbol{y} \mid \boldsymbol{x}) \approx \sum_{\boldsymbol{z} \in \operatorname{top}-k(p(\cdot \mid \boldsymbol{x}))} p_{\eta}(\boldsymbol{z} \mid \boldsymbol{x}) p_{\theta}(\boldsymbol{y} \mid \boldsymbol{x}, \boldsymbol{z})=\sum_{\boldsymbol{z} \in \operatorname{top}-k(p(\cdot \mid \boldsymbol{x}))} p_{\eta}(\boldsymbol{z} \mid \boldsymbol{x}) \prod_{i=1}^{N} p_{\theta}\left(y_{i} \mid \boldsymbol{x}, \boldsymbol{z}, y_{1: i-1}\right) 
    $$

-   **RAG-Token:** 采用的是一种迭代的方式, 对于第 $$i$$ 个需要预测的 Token, 它
    $$
    p(y_i|\boldsymbol{x}; \boldsymbol{y}_{1:i-1}) 
    \approx \sum_{\boldsymbol{z} \in \text{top-}k (p(\cdot|\boldsymbol{x}, \boldsymbol{y}_{1:i-1}))} p_{\eta}(\boldsymbol{z}|\boldsymbol{x},  \boldsymbol{y}_{1:i-1}) p_{\theta}(y_i|\boldsymbol{x}, \boldsymbol{z}, \boldsymbol{y}_{1:i-1})
    $$
    于是
    $$
    p(\boldsymbol{y}|\boldsymbol{x}) 
    \approx \prod_{i=1}^N \sum_{\boldsymbol{z} \in \text{top-}k (p(\cdot|\boldsymbol{x}, \boldsymbol{y}_{1:i-1}))} p_{\eta}(\boldsymbol{z}|\boldsymbol{x},  \boldsymbol{y}_{1:i-1}) p_{\theta}(y_i|\boldsymbol{x}, \boldsymbol{z}, \boldsymbol{y}_{1:i-1})
    $$
    

    

从公式对这两种模型进行理解，RAG-Sequence模型先计算每个文档条件下回答词元的概率分布，再连乘得到每个文档条件下回答的概率分布，最后再求和得到所有最相关文档条件下回答的概率分布，而RAG-Token模型先计算每个文档条件下回答词元的概率分布，再求和得到所有最相关文档条件下回答词元的概率分布，最后再连乘得到所有最相关文档条件下回答的概率分布。



## 样例

基于上面的论文，有两个已经比较流行的样例。

### Langchain-Chatchat

>    一种利用 [langchain](https://github.com/hwchase17/langchain) 思想实现的基于本地知识库的问答应用，目标期望建立一套对中文场景与开源模型支持友好、可离线运行的知识库问答解决方案。

项目地址： https://github.com/chatchat-space/Langchain-Chatchat

原理如下：

![Langchain工作原理](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/Langchain%E5%B7%A5%E4%BD%9C%E5%8E%9F%E7%90%86.png)

从文档处理角度：

![实现原理图2](https://github.com/chatchat-space/Langchain-Chatchat/raw/master/img/langchain+chatglm2.png)

### dify

>   Dify 是一个 LLM 应用开发平台，已经有超过 10 万个应用基于 Dify.AI 构建。它融合了 Backend as Service 和 LLMOps 的理念，涵盖了构建生成式 AI 原生应用所需的核心技术栈，包括一个内置 RAG 引擎。使用 Dify，你可以基于任何模型自部署类似 Assistants API 和 GPTs 的能力。

项目地址： https://github.com/langgenius/dify



### 混合检索

dify中使用了混合检索来提高检索的准确度。

RAG 检索环节中的主流方法是向量检索，即语义相关度匹配的方式。技术原理是通过将外部知识库的文档先拆分为语义完整的段落或句子，并将其转换（Embedding）为计算机能够理解的一串数字表达（多维向量），同时对用户问题进行同样的转换操作。

计算机能够发现用户问题与句子之间细微的语义相关性，比如 “猫追逐老鼠” 和 “小猫捕猎老鼠” 的语义相关度会高于 “猫追逐老鼠” 和 “我喜欢吃火腿” 之间的相关度。在将相关度最高的文本内容查找到后，RAG 系统会将其作为用户问题的上下文一起提供给大模型，帮助大模型回答问题。

除了能够实现复杂语义的文本查找，向量检索还有其他的优势：

-   相近语义理解（如老鼠/捕鼠器/奶酪，谷歌/必应/搜索引擎）
-   多语言理解（跨语言理解，如输入中文匹配英文）
-   多模态理解（支持文本、图像、音视频等的相似匹配）
-   容错性（处理拼写错误、模糊的描述）

虽然向量检索在以上情景中具有明显优势，但有某些情况效果不佳。比如：

-   搜索一个人或物体的名字（例如，伊隆·马斯克，iPhone 15）
-   搜索缩写词或短语（例如，RAG，RLHF）
-   搜索 ID（例如， `gpt-3.5-turbo` ， `titan-xlarge-v1.01` ）

而上面这些的缺点恰恰都是传统关键词搜索的优势所在，传统关键词搜索擅长：

-   精确匹配（如产品名称、姓名、产品编号）
-   少量字符的匹配（通过少量字符进行向量检索时效果非常不好，但很多用户恰恰习惯只输入几个关键词）
-   倾向低频词汇的匹配（低频词汇往往承载了语言中的重要意义，比如“你想跟我去喝咖啡吗？”这句话中的分词，“喝”“咖啡”会比“你”“想”“吗”在句子中承载更重要的含义）

对于大多数文本搜索的情景，首要的是确保潜在最相关结果能够出现在候选结果中。向量检索和关键词检索在检索领域各有其优势。混合搜索正是结合了这两种搜索技术的优点，同时弥补了两方的缺点。

在混合检索中，你需要在数据库中提前建立向量索引和关键词索引，在用户问题输入时，分别通过两种检索器在文档中检索出最相关的文本。

![img](https://1673940196-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FCdDIVDY6AtAz028MFT4d%2Fuploads%2Fz9fgXDyvfctWNey4nia5%2Fimage.png?alt=media&token=1404e7a9-4639-45ab-901d-b4d74a6a23c3)

“混合检索”实际上并没有明确的定义，本文以向量检索和关键词检索的组合为示例。如果我们使用其他搜索算法的组合，也可以被称为“混合检索”。比如，我们可以将用于检索实体关系的知识图谱技术与向量检索技术结合。

不同的检索系统各自擅长寻找文本（段落、语句、词汇）之间不同的细微联系，这包括了精确关系、语义关系、主题关系、结构关系、实体关系、时间关系、事件关系等。可以说没有任何一种检索模式能够适用全部的情景。**混合检索通过多个检索系统的组合，实现了多个检索技术之间的互补。**







## 参考链接

-   Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks 论文原文：https://arxiv.org/pdf/2005.11401.pdf
-   Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks 论文阅读笔记: https://zhuanlan.zhihu.com/p/671448677
-   Retrieval-Augmented Generation for Open-Domain QA： https://zhuanlan.zhihu.com/p/339942960
-   检索、提示：检索增强的（Retrieval Augmented）自然语言处理:  https://zhuanlan.zhihu.com/p/470784563
-   Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks 笔记：https://www.cnblogs.com/MTandHJ/p/17562977.html
-   举一反三：示例增强的（example augmented）自然语言处理: https://zhuanlan.zhihu.com/p/512969250
-   Langchain-Chatchat项目地址：https://github.com/chatchat-space/Langchain-Chatchat
-   Dify项目地址：https://github.com/langgenius/dify
-   Devv AI 是如何构建高效的 RAG 系统的: https://us.v2ex.com/t/1000319
-   [devv.ai](http://devv.ai/) 是如何构建高效的 RAG 系统的 Part 2: https://typefully.com/Tisoga/PBB58Vu
-   面向大语言模型的检索增强生成技术：调查 [译]： https://baoyu.io/translations/ai-paper/2312.10997-retrieval-augmented-generation-for-large-language-models-a-survey

