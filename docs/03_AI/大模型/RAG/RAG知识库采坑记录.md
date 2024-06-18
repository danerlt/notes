# RAG知识库项目采坑记录

RAG系统架构图

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/RAG架构图.png)

下面的Langchain框架版本为0.2.7，LlamaIndex框架版本为0.10.45。

## 加载

### Langchain框架

Langchain框架的文档加载在`langchain_community`包的`document_loaders`
模块中，其中有很多loader都是用的一个比较流行的库`unstructured`。

常用的loader有：

- BaseLoader：所有loader的基类，`load`方法将文件读取之后返回一个Document对象列表。
- TextLoader：加载txt文件。
- CSVLoader：加载CSV文件，csv中的第一行是表格中，将每一行数据的每一列和标题拼接起来拼接成一个Document对象。老版本使用UTF-8编码格式的文件，在windows上自动识别编码有问题。
- UnstructuredExcelLoader： 使用`unstructured`库加载Excel文件。
- UnstructuredPDFLoader： 使用`unstructured`库加载PDF文件。
- PyPDFLoader：使用`pypdf`库加载PDF文件。将page中的text提取出来，图片都使用`rapidocr_onnxruntime`
  库提取出text，下面的`PDFLoader`的图片也是一样的处理。
- PyPDFium2Loader: 使用`pypdfium2`库加载PDF文件，可以使用HTTP URL加载PDF。
- PyPDFDirectoryLoader：使用`PyPDFLoader`加载一个目录和子目录下面的所有PDF。
- PDFMinerLoader：使用`pdfminer`库加载PDF文件，也可以使用HTTP URL加载PDF。
- WebBaseLoader：加载网页，使用`bs4`库解析。
- UnstructuredMarkdownLoader: 使用`unstructured`库加载Markdown文件。
- Docx2txtLoader: 使用`docx2txt`库加载`docx`和`doc`文件，**
  直接把文件中的文本提取出来，表格会直接变成文本，丢失行和列的信息，图片会直接丢弃掉。慎用**。
- UnstructuredImageLoader：使用`unstructured`库加载图片文件。
- UnstructuredHTMLLoader: 使用`unstructured`库加载HTML文件。

### LlamaIndex框架

在 LlamaIndex 框架中，使用`reader`来加载文件，加载文件在`llma_index.core.readers.file`
模块中，需要安装`llama-index-readers-file`库。

LlamaIndex 框架的文档加载使用之后效果不是特别好，所以LlamaIndex 又开发了一个LlamaParse库在线解析，使用APIKEY 访问。

由于需要加载的文件是公司内部使用，在线解析会导致泄密。所以这种方案不适用。未验证在线解析的效果。

```bash
pip install llama-index-readers-file
```

常见的reader:

- BaseReader: 所有reader的父类，`load_data`方法将文档读取之后返回一个`Document`对象的列表。
- SimpleDirectoryReader：读取一个目录下的文件，根据文件后缀匹配对应的reader，可以通过`input_files`参数指定要读取的文件名。
- PDFReader: 使用`pypdf`库加载PDF文件。从page中提取text，图片直接丢弃掉。
- DocxReader：使用`docx2txt`库加载word文件，**图片直接丢弃掉，表格信息直接变成文本，丢失行和列的信息，慎用。**
- MarkdownReader：将所有行读取出来，然后按照`#`分割，将header和content拼接成一个Document，拼接时会将`#`去掉，这个问题还没人反馈。第一个`#`前面有内容的话，会将第一个`#`前面的内容丢失。我给LlamaIndex提了[这个BUG](https://github.com/run-llama/llama_index/issues/13283)。

## 分片

文档加载完之后Document对象的长度可能比较长，有可能超过LLM的上下文窗口。所以需要将Document对象进行分片，拆分成小的文本块(
chunk)。

Langchain和LlamaIndex常见的splitter对比如下：

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/20240617152636.png)

LangChain框架中的分片是一个单独的包，`langchain-text-splitters`

安装命令如下：

```bash
pip install langchain-text-splitters
```

注意点：

- 对于CSV，EXCEL文件常见的方案是将一行当作一个chunk。

## 构建索引

将Document分片之后就需要对分片之后的chunk进行索引，存储到向量数据库或文档数据库中。

### 向量数据库选择

常见的向量数据库专门的向量数据库如：

- Chroma
- Milvus
- Faiss
- Weaviate
- Pinecone
- Qdrant

传统的数据库，添加了向量类型的字段，如：

- Elasticsearch
- PostgreSQL
- MongDB

传统的数据库，添加了向量类型的字段，在向量检索的的时候，性能没有专门的向量数据库性能好。所以就排除了传统的数据库。

在开源的向量数据库中，最开始我选择的是Milvus，但是Milvus 2.3 版本不支持混合索引。

后来调研发现qdrant的性能非常高，并且支持元数据过滤和混合索引，qdrant的部署非常轻松，所以最终选择了qdrant。

其中Milvus向量数据库的功能非常强大，它相比其他向量数据库支持更多的相似度检索算法和指标。


### 相似度算法和指标选择

常见的有相似度算法为HNSW算法、IDF算法。

HNSW（Hierarchical Navigable Small World）算法是一种高效的近似最近邻搜索（Approximate Nearest Neighbor Search）算法。它基于小世界图（Small World Graph）的概念，能够在大规模高维数据集中快速找到近似的最近邻。HNSW在实践中被证明具有很高的性能，尤其适用于搜索问题中的高维空间，如图像检索、推荐系统等

IVF（Inverted File）算法是一种用于高效近似最近邻搜索（Approximate Nearest Neighbor Search，ANN）的索引方法，特别适用于大规模高维数据集。IVF通过将数据分割成多个簇（clusters），并使用倒排文件（Inverted File）进行索引，以便快速查找近似邻居。

常见的相似度指标有：

- cosine：余弦相似度，越接近1表示越相似，余弦相似度的取值范围为 -1 到 1，-1表示两个向量完全相反，1表示两个向量完全相同，0表示两个向量正交，即它们之间的夹角为90度，没有相似性。
- dot：点积在几何上的意义是两个向量的长度和它们之间夹角余弦值的乘积。
- euclidean：L2距离，欧几里得距离（Euclidean Distance）是两点之间最直观的直线距离，适用于任意维度的空间。也是我们平时最常用的，两点之间的直线距离。
- manhattan：L1距离，曼哈顿距离（Manhattan Distance），可以简单理解为只能横着走或竖着走，是两点之间沿轴线方向的距离之和。
- hamming：汉明距离（Hamming Distance）是用于衡量两个等长字符串或向量之间不同位置的数量。

### embeding模型

参考链接： [如何选择RAG的Embedding模型？](https://techdiylife.github.io/blog/blog.html?category1=c02&blogid=0047)

我们项目中使用了bge-base-zh-v1.5和m3e-base。最近出来的bge-m3和bce-embedding-base_v1也比较火，可以尝试使用。

## 检索前处理

### 意图识别


在实际测试中，有一些场景，用户问的问题不够明确，我们需要识别用户的意图，并且需要用户补充一些信息，等所需意图需要的信息补全之后再进行检索和回答。

例如：

当用户询问“数据库账号和密码是多少时”，需要先识别处用户是在询问中间件的配置，然后需要让用户补充是哪个环境如开发环境、试环境、生成环境等，哪个平台或系统如AI平台、ASS平台、IOT平台等，哪个服务或应用如用户服务、标注服务、训练服务等。

等用户对应意图的所有信息补全之后再进行检索和回答。

### 重写query

在我们实际的测试中，我们发现RAG系统在多轮对话中会遇到一些问题。

比如： 用户首先询问了北京有什么好吃，然后又问了上海有什么好吃的，接着问"它比北京多那些好吃的”，这类的代词在前面的问答中的例子。

在实际检索的的时候最新的这个query中没有出现北京这个关键字，会导致检索不好相关的文档，从而导致回答的不好。针对这种情况需要结合历史问答和当前query重写query，将其中的一些代词替换掉。

核心思想是使用大模型根据历史信息和旧的query进行重写成功新的query，然后拿新的query去检索。

## 检索策略

### 单个检索器

#### 查询转换

#### 向量检索

#### BM25检索

rank_bm25 库，当`keyword`占比`corpus`的50%时，会导致分数为0,这个问题截止2024-6-17 22:34:52还没有修复。我给它提了PR，作者还没合并。[BUG链接见这里](https://github.com/dorianbrown/rank_bm25/issues/39), [PR 链接见这里](https://github.com/dorianbrown/rank_bm25/pull/40)

#### 检索后处理

### 多个检索器

#### 合并策略

#### 合并后处理

## 提示词模板

Langchain和llamaIndex的prompt模板中默认都是使用f-string去格式化的。如果提示词模板中出现了大括号如`{xxx}`，就会格式化报错。Langchain框架可以通过参数设置成jinja2来格式化。LlamaIndex框架暂时没有修复这个问题。

## 大模型相关

### 模型选择

### 模型推理框架

### 模型显存占用

#### 训练

大模型训练一般都是使用的混合精度和Adam优化器。

假设模型的参数W大小是 $\Phi$ ，**以byte为单位**，存储如下：

![img](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/v2-2fa670488fcc2408bd27bdcfec283d33_720w.webp)

因为采用了Adam优化，所以才会出现momentum和variance，当然你也可以选择别的优化办法。因此这里为了更通用些，记模型必存的数据大小为
$ \Phi $ 。因此最终内存开销为：
$$
2\Phi + 2\Phi + K\Phi
$$
另外，**这里暂不将activation纳入统计范围**，原因是：

- activation不仅与模型参数相关，还与batch size相关
-

activation的存储不是必须的。存储activation只是为了在用链式法则做backward的过程中，计算梯度更快一些。但你永远可以通过只保留最初的输入X，重新做forward来得到每一层的activation（虽然实际中并不会这么极端）。

- 因为activation的这种灵活性，纳入它后不方便衡量系统性能随模型增大的真实变动情况。因此在这里不考虑它，在后面会单开一块说明对activation的优化。

在训练的时候一般会采用多机多卡，使用DeepSpeed框架的话，会使用Zero技术。

- ZeRO-1 : 对优化器状态分片（Optimizer States Sharding）
- ZeRO-2 : 对优化器状态和梯度分片（Optimizer States & Gradients Sharding）
- ZeRO-3 : 对优化器状态、梯度分片以及模型权重参数分片（Optimizer States & Gradients & Parameters Sharding）

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-03-22-80LSfL.png)

示例，以全量预训练Atom-7B的模型为例。我们有两台服务器，其中一台有 2 张A100（40GB），另一台为 2 张 V100（32GB）。

Atom-7B的参数量大小为 $ 7 * 10 ^ 9 $ 字节，等于 7GB 或者 6.5 GiB。$ n_d $表示有多少张卡进行分布式训练，在这里等于 $ 4 $。

将 $ \Psi = 7 $ GB，$ K = 12 $ ，$ N_d = 4 $ 带入上面的公式。

- baseline内存占用： $ (2 + 2 + 12) * 7 = 112 $ GB，每张卡需要 112GB 显存，超出了显卡的显存，无法训练。
- ZeRO-1 内存占用： $ 2*7 + 2*7 + \frac{12*7}{4} = 49 $ GB，每张卡需要 49GB 显存，超出了显卡的显存，无法训练。
- ZeRO-2 内存占用： $ 2*7 + \frac{(2+12)*7}{4} = 38.5 $ GB，每张卡需要 38.5GB 显存，A100能够训练，超出了V100的显存，无法训练。
- ZeRO-3 内存占用： $ \frac{(2+2+12)*7}{4} = 28 $ GB，每张卡需要 28 GB 显存，能够训练。

**注意：这里计算的显存占用只考虑了模型状态，实际上还有剩余状态（包括激活值（activation）、各种临时缓冲区（buffer）以及无法使用的显存碎片（fragmentation）），以
ZeRO-3 训练的时候，实际显存会大于 28 GB，训练可能会报OOM的错误。如果想要在ZeRO-1和ZeRO-2能够训练需要使用offload技术。**

实测 XuanYuan-6B 全量二次预训练，使用2机4卡（一台服务器A100 40G*2，*一台服务器 V100 *
2）ZeRO-3-Offload才能训练起来，而且还要将batch_size设置成1才行。执行时间非常久，训练完需要11年。

#### 微调

采用QLORA微调显存资源占用不大，一张A100（40G）就可以微调7B大小的模型，几百条数据大概需要训练5个小时。

#### 推理

参数类型:

- float 32位 浮点数 4 字节
- FP16 / BF16 16位 浮点数 2 字节
- int8 8位 整数 1 字节
- int4 4位 整数 0.5 字节

显存 = 数量 * 类型大小

下面的计算是估算， 1B Int8类型的模型，显存占用1GB，如果是float32的话就乘以4，FP16/FP16就乘以2，Int4就乘以0.5。

以 7B 大小的模型为例。
float32： 7 * 4 = 28 GB
FP16 / BF16 7 * 2 = 14 GB
int8 7 * 1 = 7 GB
int4 7 * 0.5 = 3.5 GB

可以通过[huggingface model-memory-usage 工具估算](https://huggingface.co/spaces/hf-accelerate/model-memory-usage)
，实际显存会比估算出来的大2到3G左右。

实测：

qwen-7b, chatglm36b FP16 加载显存大约14GB左右。

Qwen1.5-14B-Chat-GPTQ-Int8 使用vllm部署，显存占用在30G左右。

### 大模型微调

llama2 7B 模型使用 zero

## 其他

### pip依赖

使用Docker构建镜像的时候`llama-index`会自动安装`llama-index-core`，在`llama-index`版本为`0.10.30`
的时候，其依赖的`llama-index-core`版本限定的为`^0.10.30`，表示`llama-index-core`的版本大于等于`0.10.30`小于`1.0.0`
。也就是当`llama-index-core`版本更新之后，安装`llama-index`的`0.10.30`版本会将`llama-index-core`的版本更新到最新。在做RAG
evaluate 的时候由于`llama-index-core`在`0.10.34`
版本在计算指标的时候添加了抛错的逻辑，具体见[Retrieval Metrics: Updating HitRate and MRR for Evaluation@K document…](https://github.com/run-llama/llama_index/commit/b5a57cac26ff45887ca448648bef880aafd50380)
，导致评估在本地测试运行正常，在服务器上使用Docker运行一直报错。

我给官方提交了bug [[Bug]: retrieval evaluation hit rate error
](https://github.com/run-llama/llama_index/issues/13926), 截止2024-6-14，这个BUG还没有修复。

其`pyproject.toml`文件如下

```text
[tool.poetry.dependencies]
python = ">=3.8.1,<4.0"
llama-index-legacy = "^0.9.48"
llama-index-llms-openai = "^0.1.13"
llama-index-embeddings-openai = "^0.1.5"
llama-index-program-openai = "^0.1.3"
llama-index-question-gen-openai = "^0.1.2"
llama-index-agent-openai = ">=0.1.4,<0.3.0"
llama-index-readers-file = "^0.1.4"
llama-index-readers-llama-parse = "^0.1.2"
llama-index-indices-managed-llama-cloud = "^0.1.2"
llama-index-core = "^0.10.30"
llama-index-multi-modal-llms-openai = "^0.1.3"
llama-index-cli = "^0.1.2"
```

### Docker构建相关

使用分阶段构建可以减小最终构建出来的镜像大小。

可以添加apt源，可以加速apt安装速度，和mount cache加快pip依赖的安装。

```
RUN --mount=type=cache,target=/root/.cache/pip \
    cd /build \
    && ${PIP_INSTALL} --prefix=/pkg -r requirements.txt
```

## 参考资料：

- [如何选择向量数据库](https://blog.lidaxia.io/2024/05/07/vector-db-selection/)