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
- PyPDFLoader：使用`pypdf`库加载PDF文件。将page中的text提取出来，图片都使用`rapidocr_onnxruntime`库提取出text，下面的`PDFLoader`的图片也是一样的处理。
- PyPDFium2Loader: 使用`pypdfium2`库加载PDF文件，可以使用HTTP URL加载PDF。
- PyPDFDirectoryLoader：使用`PyPDFLoader`加载一个目录和子目录下面的所有PDF。
- PDFMinerLoader：使用`pdfminer`库加载PDF文件，也可以使用HTTP URL加载PDF。
- WebBaseLoader：加载网页，使用`bs4`库解析。
- UnstructuredMarkdownLoader: 使用`unstructured`库加载Markdown文件，首先会使用markdown库将markdown文件解析成html，然后html的解析方法。**实测会将文件中的标题信息，链接信息，图片信息丢弃掉。不要使用。**。
- Docx2txtLoader: 使用`docx2txt`库加载`docx`和`doc`文件，**会直接把文件中的文本提取出来，表格会直接变成文本，丢失行和列的信息，图片会直接丢弃掉。慎用**。
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

## Unstructured库

`Unstructured`库为RAG应用和微调提供了很多处理非结构化文档的工具。是一个非常强大的文档解析库。

有3中使用方式。

- api：使用api key调用Unstructured的接口解析文件。由 Unstructured 托管，数据处理上限为 1000 页，提交给免费 API 的文档会被`Unstructured`的模型训练和评估。
- Sass 平台：·Unstructured`托管的Sass API，可扩展和安全。数据保持私密。
- 开源框架`Unstructured`库：适合原型设计。 `unstructured` 库提供了一个开源工具包，旨在简化各种数据格式的摄取和预处理，包括图像和基于文本的文档，如 PDF、HTML 文件、Word 文档。

开源框架`Unstructured`可以使用Docker运行或pip安装。 

安装`Unstructured`开源库
```bash
# 安装所有格式的文档解析
pip install "unstructured[all-docs]"
# 安装指定格式的文件解析
pip install "unstructured[docx,md,pdf,csv,docx]"
```



### 总结

- Docx2txtLoader： **会直接把文件中的文本提取出来，表格会直接变成文本，丢失行和列的信息，图片会直接丢弃掉。慎用**。
- UnstructuredMarkdownLoader：**实测会将文件中的标题信息，链接信息，图片信息丢弃掉。不要使用。**Markdow文件的加载基于LlamaIndex框架中的MarkdownReader实现。markdown格式的文件在加载的时候按照`#`进行分隔成多个Document。在分片的时候就不再进行分片了。·
- CSVLoader：使用UTF-8编码格式的文件，在windows上自动识别编码有问题。需要手动指定编码格式。
- docx2，pdf格式可以转换成markdown格式再使用markdown格式来解析。参考[maxkb项目](https://github.com/1Panel-dev/MaxKB/blob/9479741da3bd0d27b762a106e9f5d2d7aefefae5/apps/common/handle/impl/pdf_split_handle.py)。



markdown加载实现示例如下：

```

```



## 分片

文档加载完之后Document对象的长度可能比较长，有可能超过LLM的上下文窗口。所以需要将Document对象进行分片，拆分成小的文本块(chunk)。

Langchain和LlamaIndex常见的splitter对比如下：

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/20240617152636.png)

LangChain框架中的分片是一个单独的包，`langchain-text-splitters`

安装命令如下：

```bash
pip install langchain-text-splitters
```

注意点：

- 对于CSV，EXCEL文件常见的方案是将一行当作一个chunk。
- 对于markdown格式，在加载的时候处理好,通过`#`号，将标题和下面的内容分成一个chunk，不进行分片。
- SentenceSplitter和RecursiveCharacterTextSplitter原理一样，先拆成最小的句子，然后合并到chunk_size大小。
- RecursiveCharacterTextSplitter是递归的进行分片，先通过两个或三个换行符拆分成比较大的chunk，然后在通过一个换行符分成比较小的chunk，然后通过句号、感叹号、问题，逗号，空格等拆成更小的句子。然后在按照chunk_size和overlap合并成一个大小不超过chunk_size的一个大的文本。

## 构建索引

将Document分片之后就需要对分片之后的chunk进行索引，存储到向量数据库或文档数据库中。

### 向量数据库选择

常见的向量数据库专门的向量数据库如：

- Chroma
- Milvus
- Faiss
- Weaviate
- Qdrant

传统的数据库，添加了向量类型的字段，如：

- Elasticsearch
- PostgreSQL
- MongDB

传统的数据库，添加了向量类型的字段，在向量检索的的时候，性能没有专门的向量数据库性能好。所以就排除了传统的数据库。

在开源的向量数据库中，最开始我选择的是Milvus 2.3版本，Milvus支持metadata filter（元数据过滤），但是Milvus 2.3 版本不支持异步，也不支持Hybrid Search（混合检索）。

后来调研发现qdrant的性能非常高，Qdrant采用Rust语言编写，支持Metadata filter（元数据过滤）和Hybrid Search（混合检索），同时支持异步，qdrant的部署非常轻松，直接使用Docker-compose部署一个service就可以，Milvus还需要依赖etcd和MinIO。所以最终选择了qdrant。

其实Milvus向量数据库的功能非常强大，它相比其他向量数据库支持更多的相似度检索算法和指标。在2024年4月份发布的2.4版本也支持了Hybrid Search，但是还是不支持异步。


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

开始我们使用的是m3e-base模型，我们实际的测试中，我们主观上判断有一些分片跟问题是不相关的。但是使用向量数据库检索出来是比较相似的，导致回答效果不好，将Embeding模型切换到beg-base-zh-v1.5之后，上述的问题效果就好了很多。

后面发现切换到beg-base-zh-v1.5了还是有一些问题相似度比较的不好，例如dev环境和开发环境，test环境和测试环境，这个用相似度算法算出来不相似，但是用户需要这类问题要相似性较好。就对bge-base-zh-v1.5模型做了微调，微调之后就解决了前面的的问题，但是我们微调的时候只使用了领域内的数据，没有加入通用数据，微调之后的模型对通用的查询计算相似度的效果更差了。

在2024年1月份，bge发布了bge-m3模型，这个模型支持input长度最大为8192个token，bge-base和m3e-base都是512个token。bge-m3有1024维，bge-base和m3e-base都只有768维。并且bge-m3这一个模型encode之后可以输出稠密的向量和稀疏的向量，可以和向量数据库的Hybrid Search结合起来使用。

后面我们更换到了这个模型，并且配套的Rerank模型也切换到了bge-reranker-v2-m3。
切换到bge-m3之后，针对dev环境和开发环境不相似的问题也没有遇到，就没有继续进行微调Embedding模型了。



**注意：**

- bg3-base和m3e-bae的input max length都为512 token，如果分片的长度大于这个，后面的内容会被截断。导致向量检索的效果不好。
- 切换模型之后，向量数据库中的Embedding数据需要重新用新的模型重新生成，如果模型的维度发生变化之后，需要将向量数据库库中对应的collection先删除再重新生成。
- 我们项目中是使用自定义的reset-dataset命令重新生成的，这个命令会先去删除向量数据库和MongoDB中的旧数据，这个时候向量数据库中的collection已经被删除了，再删除数据的时候会报错，自定义命令需要考虑这种异常情况。



### 存储

在LlamaIndex中，存储相关的类型主要分为

- Document store: 用来存储node(Document` 继承自 `TextNode`，`TextNode`继承自`BaseNode)，一般是用来存储分片后的text和元数据。
- Index Store：用来存储索引，索引是构造了一个结构将Document store和Vector Store中的数据的一个关联关系。一般采用Redis存储索引。
- Vector Store：用来存储向量数据，有的向量数据库支持存储元数据（可以把分片后的text存进去），比如pgvector,Milvus，qdrant都可以。
- Key Value Store：一般不会直接使用，是IndexStore或DocumentStore的父类。

![image-20240619164119734](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240619164119734.png)

最开始我们只使用了milvus向量数据库，用Milvus同时存储向量和文档数据，后面切换到了Qdrant向量数据库。

在添加Bm25检索的时候发现，BM25检索需要将所有的text先查询出来，然后使用BM25算法计算分数。LlamaIndex中的VectorRetriever在检索的时候必须通过向量字段+metadata字段（一般是JSON格式）才能过滤，如果要去掉向量字段，需要根据向量数据库的接口去开发过滤的方法，比较麻烦。同时，向量数据库在对metadata字段过滤的时候，性能没有传统的数据库性能好。

然后我将Document Store加上了，并且使用postgreSQL数据库充当Document Store，用Redis作为Index Store。然后发现在查询文档的时候，node的格式是一个层数较多的JSON，使用postgreSQL查询性能慢，查询SQL编写复杂。于是将postgreSQL数据库更换成对JSON格式更友好的MongoDB数据库。使用MongoDB存储分片的node数据（MongoDB中不包含Embedding，Qdrant中包含了Embedding），并且MongoDB可以针对JSON中的某些字段创建索引来加快查询速度。

在我们的项目中，用户需要新建一个数据集，然后对这个数据集上传多个文件。用户在对话的时候必须选择某一个数据集进行对话。

在查询相关文档的时候首先需要先根据数据集的ID查询到对应的文件ID，然后通过文件ID查询到对应的IndexId,然后去Redis中将所有的node_id查询到，然后通过向量数据库使用相似度算法查询对应的node_id列表的数据，然后返回topK个数据。

查询的链路太长，如果数据量大的话，node_ids的列表会很大，可能会导致查询时间很长。

为了解决这个问题，我将数据集ID，文件ID，文件名等放到node对象的metadata属性中，然后存储到MongoDB和向量数据库的时候都会存储到。在检索的时候添加根据数据集ID过滤的条件。


向量数据库添加dataset_id过滤的示例代码如下，重点是重写了`_retrieve`方法，添加了`dataset_id`参数。其中调用了`_get_nodes_with_embeddings`方法，这个方法也添加了`dataset_id`参数。然后在`_build_vector_store_query`方法中通过添加了`dataset_id`相关的`MetadataFilter`。

```python
class VectorStoreRetriever(KaBaseRetriever):


    def _retrieve(
            self,
            query_bundle: QueryBundle,
            dataset_id: str = None
    ) -> List[NodeWithScore]:
        logger.debug(f"Vector _retrieve: {dataset_id=}, {query_bundle.query_str=}, {query_bundle.embedding_strs=}")
        logger.debug(f"is_embedding_query: {self._vector_store.is_embedding_query}")
        res = []
        if self._vector_store.is_embedding_query:
            if query_bundle.embedding is None and len(query_bundle.embedding_strs) > 0:
                for embedding_str in query_bundle.embedding_strs:
                    new_query_bundle = QueryBundle(query_str=embedding_str)
                    new_query_bundle.embedding = self._embed_model.get_text_embedding(
                        embedding_str
                    )
                    one_query_res = self._get_nodes_with_embeddings(
                        new_query_bundle, dataset_id=dataset_id
                    )
                    res.extend(one_query_res)
            else:
                res = self._get_nodes_with_embeddings(query_bundle, dataset_id=dataset_id)
        else:
            res = self._get_nodes_with_embeddings(query_bundle, dataset_id=dataset_id)
        logger.debug(f"Vector _retrieve before filter: {len(res)=}")
        return res

    def _get_nodes_with_embeddings(
            self, query_bundle_with_embeddings: QueryBundle,
            dataset_id: str = None
    ) -> List[NodeWithScore]:
        query = self._build_vector_store_query(query_bundle_with_embeddings, dataset_id=dataset_id)
        query_result = self._vector_store.query(query, **self._kwargs)
        return self._build_node_list_from_query_result(query_result)

    def _build_vector_store_query(
            self, query_bundle_with_embeddings: QueryBundle,
            dataset_id: str = None
    ) -> VectorStoreQuery:
        query = VectorStoreQuery(
            query_embedding=query_bundle_with_embeddings.embedding,
            similarity_top_k=self._similarity_top_k,
            node_ids=self._node_ids,
            doc_ids=self._doc_ids,
            query_str=query_bundle_with_embeddings.query_str,
            mode=self._vector_store_query_mode,
            alpha=self._alpha,
            filters=self._filters,
            sparse_top_k=self._sparse_top_k,
        )

        if dataset_id:
            dataset_filter = MetadataFilter(key="dataset_id", value=dataset_id, operator=FilterOperator.EQ)
            if query.filters is None:
                query.filters = MetadataFilters(
                    filters=[dataset_filter], condition=FilterCondition.AND
                )
            else:
                q_filters = query.filters.filters
                q_filters.append(dataset_filter)
                query.filters = MetadataFilters(filters=[q_filters], condition=FilterCondition.AND)
        return query        
   
```        

BM25Retrievar代码示例如下，也是在`_retrieve`方法中添加了`dataset_id`参数，`_retrieve`方法中调用了`get_nodes`方法，`get_nodes`方法中调用了`doc_store`的`get_docs`方法：
```python
class BM25Retriever(KaBaseRetriever):
    """
    实例化时需要传 dataset_id 获取对应的nodes
    """

    def get_nodes(self, dataset_id: str) -> List[TextNode]:
        nodes = self.doc_store.get_docs(dataset_id=dataset_id)
        return nodes


    def _retrieve(self, query_bundle: QueryBundle, dataset_id: str = None) -> List[NodeWithScore]:
        logger.debug(f"BM25 _retrieve: {dataset_id=}, {query_bundle.query_str=}, {query_bundle.embedding_strs=}")
        nodes = self.get_nodes(dataset_id=dataset_id)
        logger.debug(f"BM25 _retrieve nodes length: {len(nodes)}")
        if nodes:
            scred_nodes = bm25_utils.get_scored_nodes(query=query_bundle.query_str, nodes=nodes)
            # 去除分数为0.0的数据
            remoeve_nodes = [node for node in scred_nodes if node.score > 0.0]
            top_k_nodes = remoeve_nodes[: self._similarity_top_k]
            logger.debug(f"BM25 _retrieve before mean filter: {len(top_k_nodes)=}")
            return top_k_nodes
        else:
            logger.warning("BM25 _retrieve nodes is empty list")
            return []

```

其中MongoDB对应的doc_sotre的实现如下：
```python
class KaMongoDocumentStore(MongoDocumentStore):

    def get_docs(self, dataset_id: str = None, file_id: str = None) -> t.List[Document]:
        """获取documents

        Args:
            dataset_id(str): 数据集ID
            file_id(str): 文件ID

        Returns:

        """
        db: Database = self._kvstore._db
        collection: Collection = db[self._node_collection]
        find_filter = {}
        if dataset_id:
            find_filter.update({"__data__.metadata.dataset_id": dataset_id})
        if file_id:
            find_filter.update({"__data__.metadata.file_id": file_id})
        results = collection.find(find_filter)
        res = []
        for result in results:
            _ = result.pop("_id")
            doc = json_to_doc(result)
            res.append(doc)
        return res
```

其中PostgreSQL对应的doc_store实现如下：

```python
class KaPostgresDocumentStore(PostgresDocumentStore):

    def get_docs(self, dataset_id: str = None, file_id: str = None):
        """获取documents

        Args:
            dataset_id: 数据集ID
            file_id: 文件ID

        Returns:

        """
        # 通过sql查询出对应的数据
        # SELECT *
        # FROM data_docstore
        # WHERE value->'__data__'->'metadata'->>'dataset_id' = '39c2f32e-eb6f-437d-9cfc-557287554219';
        # TODO postgreSQL 这里会有性能问题，需要优化，具体可参考 KaMongoDocumentStore
        docs = self.docs
        nodes = []
        for i, doc in docs.items():
            d_id = doc.metadata.get("dataset_id", None)
            f_id = doc.metadata.get("file_id", None)
            if dataset_id and file_id:
                if d_id == dataset_id and f_id == file_id:
                    nodes.append(doc)
            elif dataset_id and not file_id:
                if d_id == dataset_id:
                    nodes.append(doc)
            elif not dataset_id and file_id:
                if f_id == file_id:
                    nodes.append(doc)
            else:
                nodes.append(doc)

        return nodes
```

## 检索前处理

### 意图识别


在实际测试中，有一些场景，用户问的问题不够明确，我们需要识别用户的意图，并且需要用户补充一些信息，等所需意图需要的信息补全之后再进行检索和回答。

例如：

当用户询问“数据库账号和密码是多少时”，需要先识别处用户是在询问中间件的配置，然后需要让用户补充是哪个环境如开发环境、试环境、生成环境等，哪个平台或系统如AI平台、ASS平台、IOT平台等，哪个服务或应用如用户服务、标注服务、训练服务等。

等用户对应意图的所有信息补全之后再进行检索和回答。

流程图如下：

![image-20240619161902911](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/image-20240619161902911.png)

### 重写query

在我们实际的测试中，我们发现RAG系统在多轮对话中会遇到一些问题。

比如： 用户首先询问了北京有什么好吃，然后又问了上海有什么好吃的，接着问"它比北京多那些好吃的”，这类的代词在前面的问答中的例子。

在实际检索的的时候最新的这个query中没有出现北京这个关键字，会导致检索不好相关的文档，从而导致回答的不好。针对这种情况需要结合历史问答和当前query重写query，将其中的一些代词替换掉。

核心思想是使用大模型根据历史信息和旧的query进行重写成功新的query，然后拿新的query去检索。



**注意点：**

- 如果历史信息和当前query不相关时，让大模型去除的效果不好。可以先调用rerank model将跟query相关的历史信息找出来。再改写。
- 提示词模板中有JSON输出的时候只能用LangChain框架，并且需要指定使用jinja2格式化。



提示词示例如下：

```
# Role
query改写器
## Skills
- 精通中英文
- 精通分析总结；优秀的写作能力；
- 能够理解文本
- 精通JSON数据格式
## Action
- 根据提供的历史问答列表和一个旧的query，改写新的query，并以JSON格式输出
## Constrains
- 历史问答中有可能跟当前query不相关，你需要先将不相关的问答去掉，然后再改写。如果历史问答都不相关则不进行改写。
- 在改写过程中，确保语言风格一致。
- 将旧query中的代词根据历史问答的内容替换成相应的词语，同时不改变旧query的原意。
- 必须保证你的结果只包含一个合法的JSON格式
## Format
- 对应JSON的key为：old_query, new_query
## Example
--------------------------------------------------------------------------------------------
历史问答列表：
1. 问题：哪一年是法国大革命开始的？回答：1789年是法国大革命的开始。
2. 问题：艾菲尔铁塔建于哪一年？回答：艾菲尔铁塔建于1889年。
3. 问题：dev环境的RabbitMQ地址是什么？回答：dev环境的RabbitMQ地址是 dev.example.com:5672。
old_query：用户名密码是多少？
Answer：
​```json
{
  "old_query": "用户名密码是多少？",
  "new_query": "dev环境的RabbitMQ的用户名密码是多少？"
}
​```--------------------------------------------------------------------------------------------
历史问答列表：
1. 问题：哪一年是法国大革命开始的？回答：1789年是法国大革命的开始。
2. 问题：艾菲尔铁塔建于哪一年？回答：艾菲尔铁塔建于1889年。
3. 问题：中华人民共和国是哪一年成立的？回答：中华人民共和国成立于1949年。
old_query：Redis的用户名密码是多少？
Answer：
​```json
{
  "old_query": "Redis的用户名密码是多少？",
  "new_query": "Redis的用户名密码是多少？"
}
​```--------------------------------------------------------------------------------------------
## History and old query
历史问答列表：
{{ historys }}
old_query：{{ old_query }}
Answer：
```



## 检索策略

在我们的项目中检索策略叫做查询引擎（queryEngine)，参考LlamaIndex中的QueryEngine的原理，但是不做大模型生成，只做检索。

检索策略分为两种类型，单个查询查询引擎，多个查询引擎（这个我们叫做组合索引）。

查询引擎的流程图如下：

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/images/20240619173022.png)

### 单个查询查询引擎（SingleQueryEngine）

三个查询引擎主要分为3个步骤:

- 第一步：查询转换（QueryTransform）
- 第二步：使用retriever（VectorRetriever或者BM25Retriever)进行检索
- 第三步：对node列表执行postprocess操作，postprocess操作是一个列表，链式的执行postprocess操作。

#### 查询转换

主要实现了两种方法：

- HyDE：使用大模型针对query生成一个假设性的回答。然后根据回答去检索相关的文档。**实测下来这个方法效果很差，不建议使用。**
- MultiQuestion：使用大模型针对query生成多个相似的问题，然后根据原问题和相似的问题去检索。**实测这种方法能提高一些检索的精度，但是这种方法多了一次大模型接口调用，会导致接口的响应时间变长，需要实际时间情况选择。在我们的项目中没有使用这种方法。**

可以参考 [https://github.com/langchain-ai/rag-from-scratch/blob/main/rag_from_scratch_5_to_9.ipynb](https://github.com/langchain-ai/rag-from-scratch/blob/main/rag_from_scratch_5_to_9.ipynb) 查看更多详细信息。


注意：在使用多个Query进行检索的时候，LlamaIndex框架中的VectorRetriever默认会将多个Query进行Embedding然后求平均值，然后拿着求平均值之后的Embedding去向量数据库中检索。这里我们做了优化，我们是根据每个Query进行检索，然后将结果加到到一个集合中。

注意，这个地方没有进行去重，主要有2个原因：
1. 有MRR的后处理，如果这里去重了就会导致MRR的后处理无法生效。
2. 有单独的去重后处理操作。

```python

    def _retrieve(
            self,
            query_bundle: QueryBundle,
            dataset_id: str = None
    ) -> List[NodeWithScore]:
        logger.debug(f"Vector _retrieve: {dataset_id=}, {query_bundle.query_str=}, {query_bundle.embedding_strs=}")
        logger.debug(f"is_embedding_query: {self._vector_store.is_embedding_query}")
        res = []
        if self._vector_store.is_embedding_query:
            if query_bundle.embedding is None and len(query_bundle.embedding_strs) > 0:
                for embedding_str in query_bundle.embedding_strs:
                    new_query_bundle = QueryBundle(query_str=embedding_str)
                    new_query_bundle.embedding = self._embed_model.get_text_embedding(
                        embedding_str
                    )
                    one_query_res = self._get_nodes_with_embeddings(
                        new_query_bundle, dataset_id=dataset_id
                    )
                    res.extend(one_query_res)
            else:
                res = self._get_nodes_with_embeddings(query_bundle, dataset_id=dataset_id)
        else:
            res = self._get_nodes_with_embeddings(query_bundle, dataset_id=dataset_id)
        logger.debug(f"Vector _retrieve before filter: {len(res)=}")
        return res

```



#### 向量检索

一般的RAG系统的进行向量检索的时候是针对整个向量数据库进行相似度计算，然后返回TopK条结果。

当数据量较少或要求检索到的不相关node较少时，使用topK很大概率会返回无关的node。**所以使用向量检索一定要加后处理去过滤无关的node。**我们目前使用的是按照分数的平均值过滤。

同时为了加快检索效率添加了metadata filter，需要重写`Retriever`的`_build_vector_store_query`方法。

示例如下：

```python
  def _build_vector_store_query(
            self, query_bundle_with_embeddings: QueryBundle,
            dataset_id: str = None
    ) -> VectorStoreQuery:
        query = VectorStoreQuery(
            query_embedding=query_bundle_with_embeddings.embedding,
            similarity_top_k=self._similarity_top_k,
            node_ids=self._node_ids,
            doc_ids=self._doc_ids,
            query_str=query_bundle_with_embeddings.query_str,
            mode=self._vector_store_query_mode,
            alpha=self._alpha,
            filters=self._filters,
            sparse_top_k=self._sparse_top_k,
        )
        
		# dataset_id 参数是必传的
        if dataset_id:
            dataset_filter = MetadataFilter(key="dataset_id", value=dataset_id, operator=FilterOperator.EQ)
            if query.filters is None:
                # 没有其他的filter，那就只使用dataset_id过滤
                query.filters = MetadataFilters(
                    filters=[dataset_filter], condition=FilterCondition.AND
                )
            else:
                # 有其他的filter，添加dataset_id过滤的条件
                q_filters = query.filters.filters
                q_filters.append(dataset_filter)
                query.filters = MetadataFilters(filters=[q_filters], condition=FilterCondition.AND)
        return query

```



另外在使用MultiQuestion的QueryTransform时，LlamaIndex框架的VectorRetriever默认会先对embedding_strs进行embeding然后求均值，最后拿着求完均值之后的embeding检索。我认为应该对每一个query都去检索，将所有的query查询合并起来再去重。要实现这个效果，需要重写`_retrieve`方法。示例如下：

```python
    def _retrieve(
            self,
            query_bundle: QueryBundle,
            dataset_id: str = None
    ) -> List[NodeWithScore]:
        logger.debug(f"Vector _retrieve: {dataset_id=}, {query_bundle.query_str=}, {query_bundle.embedding_strs=}")
        logger.debug(f"is_embedding_query: {self._vector_store.is_embedding_query}")
        res = []
        if self._vector_store.is_embedding_query:
            if query_bundle.embedding is None and len(query_bundle.embedding_strs) > 0:
                for embedding_str in query_bundle.embedding_strs:
                    new_query_bundle = QueryBundle(query_str=embedding_str)
                    new_query_bundle.embedding = self._embed_model.get_text_embedding(
                        embedding_str
                    )
                    one_query_res = self._get_nodes_with_embeddings(
                        new_query_bundle, dataset_id=dataset_id
                    )
                    res.extend(one_query_res)
            else:
                res = self._get_nodes_with_embeddings(query_bundle, dataset_id=dataset_id)
        else:
            res = self._get_nodes_with_embeddings(query_bundle, dataset_id=dataset_id)
        logger.debug(f"Vector _retrieve before filter: {len(res)=}")
        return res
```



#### BM25检索

Bm25检索的时候发现，需要将所有的text先查询出来，然后使用BM25算法计算分数。

当query中有中文的时候，需要手动指定停用词，停用词可以针对所有的text使用jieba分词得到。

rank_bm25 库，当`keyword`占比`corpus`的50%时，会导致分数为0,这个问题截止2024-6-17 22:34:52还没有修复。我给它提了PR，作者还没合并。[BUG链接见这里](https://github.com/dorianbrown/rank_bm25/issues/39), [PR 链接见这里](https://github.com/dorianbrown/rank_bm25/pull/40)

修复后的代码如下：

```python
def tokenize_remove_stopwords(text: str) -> List[str]:
    # 文本分词
    seg_list_exact = jieba.lcut(text)
    result_list = []
    # 读取停用词库 current_path / "xx.txt"
    stopwords_hit_path = current_path.joinpath('stopwords_hit.txt')
    with open(stopwords_hit_path, encoding='utf-8') as f:  # 可根据需要打开停用词库，然后加上不想显示的词语
        con = f.readlines()
        stop_words = set()
        for i in con:
            i = i.replace("\n", "")  # 去掉读取每一行数据的\n
            stop_words.add(i)
    # 去除停用词并且去除单字
    for word in seg_list_exact:
        if word not in stop_words and len(word) > 1:
            result_list.append(word)
    return result_list


class MyBM25Okapi(BM25Okapi):
    def _calc_idf(self, nd):
        """
        BM25Okapi 开源项目中当token占文档比例的50%时，idf计算出来会变成0，导致分数为0，
        Issues 见： https://github.com/dorianbrown/rank_bm25/issues/39
        我提交了PR 作者还没有合并，所以先继承这个类，重写它的方法
        将计算公式修改成下面的公式可以解决这个问题
        """
        # collect idf sum to calculate an average idf for epsilon value
        idf_sum = 0
        # collect words with negative idf to set them a special epsilon value.
        # idf can be negative if word is contained in more than half of documents
        negative_idfs = []
        for word, freq in nd.items():
            idf = math.log(self.corpus_size + 1) - math.log(freq + 0.5)
            self.idf[word] = idf
            idf_sum += idf
            if idf < 0:
                negative_idfs.append(word)
        self.average_idf = idf_sum / len(self.idf)

        eps = self.epsilon * self.average_idf
        for word in negative_idfs:
            self.idf[word] = eps


class Bm25Utils(object):
    def __init__(self, tokenizer=None):
        self.tokenizer = tokenizer or tokenize_remove_stopwords

    def get_scored_nodes(self, query: str = "", nodes: List[TextNode] = None) -> List[NodeWithScore]:
        """
        根据BM25算法计算节点与查询的相似度分数
        :param query: 查询
        :param nodes: 节点列表
        :return: 节点列表，每个节点包含相似度分数
        """
        if not nodes:
            return []

        # filter empty text node
        corpus = []
        have_value_nodes = []
        for node in nodes:
            content = node.get_content()
            if content:
                have_value_nodes.append(node)
                token = self.tokenizer(content)
                corpus.append(token)
        if not corpus:
            return []

        bm25_api = MyBM25Okapi(corpus)
        tokenized_query = self.tokenizer(query)
        doc_scores = bm25_api.get_scores(tokenized_query)

        scored_nodes = []
        for i, node in enumerate(have_value_nodes):
            scored_nodes.append(NodeWithScore(node=node, score=float(doc_scores[i])))

        result = sorted(scored_nodes, key=lambda x: x.score or 0.0, reverse=True)
        return result


bm25_utils = Bm25Utils()

```



#### 检索后处理

当使用向量检索或BM25检索到nodes之后，需要对检索的的数据做一些处理，让数据更准确。



主要实现了下面的几种方法：

- 去重，根据node的text的hash值去重。
- 重排，向量相似度检索到的数据是比较相似的，但是这个数据跟query不一定是相关的，所以需要通过rerank model进行重排，重排之后会计算出一个分数，范围为0到1，越接近1说明越相关。重排之后一般会通过一个阈值过滤掉不相关的数据，阈值一般设置的0.1.
- 根据平均值过滤，根据nodes计算出分数的平均数，然后将大于等于平均数的node返回。这个方法可以使检索到的数据中无关信息更少，但是同时可能会筛除掉一些可能相关的数据。
- 使用Kmeans聚类算法过滤。**实测这种方法效果不好，会将很多相关的数据去掉。**
- 使用RRF算法排序，这种算法跟去重的效果差不多。
- 使用BM25算法过滤，这种策略是先进行向量数据库检索然后使用BM25算法过滤。实测效果，很多情况下数据全部都被过滤了。



将上述的所有方法排列组合能组合10+种组合。其中使用MultiQuestion+向量数据库+重排的效果最好。

单一的查询引擎的效果都只能达到70%的准确度。再想提高就需要使用组合检索了。



### 多个查询引擎（MultiQueryEngine 组合索引）

组合索引就是将多个单个查询引擎的结果组合起来了。比如向量数据库，ES，数据库，BM25检索等等。从不同的数据源获取数据，然后合并起来。在进行合并后处理。



#### 合并策略

合并策略主要实现了3种。

- Extend合并，将多个SingleQueryEngine的结果放到一个列表中（这里会做去重操作）
- 求交集，对多个SingleQueryEngine的结果求交集（实测效果很差，经常求交集之后就是空集了，容易漏掉相关文档。不建议使用）
- RRF算法，跟Extend效果差不多，主要区别在于node的顺序不一样。



#### 合并后处理

合并后的处理跟SingleQueryEngine中的后处理是通用的。

多个查询引擎组合起来也有10+种。实测，向量+BM25检索+Extend合并，然后使用Rerank和mean_filter的后处理效果最好。



## 提示词模板

Langchain和llamaIndex的prompt模板中默认都是使用f-string去格式化的。如果提示词模板中出现了大括号如`{xxx}`，就会格式化报错。Langchain框架可以通过参数设置成jinja2来格式化。LlamaIndex框架暂时没有修复这个问题。

提示词模板优化技巧

- 分片之间添加分隔符，HTML标签等
- 添加角色和任务描述
- few-shot 添加相似样例，可以就静态也可以是动态
- Chain-of-thought
- 添加限制，必须怎么怎么样、不要怎么怎么样、禁止怎么怎么样
- 添加输入输出格式的描述



## 大模型相关



### 模型选择

#### 大模型

最开始我们使用的Chatglm3-6B的模型，在使用过程中，很多问题上下文已经很正确了还是回答不好。后面有切换到qwen1.5-7B，效果也差不多。然后将模型换成qwen1.5-14B-int8的模型，效果有了很明显的提升。但是针对比较复杂的提示词，如根据历史信息重写，或者RAG评估中根据text生成query的效果也不好。

#### Embedding模型

Embeding模型从m3e-base，到bge-base-zh-v1.5到微调beg-base-zh再到bge-m3。

#### Rerank模型

Rerank模型开始使用的是bge-reranker-base，后面使用的是bge-reranker-v2-m3，这个模型没有更换过其他的，也没进行微调。实测下来在重排的时候，有些文档跟query其实不是特别的相关，但是rerank的分数比较高。还遇到过最相关的文档分数不是最高的，在倒数第3的问题。为了在垂直领域效果更好，可能需要对rerank模型进行微调。



### 模型推理框架

#### Embeding模型推理

Embeding模型使用bge模型使用的是Fastchat框架部署的。在使用m3e-base的时候Fastchat对m3e-base的支持不是很好，直接使用FastAPI和`SentenceTransformers`封装了一下然后提供embeding的接口。

huggingface官方使用Rust语言写的[text-embeddings-inference框架](https://github.com/huggingface/text-embeddings-inference)性能非常好，比使用onnx性能还要好一丢丢。后续可以尝试使用这个部署Embeding模型。


注意：这里开始使用了Flask框架和Gunicorn库封装接口，但是当worker数量大于1的时候，使用Gunicorn框架会报`RuntimeError: Cannot re-initialize CUDA in forked subprocess. To use CUDA with multiprocessing, you must use the 'spawn' start method`。

原因是Gunicorn的启动Web服务的时候，Gunicorn 默认会使用 `fork` 的方式创建进程。在调用接口的时候会报错`RuntimeError: Cannot re-initialize CUDA in forked subprocess. To use CUDA with multiprocessing, you must use the 'spawn' start method`。

解决办法：

- 使用uvicorn框架和fastapi框架启动，启动的时候可以制定多个进程，如果指定多个进程，GPU上会加载多次模型，对显存会有影响。参数格式如：`uvicorn main:app --host 0.0.0.0 --port 5000 --loop uvloop --workers 4`
- 或者使用Gunicorn框架启动的时候指定只启动一个进程，Gunicorn启动多个进程还是会出现上面的错误，只能指定一个进程。参数格式如：`gunicorn -w 1 -b 0.0.0.0:5000 main:app`
- 使用uwsgi框架启动，在指定了只启动一个进程，并且不能加上`--master参数`。uwsgi框架指定`--master`参数也会出现上面的错误，指定多个进程也会出现上面的错误。参数格式如：`uwsgi --http 0.0.0.0:5000 -p 1 -w main:app --enable-threads`


#### LLM推理

chatglm3-6b和qwen1.5-7B都是使用的fastchat框架部署的。其中Fastchat对Chatglm3-6B的支持不是很好，有的时候回答会出现中英文混杂的情况。

后面切换到qwen1.5-14B-int8之后使用的vllm框架部署。

还调研过ollam框架，类似与Docker的概念。服务启动之后不能停止，只能删除，删除之后模型文件就没有了，下一次启动又要重新下载模型。体验不好就没用了。

还了解过llama.cpp框架，可以支持CPU和GPU混合推理，据说性能很好，没有实际用过。

#### Rerank模型推理

Rerank模型是使用FastAPI框架将`SentenceTransformers `做了一下封装实现的重排接口。



### 模型显存占用

#### 训练

大模型训练一般都是使用的混合精度和Adam优化器。

假设模型的参数W大小是 $ \Phi $ ，**以byte为单位**，存储如下：

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

**注意：这里计算的显存占用只考虑了模型状态，实际上还有剩余状态（包括激活值（activation）、各种临时缓冲区（buffer）以及无法使用的显存碎片（fragmentation）），以ZeRO-3 训练的时候，实际显存会大于 28 GB，训练可能会报OOM的错误。如果想要在ZeRO-1和ZeRO-2能够训练需要使用offload技术。**

实测 XuanYuan-6B 全量二次预训练，使用2机4卡（一台服务器A100 40G * 2，一台服务器 V100 *2）ZeRO-3-Offload才能训练起来，而且还要将batch_size设置成1才行。执行时间非常久，跑一晚上才训练700个setps，1000万调数据，训练一个epoch完需要11年。

#### 微调


采用LORA微调显存资源占用不大，一张A100（40G）就可以微调7B大小的模型，几百条数据大概需要训练5个小时。



LoRA的原理是在原来的模型中的Linner、Embedding、Cov2d、Cov1d层，将这些层改成LoRALayter。LoRALayer中会将原来的参数冻结，然后添加两个低秩的矩阵A，B，在训练的时候会更新两个小矩阵，然后推理的时候会通过原来的权重和小矩阵的结果一起计算。

在LlamaFactory框架中调用了`peft`这个框架做LoRA的微调，LlamaFactory中制作了LoRAConfig的的封装，然后通过`get_peft_model`获取修改模型结构之后的model。

使用LlamaFactory框架微调，将数据整理好执行llama-factory-cli启动就行。

Qwen14B的模型Lora微调，单机多卡（A100 40G * 2）训练的时候显存占用大概在30个G。在加载完模型的时候会有一瞬间显存达到38G左右然后就保持在30G左右。

默认情况下下使用的是torchrun命令启动的，传递deepseed JSON配置可以支持deepspeed Zero。

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

- chatglm3-6B 使用fastchat框架显存占用14GB左右。

- Qwen1.5-7B 使用fastchat框架显存占用16GB左右。
- embeding 模型(beg-base-zh)大概占用1G显存、rerank模型(bge-rerank-base)占用6G显存。
- Qwen1.5-14B-int8，使用vllm框架推理显存占用30G左右（使用的kv-cache)占用的空间会大一些，使用Fastchat框架的model_worker启动大概占用22G显存

## 其他

### pip依赖

使用Docker构建镜像的时候`llama-index`会自动安装`llama-index-core`，在`llama-index`版本为`0.10.30`
的时候，其依赖的`llama-index-core`版本限定的为`^0.10.30`，表示`llama-index-core`的版本大于等于`0.10.30`小于`1.0.0`
。也就是当`llama-index-core`版本更新之后，安装`llama-index`的`0.10.30`版本会将`llama-index-core`的版本更新到最新。在做RAG
evaluate 的时候由于`llama-index-core`在`0.10.34`
版本在计算指标的时候添加了抛错的逻辑，具体见[Retrieval Metrics: Updating HitRate and MRR for Evaluation@K document…](https://github.com/run-llama/llama_index/commit/b5a57cac26ff45887ca448648bef880aafd50380)
，导致评估在本地测试运行正常，在服务器上使用Docker运行一直报错。

我给官方提交了bug [[Bug]: retrieval evaluation hit rate error
](https://github.com/run-llama/llama_index/issues/13926), 截止2024-7-30，这个BUG还没有修复。

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
- [一文通透Text Embedding模型：从text2vec、openai-text embedding到m3e、bge](https://blog.csdn.net/v_JULY_v/article/details/135311471)
