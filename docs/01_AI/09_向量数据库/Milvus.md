# Milvus

## Milvus 简介

Milvus 是一个开源的**分布式向量数据库**，由 Zilliz 公司主导开发，是目前功能最完整、生产成熟度最高的开源向量数据库之一。它被设计用于处理**亿级到十亿级**的向量数据，支持高可用部署、多种索引类型和丰富的查询能力。

**核心特点**：
- **高可扩展性**：分布式架构，支持水平扩展，可处理十亿级向量
- **多索引类型**：支持 HNSW、IVF_FLAT、IVF_PQ、DiskANN 等多种索引
- **丰富的查询**：支持向量搜索、标量过滤、混合查询、分区查询
- **Schema 设计**：支持多字段 Schema，向量与标量数据统一管理
- **云原生**：基于 Kubernetes，各组件可独立扩展
- **多语言 SDK**：Python、Java、Go、Node.js 等

**GitHub**: https://github.com/milvus-io/milvus

## Milvus Lite vs 独立部署

| 特性 | Milvus Lite | Milvus Standalone | Milvus Distributed |
|------|-------------|-------------------|--------------------|
| 部署方式 | pip 安装，内嵌运行 | Docker 单机 | Kubernetes 集群 |
| 适用场景 | 开发/测试 | 中小规模生产 | 大规模生产 |
| 数据规模 | < 100万 | < 1亿 | 亿级+ |
| 依赖 | 无 | Docker + etcd + MinIO | K8s + 多组件 |
| 高可用 | 不支持 | 有限 | 完全支持 |
| 安装复杂度 | 极低 | 低 | 高 |

### Milvus Lite（开发阶段）

```bash
pip install pymilvus
```

```python
from pymilvus import MilvusClient

# Milvus Lite：数据存储在本地文件
client = MilvusClient("./milvus_lite.db")
```

## 安装（Docker Compose 独立部署）

```bash
# 下载 docker-compose 配置文件
wget https://github.com/milvus-io/milvus/releases/download/v2.4.0/milvus-standalone-docker-compose.yml \
  -O docker-compose.yml

# 启动服务（包含 Milvus、etcd、MinIO）
docker-compose up -d

# 查看服务状态
docker-compose ps
```

```yaml
# docker-compose.yml 结构说明（简化版）
version: '3.5'
services:
  etcd:          # 元数据存储
    image: quay.io/coreos/etcd:v3.5.5
  minio:         # 对象存储（存向量数据文件）
    image: minio/minio:RELEASE.2023-03-13T19-46-17Z
  standalone:    # Milvus 主服务
    image: milvusdb/milvus:v2.4.0
    ports:
      - "19530:19530"  # gRPC 端口（SDK 连接）
      - "9091:9091"    # HTTP 端口（管理 API）
    depends_on:
      - etcd
      - minio
```

### 安装 Python SDK

```bash
pip install pymilvus openai
```

## PyMilvus 基本使用

### 连接 Milvus

```python
from pymilvus import MilvusClient, connections

# 方式一：MilvusClient（推荐，新版 SDK）
client = MilvusClient(
    uri="http://localhost:19530",
    # token="username:password"  # 如果开启了认证
)

# Milvus Lite（本地文件，无需 Docker）
client = MilvusClient("./milvus.db")

# Zilliz Cloud（托管版）
# client = MilvusClient(
#     uri="https://xxx.zillizcloud.com",
#     token="your-api-key"
# )

print("连接成功")
print(f"已有集合: {client.list_collections()}")
```

## Collection Schema 设计

### 基础 Schema（快速开始）

```python
from pymilvus import MilvusClient

client = MilvusClient("http://localhost:19530")

# 最简单的创建方式（自动 Schema）
client.create_collection(
    collection_name="quick_articles",
    dimension=1536,              # 向量维度
    metric_type="COSINE",        # 距离度量：COSINE / L2 / IP
    auto_id=True                 # 自动生成 ID
)
```

### 自定义 Schema（生产推荐）

```python
from pymilvus import MilvusClient, DataType

client = MilvusClient("http://localhost:19530")

# 定义 Schema
schema = client.create_schema(
    auto_id=False,       # 手动指定 ID
    enable_dynamic_field=True   # 允许动态字段（Schema 外的额外字段）
)

# 添加字段
schema.add_field(
    field_name="id",
    datatype=DataType.INT64,
    is_primary=True       # 主键
)

schema.add_field(
    field_name="title",
    datatype=DataType.VARCHAR,
    max_length=512        # VARCHAR 必须指定最大长度
)

schema.add_field(
    field_name="category",
    datatype=DataType.VARCHAR,
    max_length=64
)

schema.add_field(
    field_name="publish_year",
    datatype=DataType.INT32
)

schema.add_field(
    field_name="score",
    datatype=DataType.FLOAT
)

schema.add_field(
    field_name="embedding",
    datatype=DataType.FLOAT_VECTOR,
    dim=1536              # 向量维度
)

# 创建 Collection
client.create_collection(
    collection_name="articles",
    schema=schema
)

print("Collection 'articles' 创建成功")
```

## 索引类型

Milvus 支持多种向量索引，选择合适的索引是性能优化的关键：

### 索引类型对比

| 索引 | 适用规模 | 内存需求 | 查询速度 | 精度 | 备注 |
|------|----------|----------|----------|------|------|
| FLAT | < 100万 | 高 | 慢（精确） | 100% | 暴力搜索，结果完全精确 |
| IVF_FLAT | 100万-1亿 | 中 | 快 | 高 | 倒排索引，综合性能好 |
| IVF_SQ8 | 100万-1亿 | 低 | 快 | 中 | 量化压缩，内存减少 4-8x |
| IVF_PQ | 100万-10亿 | 极低 | 较快 | 中低 | 乘积量化，内存最省 |
| HNSW | 100万-1亿 | 高 | 极快 | 高 | 推荐首选，查询性能最佳 |
| DiskANN | > 1亿 | 低（磁盘） | 较快 | 高 | 超大规模，数据放磁盘 |

### 创建索引

```python
from pymilvus import MilvusClient

client = MilvusClient("http://localhost:19530")

# HNSW 索引（推荐，查询速度最快）
index_params = client.prepare_index_params()

index_params.add_index(
    field_name="embedding",
    index_type="HNSW",
    metric_type="COSINE",
    params={
        "M": 16,          # 每个节点的最大连接数，范围 [4, 64]
        "efConstruction": 200  # 构建时的候选列表大小，范围 [8, 512]
    }
)

# 也可以对标量字段建立索引（加速过滤）
index_params.add_index(
    field_name="category",
    index_type="",        # 标量字段留空，Milvus 自动选择
    index_name="category_index"
)

client.create_index(
    collection_name="articles",
    index_params=index_params
)

# IVF_FLAT 索引（内存占用更小）
ivf_index_params = client.prepare_index_params()
ivf_index_params.add_index(
    field_name="embedding",
    index_type="IVF_FLAT",
    metric_type="L2",
    params={"nlist": 1024}  # 簇的数量，建议 sqrt(数据量)
)
```

### 加载 Collection 到内存

```python
# 必须先 load，才能进行搜索（将索引加载到内存）
client.load_collection("articles")

# 查看加载状态
load_state = client.get_load_state("articles")
print(f"加载状态: {load_state}")

# 不再使用时释放内存
# client.release_collection("articles")
```

## 插入与查询

### 插入数据

```python
import numpy as np
from pymilvus import MilvusClient

client = MilvusClient("http://localhost:19530")

def random_embedding(dim=1536) -> list[float]:
    vec = np.random.rand(dim).astype(float)
    return (vec / np.linalg.norm(vec)).tolist()

# 准备数据（字典列表格式）
data = []
for i in range(10):
    data.append({
        "id": i + 1,
        "title": f"技术文章 {i+1}",
        "category": ["AI", "数据库", "编程"][i % 3],
        "publish_year": 2023 + (i % 2),
        "score": round(float(np.random.rand()), 2),
        "embedding": random_embedding()
    })

# 插入数据
result = client.insert(
    collection_name="articles",
    data=data
)
print(f"插入成功，主键: {result['ids']}")

# Upsert（存在则更新，不存在则插入）
result = client.upsert(
    collection_name="articles",
    data=[{
        "id": 1,
        "title": "更新后的文章标题",
        "category": "AI",
        "publish_year": 2024,
        "score": 0.95,
        "embedding": random_embedding()
    }]
)
```

### 向量搜索

```python
# 基础向量搜索
query_vec = random_embedding()

results = client.search(
    collection_name="articles",
    data=[query_vec],          # 支持批量查询（列表中多个向量）
    limit=5,                   # Top-K
    output_fields=["title", "category", "score"]  # 返回的字段
)

print("搜索结果:")
for hits in results:           # results 是二维列表（每个查询对应一组结果）
    for hit in hits:
        print(f"  ID: {hit['id']} | 距离: {hit['distance']:.4f}")
        print(f"  标题: {hit['entity']['title']}")
        print(f"  分类: {hit['entity']['category']}")

# 带过滤条件的搜索
results = client.search(
    collection_name="articles",
    data=[query_vec],
    filter="category == 'AI' and publish_year >= 2024",  # 布尔表达式
    limit=5,
    output_fields=["title", "category", "publish_year"]
)

# 混合搜索（向量 + 标量评分融合）
# Milvus 2.4+ 支持多路向量检索融合
```

### 标量查询（不带向量）

```python
# 按条件查询（类似 SQL SELECT WHERE）
results = client.query(
    collection_name="articles",
    filter="category == 'AI'",
    output_fields=["id", "title", "score"],
    limit=10
)

for row in results:
    print(f"ID: {row['id']} | {row['title']} | 评分: {row['score']}")

# 按主键查询
results = client.get(
    collection_name="articles",
    ids=[1, 2, 3],
    output_fields=["title", "category"]
)
```

### 删除数据

```python
# 按主键删除
client.delete(
    collection_name="articles",
    ids=[1, 2, 3]
)

# 按条件删除
client.delete(
    collection_name="articles",
    filter="publish_year < 2023"
)
```

## 分区管理

分区（Partition）是 Milvus 特有的功能，可以将数据按业务逻辑分组，搜索时只扫描相关分区，大幅提升性能：

```python
from pymilvus import MilvusClient

client = MilvusClient("http://localhost:19530")

# 创建分区（按类别分区）
client.create_partition(collection_name="articles", partition_name="AI")
client.create_partition(collection_name="articles", partition_name="数据库")
client.create_partition(collection_name="articles", partition_name="编程")

# 查看分区列表
partitions = client.list_partitions(collection_name="articles")
print(f"分区列表: {partitions}")

# 向指定分区插入数据
ai_data = [
    {
        "id": 100,
        "title": "深度学习入门",
        "category": "AI",
        "publish_year": 2024,
        "score": 0.9,
        "embedding": random_embedding()
    }
]

client.insert(
    collection_name="articles",
    data=ai_data,
    partition_name="AI"  # 插入到 AI 分区
)

# 在指定分区中搜索（只扫描 AI 分区，速度更快）
results = client.search(
    collection_name="articles",
    data=[random_embedding()],
    limit=5,
    partition_names=["AI"],   # 限定分区范围
    output_fields=["title"]
)

# 加载/释放特定分区（节省内存）
client.load_partitions(collection_name="articles", partition_names=["AI"])
client.release_partitions(collection_name="articles", partition_names=["编程"])

# 删除分区（会删除分区内所有数据）
client.drop_partition(collection_name="articles", partition_name="编程")
```

## 完整示例：企业知识库搜索

```python
import os
from openai import OpenAI
from pymilvus import MilvusClient, DataType

openai_client = OpenAI()
milvus_client = MilvusClient("http://localhost:19530")

COLLECTION = "knowledge_base"
DIM = 1536

def get_embedding(text: str) -> list[float]:
    resp = openai_client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return resp.data[0].embedding

# ---- 初始化 Collection ----
def init_collection():
    if milvus_client.has_collection(COLLECTION):
        milvus_client.drop_collection(COLLECTION)

    schema = milvus_client.create_schema(auto_id=False, enable_dynamic_field=True)
    schema.add_field("id", DataType.INT64, is_primary=True)
    schema.add_field("title", DataType.VARCHAR, max_length=512)
    schema.add_field("content", DataType.VARCHAR, max_length=4096)
    schema.add_field("department", DataType.VARCHAR, max_length=64)
    schema.add_field("doc_type", DataType.VARCHAR, max_length=32)
    schema.add_field("embedding", DataType.FLOAT_VECTOR, dim=DIM)

    index_params = milvus_client.prepare_index_params()
    index_params.add_index(
        field_name="embedding",
        index_type="HNSW",
        metric_type="COSINE",
        params={"M": 16, "efConstruction": 200}
    )

    milvus_client.create_collection(COLLECTION, schema=schema, index_params=index_params)
    milvus_client.load_collection(COLLECTION)
    print(f"Collection '{COLLECTION}' 初始化完成")

# ---- 批量索引文档 ----
def index_documents(documents: list[dict]):
    data = []
    for doc in documents:
        embedding = get_embedding(doc["title"] + " " + doc["content"])
        data.append({
            "id": doc["id"],
            "title": doc["title"],
            "content": doc["content"],
            "department": doc["department"],
            "doc_type": doc["doc_type"],
            "embedding": embedding
        })

    milvus_client.insert(collection_name=COLLECTION, data=data)
    print(f"已索引 {len(data)} 个文档")

# ---- 语义搜索 ----
def semantic_search(
    query: str,
    department: str = None,
    doc_type: str = None,
    top_k: int = 5
) -> list[dict]:
    query_embedding = get_embedding(query)

    filters = []
    if department:
        filters.append(f"department == '{department}'")
    if doc_type:
        filters.append(f"doc_type == '{doc_type}'")
    filter_expr = " and ".join(filters) if filters else ""

    results = milvus_client.search(
        collection_name=COLLECTION,
        data=[query_embedding],
        filter=filter_expr if filter_expr else None,
        limit=top_k,
        output_fields=["title", "content", "department", "doc_type"]
    )

    hits = []
    for hit in results[0]:
        hits.append({
            "id": hit["id"],
            "score": hit["distance"],
            "title": hit["entity"]["title"],
            "content": hit["entity"]["content"][:100] + "...",
            "department": hit["entity"]["department"],
        })
    return hits

# ---- 运行示例 ----
init_collection()

sample_docs = [
    {"id": 1, "title": "年假申请流程", "content": "员工每年可享有10天带薪年假，需提前3天通过OA系统申请...", "department": "HR", "doc_type": "policy"},
    {"id": 2, "title": "差旅报销标准", "content": "出差期间住宿费用按城市等级报销，一线城市不超过500元/晚...", "department": "财务", "doc_type": "policy"},
    {"id": 3, "title": "研发环境配置指南", "content": "开发环境要求：Python 3.10+，Docker 24+，配置 virtualenv...", "department": "技术", "doc_type": "manual"},
    {"id": 4, "title": "绩效考核说明", "content": "绩效考核每季度进行一次，分为A/B/C/D四个等级...", "department": "HR", "doc_type": "policy"},
    {"id": 5, "title": "代码审查规范", "content": "所有代码变更必须经过至少一名同级工程师审查才可合并...", "department": "技术", "doc_type": "standard"},
]

index_documents(sample_docs)

# 测试搜索
print("\n--- 搜索: '如何申请休假？' ---")
for hit in semantic_search("如何申请休假？"):
    print(f"  [{hit['score']:.4f}] [{hit['department']}] {hit['title']}")

print("\n--- 搜索: '开发规范'，仅限技术部门 ---")
for hit in semantic_search("开发规范", department="技术"):
    print(f"  [{hit['score']:.4f}] {hit['title']}")
```

## 适用场景

### 推荐使用 Milvus 的情况

1. **超大规模向量数据**：数据量超过 1 亿，需要分布式支持
2. **企业级高可用**：需要多副本、自动故障恢复、滚动升级
3. **复杂索引需求**：需要同时使用多种索引类型，动态切换
4. **多租户隔离**：通过分区实现不同业务线的数据隔离
5. **混合查询**：向量搜索 + 复杂标量过滤 + 聚合统计

### 与其他数据库的选择

```
数据量 < 100万且快速验证  →  Chroma 或 Milvus Lite
数据量 100万-1亿，强过滤  →  Qdrant（更简单）
数据量 > 1亿，企业级      →  Milvus（分布式）
已有 PostgreSQL 系统       →  pgvector（融合业务数据）
不想自己运维              →  Zilliz Cloud（托管 Milvus）
```

## 常见问题

### Q: Milvus 和 Milvus Lite 的数据可以迁移吗？

可以。使用 `pymilvus` 的 `bulk_writer` 工具可以将 Milvus Lite 的数据导出，再导入到 Milvus 独立部署或集群版。

### Q: 插入数据后搜不到？

最常见原因：
1. 没有调用 `client.flush()` 刷新数据（默认自动刷新，也可手动触发）
2. 没有调用 `client.load_collection()` 将 collection 加载到内存
3. 索引还未建立完成（大数据量时索引构建需要时间）

### Q: HNSW 和 IVF_FLAT 怎么选？

- **HNSW**：查询速度最快，适合对延迟敏感的在线服务；内存占用较大
- **IVF_FLAT**：内存占用较小，构建速度快，适合批量离线场景；搜索时需要指定 `nprobe` 参数权衡速度与精度
