# Qdrant

## Qdrant 简介

Qdrant（发音：quadrant）是一个用 **Rust** 编写的高性能向量数据库，专为生产环境设计。它在保持易用性的同时，提供了强大的过滤能力和卓越的查询性能。

**核心特点**：
- **高性能**：Rust 实现，单机可处理亿级向量，毫秒级查询响应
- **强大过滤**：Payload Filter 支持复杂的结构化过滤，过滤与向量搜索协同优化
- **灵活部署**：支持本地 Docker、Kubernetes、Qdrant Cloud 托管
- **多协议**：同时支持 REST API 和 gRPC，高吞吐场景选 gRPC
- **丰富索引**：支持 HNSW，可配置精度/速度权衡
- **多向量支持**：一个文档可以存储多个不同的向量（如标题向量 + 内容向量）

**适用场景**：生产级语义搜索、RAG 系统、推荐系统，数据量从百万到亿级。

## 安装与部署

### Docker 部署（推荐）

```bash
# 拉取并启动 Qdrant（生产环境推荐加数据持久化挂载）
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant

# 参数说明：
# 6333: REST API 端口
# 6334: gRPC 端口
# -v: 将数据持久化到本地目录（重启后数据不丢失）
```

```yaml
# docker-compose.yml（推荐方式）
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    environment:
      - QDRANT__SERVICE__GRPC_PORT=6334
    restart: unless-stopped

volumes:
  qdrant_storage:
```

```bash
docker-compose up -d
```

### 安装 Python SDK

```bash
pip install qdrant-client openai
```

### 验证服务是否正常

```bash
# 访问 REST API
curl http://localhost:6333/

# 访问 Web UI（Qdrant 内置管理界面）
# 浏览器打开 http://localhost:6333/dashboard
```

## Python SDK 基本使用

### 创建客户端连接

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

# 连接本地 Docker 实例
client = QdrantClient(host="localhost", port=6333)

# 连接 Qdrant Cloud（托管版）
# client = QdrantClient(
#     url="https://your-cluster.qdrant.io",
#     api_key="your-api-key"
# )

# 内存模式（仅用于测试，数据不持久化）
# client = QdrantClient(":memory:")

# 验证连接
info = client.get_collections()
print(f"连接成功，当前 collections: {[c.name for c in info.collections]}")
```

## Collection 配置

### 创建 Collection

```python
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, HnswConfigDiff, OptimizersConfigDiff
)

client = QdrantClient(host="localhost", port=6333)

# 基础配置：创建一个余弦相似度的 1536 维 collection
client.create_collection(
    collection_name="articles",
    vectors_config=VectorParams(
        size=1536,              # 向量维度，必须与 Embedding 模型一致
        distance=Distance.COSINE  # 距离度量：COSINE / EUCLID / DOT
    )
)

# 高级配置：自定义 HNSW 索引参数
client.create_collection(
    collection_name="articles_optimized",
    vectors_config=VectorParams(
        size=1536,
        distance=Distance.COSINE,
        on_disk=False           # True 表示向量存磁盘（节省内存）
    ),
    hnsw_config=HnswConfigDiff(
        m=16,                   # 每个节点的连接数，越大精度越高，内存越大
        ef_construct=100,       # 构建时的搜索宽度，越大精度越高，构建越慢
        full_scan_threshold=10000  # 小于此数量时直接全量扫描
    ),
    optimizers_config=OptimizersConfigDiff(
        indexing_threshold=20000  # 超过此数量才建立向量索引
    )
)

# 多向量配置：一个点存多个向量（如标题和内容分别向量化）
from qdrant_client.models import NamedVectorParams

client.create_collection(
    collection_name="multi_vector_articles",
    vectors_config={
        "title": VectorParams(size=384, distance=Distance.COSINE),
        "content": VectorParams(size=1536, distance=Distance.COSINE),
    }
)

# 检查 collection 是否存在
if not client.collection_exists("articles"):
    client.create_collection(...)

# 获取 collection 详细信息
info = client.get_collection("articles")
print(f"向量总数: {info.vectors_count}")
print(f"状态: {info.status}")
```

### 距离度量选择

```python
from qdrant_client.models import Distance

# COSINE：余弦相似度，最常用，适合文本语义
# 分数范围 [0, 1]（Qdrant 内部转换为距离），越大越相似
Distance.COSINE

# EUCLID：欧式距离（L2），适合图像特征等
# 分数越小越相似
Distance.EUCLID

# DOT：点积，向量已归一化时等价于余弦，速度最快
Distance.DOT
```

## 点（Point）的 CRUD 操作

### 插入向量点

```python
from qdrant_client.models import PointStruct
import uuid

# 准备数据（实际中 vector 来自 Embedding 模型）
import numpy as np

def random_vector(dim=1536):
    vec = np.random.rand(dim).astype(float)
    return (vec / np.linalg.norm(vec)).tolist()  # 归一化

# 单条插入
client.upsert(
    collection_name="articles",
    points=[
        PointStruct(
            id=1,                           # ID：整数或 UUID 字符串
            vector=random_vector(),
            payload={                        # Payload：任意结构化元数据
                "title": "向量数据库入门",
                "category": "数据库",
                "author": "张三",
                "publish_date": "2024-01-15",
                "view_count": 1250,
                "tags": ["向量", "数据库", "AI"]
            }
        )
    ]
)

# 批量插入（推荐，减少网络往返）
points = []
for i in range(100):
    points.append(
        PointStruct(
            id=i + 100,
            vector=random_vector(),
            payload={
                "title": f"文章标题 {i}",
                "category": "技术",
                "score": float(np.random.rand()),
            }
        )
    )

# upsert：存在则更新，不存在则插入
operation_result = client.upsert(
    collection_name="articles",
    points=points
)
print(f"操作状态: {operation_result.status}")

# 使用 UUID 作为 ID（适合分布式场景）
client.upsert(
    collection_name="articles",
    points=[
        PointStruct(
            id=str(uuid.uuid4()),
            vector=random_vector(),
            payload={"content": "使用 UUID 作为 ID 的文档"}
        )
    ]
)
```

### 查询向量点

```python
from qdrant_client.models import SearchRequest

# 基础语义搜索
query_vector = random_vector()

results = client.search(
    collection_name="articles",
    query_vector=query_vector,
    limit=5,            # 返回 Top-5
    with_payload=True,  # 返回 Payload 数据
    with_vectors=False  # 不返回向量本身（节省传输）
)

for hit in results:
    print(f"ID: {hit.id} | 分数: {hit.score:.4f}")
    print(f"  标题: {hit.payload.get('title')}")
    print(f"  分类: {hit.payload.get('category')}")
```

### 按 ID 获取点

```python
# 获取单个点
points = client.retrieve(
    collection_name="articles",
    ids=[1, 2, 3],
    with_payload=True,
    with_vectors=True   # 同时返回向量
)

for point in points:
    print(f"ID: {point.id}, Payload: {point.payload}")
```

### 更新 Payload

```python
from qdrant_client.models import SetPayload

# 更新指定点的 Payload（只更新指定字段）
client.set_payload(
    collection_name="articles",
    payload={
        "view_count": 2500,
        "updated": True
    },
    points=[1]  # 指定要更新的点 ID 列表
)

# 删除 Payload 中的某些字段
from qdrant_client.models import DeletePayload

client.delete_payload(
    collection_name="articles",
    keys=["updated"],   # 要删除的字段名
    points=[1]
)
```

### 删除点

```python
from qdrant_client.models import PointIdsList, FilterSelector, Filter, FieldCondition, MatchValue

# 按 ID 删除
client.delete(
    collection_name="articles",
    points_selector=PointIdsList(points=[1, 2, 3])
)

# 按条件删除（删除所有 category 为 "旧分类" 的点）
client.delete(
    collection_name="articles",
    points_selector=FilterSelector(
        filter=Filter(
            must=[
                FieldCondition(
                    key="category",
                    match=MatchValue(value="旧分类")
                )
            ]
        )
    )
)
```

## 过滤查询（Payload Filter）

Qdrant 的 Payload Filter 是其最强大的特性之一，支持复杂的结构化过滤与向量搜索同步执行：

```python
from qdrant_client.models import (
    Filter, FieldCondition, MatchValue, MatchAny,
    Range, HasIdCondition
)

# 精确匹配过滤
results = client.search(
    collection_name="articles",
    query_vector=query_vector,
    query_filter=Filter(
        must=[
            FieldCondition(
                key="category",
                match=MatchValue(value="数据库")  # 精确匹配
            )
        ]
    ),
    limit=5
)

# 范围过滤（数值）
results = client.search(
    collection_name="articles",
    query_vector=query_vector,
    query_filter=Filter(
        must=[
            FieldCondition(
                key="view_count",
                range=Range(gte=1000, lte=10000)  # 1000 <= view_count <= 10000
            )
        ]
    ),
    limit=5
)

# 多值匹配（IN 查询）
results = client.search(
    collection_name="articles",
    query_vector=query_vector,
    query_filter=Filter(
        must=[
            FieldCondition(
                key="category",
                match=MatchAny(any=["AI", "数据库", "编程"])  # 任意一个匹配
            )
        ]
    ),
    limit=5
)

# 嵌套数组字段过滤（tags 是数组）
results = client.search(
    collection_name="articles",
    query_vector=query_vector,
    query_filter=Filter(
        must=[
            FieldCondition(
                key="tags",
                match=MatchValue(value="向量")  # tags 数组中包含 "向量"
            )
        ]
    ),
    limit=5
)

# 复合条件（AND + OR）
from qdrant_client.models import Filter

results = client.search(
    collection_name="articles",
    query_vector=query_vector,
    query_filter=Filter(
        must=[
            FieldCondition(key="category", match=MatchValue(value="AI")),
            FieldCondition(key="view_count", range=Range(gte=500)),
        ],
        should=[   # OR 条件，至少满足一个
            FieldCondition(key="tags", match=MatchValue(value="向量")),
            FieldCondition(key="tags", match=MatchValue(value="深度学习")),
        ],
        must_not=[  # NOT 条件
            FieldCondition(key="author", match=MatchValue(value="屏蔽作者"))
        ]
    ),
    limit=5
)

print("过滤搜索结果:")
for hit in results:
    print(f"  [{hit.score:.4f}] {hit.payload.get('title')}")
```

## 批量上传

```python
from qdrant_client.models import Batch
import numpy as np

# 方式一：使用 Batch 批量上传（内存效率高）
vectors = [random_vector() for _ in range(1000)]
payloads = [{"doc_id": i, "text": f"文档 {i}"} for i in range(1000)]
ids = list(range(200, 1200))

client.upsert(
    collection_name="articles",
    points=Batch(
        ids=ids,
        vectors=vectors,
        payloads=payloads
    )
)

# 方式二：upload_points（支持进度回调，适合超大批量）
from qdrant_client.models import PointStruct

def generate_points(n=10000):
    """生成器函数，节省内存"""
    for i in range(n):
        yield PointStruct(
            id=i + 2000,
            vector=random_vector(),
            payload={"index": i, "batch": "large"}
        )

client.upload_points(
    collection_name="articles",
    points=generate_points(10000),
    batch_size=100,  # 每批上传 100 条
    parallel=4       # 并行上传线程数
)

print(f"上传完成，当前文档总数: {client.get_collection('articles').vectors_count}")
```

## 完整示例：语义搜索系统

```python
import os
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue, Range
)

# ---- 初始化 ----
openai_client = OpenAI()
qdrant_client = QdrantClient(host="localhost", port=6333)

COLLECTION_NAME = "tech_articles"
VECTOR_DIM = 1536

def get_embedding(text: str) -> list[float]:
    """调用 OpenAI API 获取文本向量"""
    resp = openai_client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return resp.data[0].embedding

# ---- 第一步：初始化 Collection ----
if not qdrant_client.collection_exists(COLLECTION_NAME):
    qdrant_client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE)
    )
    print(f"Collection '{COLLECTION_NAME}' 创建成功")

# ---- 第二步：索引文档 ----
articles = [
    {"id": 1, "title": "HNSW 算法详解", "category": "算法", "level": "高级", "year": 2024},
    {"id": 2, "title": "RAG 系统架构设计", "category": "AI工程", "level": "中级", "year": 2024},
    {"id": 3, "title": "向量数据库选型指南", "category": "数据库", "level": "初级", "year": 2023},
    {"id": 4, "title": "LangChain 实战教程", "category": "AI工程", "level": "初级", "year": 2024},
    {"id": 5, "title": "Transformer 原理深入", "category": "算法", "level": "高级", "year": 2023},
]

points = []
for article in articles:
    embedding = get_embedding(article["title"])
    points.append(
        PointStruct(
            id=article["id"],
            vector=embedding,
            payload={k: v for k, v in article.items() if k != "id"}
        )
    )

qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)
print(f"已索引 {len(points)} 篇文章")

# ---- 第三步：语义搜索 ----
def search_articles(
    query: str,
    category: str = None,
    level: str = None,
    top_k: int = 3
) -> list:
    """语义搜索文章，支持可选的元数据过滤"""
    query_vec = get_embedding(query)

    # 动态构建过滤条件
    must_conditions = []
    if category:
        must_conditions.append(
            FieldCondition(key="category", match=MatchValue(value=category))
        )
    if level:
        must_conditions.append(
            FieldCondition(key="level", match=MatchValue(value=level))
        )

    search_filter = Filter(must=must_conditions) if must_conditions else None

    results = qdrant_client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vec,
        query_filter=search_filter,
        limit=top_k,
        with_payload=True
    )
    return results

# 测试搜索
print("\n--- 搜索: '大语言模型的检索方法' ---")
hits = search_articles("大语言模型的检索方法")
for hit in hits:
    print(f"  [{hit.score:.4f}] {hit.payload['title']} ({hit.payload['category']})")

print("\n--- 搜索: '深度学习模型架构'，仅限算法类 ---")
hits = search_articles("深度学习模型架构", category="算法")
for hit in hits:
    print(f"  [{hit.score:.4f}] {hit.payload['title']} (难度: {hit.payload['level']})")
```

## 常见问题与最佳实践

### 选择合适的索引参数

```python
# HNSW 参数调优指南
# m: 建议值 8-64，16是常用默认值
#   - 增大 m: 提高精度，增加内存和构建时间
#   - 减小 m: 降低内存，适合内存紧张场景
# ef_construct: 建议值 50-400
#   - 增大: 提高索引质量（更高召回率），但构建更慢
# ef (查询时): 建议值 50-512
#   - 增大: 提高查询精度，但查询变慢

# 查询时动态调整精度
results = qdrant_client.search(
    collection_name="articles",
    query_vector=query_vector,
    limit=10,
    search_params={"hnsw_ef": 128}  # 覆盖默认 ef 值
)
```

### 批量插入性能优化

```python
# 大批量数据时禁用索引，全部插入后再重建（速度可提升 10x）
qdrant_client.update_collection(
    collection_name="articles",
    optimizers_config=OptimizersConfigDiff(indexing_threshold=0)  # 禁用自动索引
)

# 批量导入数据...
client.upload_points(collection_name="articles", points=large_dataset)

# 重新开启索引
qdrant_client.update_collection(
    collection_name="articles",
    optimizers_config=OptimizersConfigDiff(indexing_threshold=20000)
)
```

### 使用 Payload 索引提升过滤性能

```python
from qdrant_client.models import PayloadSchemaType

# 对频繁过滤的字段建立 Payload 索引
qdrant_client.create_payload_index(
    collection_name="articles",
    field_name="category",
    field_schema=PayloadSchemaType.KEYWORD  # 关键词类型
)

qdrant_client.create_payload_index(
    collection_name="articles",
    field_name="view_count",
    field_schema=PayloadSchemaType.INTEGER  # 整数类型，支持范围查询
)
```
