# Pandas 在 AI 数据处理中的应用

## 简介

Pandas 是 Python 数据分析的标准库，在 AI 项目中主要承担**数据读取、清洗、探索和特征工程**的工作。原始数据往往以 CSV、数据库或 JSON 形式存在，最终需要转换为模型可接受的数字矩阵，Pandas 是这条链路的核心工具。

**核心价值：**
- 提供 `DataFrame`（表格）和 `Series`（列）两种数据结构
- 强大的缺失值处理、类型转换、分组聚合能力
- 与 NumPy、scikit-learn、PyTorch 无缝集成
- 内置 CSV/Excel/JSON/SQL 等多种数据读写接口

```python
import pandas as pd
import numpy as np

print(pd.__version__)  # 例如：2.2.1
```

---

## DataFrame 和 Series 基础

### Series：一维带标签数组

```python
import pandas as pd

# 从列表创建
s = pd.Series([10, 20, 30, 40], name="score")
print(s.index)   # RangeIndex(start=0, stop=4, step=1)
print(s.values)  # array([10, 20, 30, 40])
print(s.dtype)   # int64

# 自定义索引
s2 = pd.Series({"alice": 95, "bob": 87, "carol": 92})
print(s2["alice"])   # 95
print(s2[s2 > 90])   # 布尔过滤：alice=95, carol=92
```

### DataFrame：二维表格结构

```python
import pandas as pd

# 从字典创建
df = pd.DataFrame({
    "name":   ["alice", "bob", "carol", "david"],
    "age":    [25, 30, 28, 35],
    "salary": [8000, 12000, 9500, 15000],
    "dept":   ["tech", "sales", "tech", "mgmt"],
})

# 基本属性
print(df.shape)      # (4, 4) — 4行4列
print(df.columns)    # Index(['name', 'age', 'salary', 'dept'])
print(df.dtypes)     # 每列的数据类型
print(df.index)      # RangeIndex(start=0, stop=4, step=1)

# 访问列（两种方式）
ages    = df["age"]         # 返回 Series
ages_df = df[["age"]]       # 返回 DataFrame（双中括号）
two_col = df[["name", "age"]]  # 多列选择

# 访问行
row0   = df.iloc[0]         # 按位置（返回 Series）
row_a  = df.loc[0]          # 按标签（行索引为0时同 iloc）
rows   = df.iloc[1:3]       # 切片
```

### 设置与重置索引

```python
# 将某列设为行索引
df_indexed = df.set_index("name")
print(df_indexed.loc["alice"])     # 用名字查行

# 重置为默认数字索引
df_reset = df_indexed.reset_index()
```

---

## 数据读取

### CSV

```python
import pandas as pd

# 读取 CSV（最常用）
df = pd.read_csv("data/train.csv")

# 常用参数
df = pd.read_csv(
    "data/train.csv",
    sep=",",            # 分隔符，默认逗号
    header=0,           # 第0行作为列名
    index_col=0,        # 第0列作为行索引
    usecols=["id", "label", "text"],  # 只读取指定列
    dtype={"label": int, "id": str},  # 指定列类型
    nrows=1000,         # 只读前1000行（大文件调试）
    encoding="utf-8",
    na_values=["N/A", "null", ""],    # 自定义 NA 值
)

# 写入 CSV
df.to_csv("output/result.csv", index=False, encoding="utf-8")
```

### JSON

```python
# 读取 JSON
df = pd.read_json("data/samples.json")

# 嵌套 JSON（records 格式）
# [{"id": 1, "text": "hello"}, {"id": 2, "text": "world"}]
df = pd.read_json("data/samples.json", orient="records")

# 逐行 JSON（JSONL 格式，NLP 数据集常用）
df = pd.read_json("data/samples.jsonl", lines=True)

# 写入 JSONL
df.to_json("output/result.jsonl", orient="records", lines=True, force_ascii=False)
```

### Excel

```python
# 读取 Excel（需要安装 openpyxl）
df = pd.read_excel("data/dataset.xlsx", sheet_name="Sheet1")

# 读取多个 sheet
sheets = pd.read_excel("data/dataset.xlsx", sheet_name=None)  # dict
for name, sheet_df in sheets.items():
    print(name, sheet_df.shape)

# 写入 Excel
df.to_excel("output/result.xlsx", index=False, sheet_name="预测结果")
```

### 数据库（SQL）

```python
import sqlite3
import pandas as pd

# 从 SQLite 读取
conn = sqlite3.connect("data/my_database.db")
df = pd.read_sql("SELECT * FROM users WHERE age > 25", conn)
conn.close()

# 写入数据库
conn = sqlite3.connect("data/output.db")
df.to_sql("predictions", conn, if_exists="replace", index=False)
conn.close()
```

---

## 数据探索

### 快速了解数据全貌

```python
import pandas as pd
import numpy as np

df = pd.read_csv("data/titanic.csv")

# 查看前几行/后几行
print(df.head(5))      # 默认前5行
print(df.tail(3))

# 数据概况
print(df.shape)        # (891, 12) — 行列数
print(df.info())       # 列名、非空数量、数据类型、内存占用
print(df.describe())   # 数值列的统计摘要（count/mean/std/min/max等）

# 非数值列的统计
print(df["Sex"].value_counts())          # 各值出现次数
print(df["Sex"].value_counts(normalize=True))  # 比例
print(df["Embarked"].nunique())          # 唯一值数量
print(df["Embarked"].unique())           # 所有唯一值

# 缺失值概览
print(df.isnull().sum())                 # 每列缺失数量
print(df.isnull().mean() * 100)          # 每列缺失比例（%）
```

### 相关性分析

```python
# 数值列之间的 Pearson 相关系数
corr_matrix = df[["Age", "Fare", "SibSp", "Parch"]].corr()
print(corr_matrix)

# 找出与目标列高度相关的特征
target_corr = corr_matrix["Survived"].abs().sort_values(ascending=False)
print(target_corr)
```

---

## 数据清洗

### 缺失值处理

```python
import pandas as pd

df = pd.read_csv("data/titanic.csv")

# 检查缺失
print(df.isnull().sum())

# 删除含缺失值的行（谨慎使用）
df_dropped = df.dropna()                         # 删除任意列有缺失的行
df_dropped = df.dropna(subset=["Age", "Cabin"])  # 只检查指定列
df_dropped = df.dropna(thresh=10)                # 至少有10个非空值才保留

# 填充缺失值
df["Age"].fillna(df["Age"].median(), inplace=True)   # 用中位数填充（数值列）
df["Embarked"].fillna(df["Embarked"].mode()[0], inplace=True)  # 用众数（类别列）
df["Cabin"].fillna("Unknown", inplace=True)           # 用固定值

# 前向/后向填充（时序数据常用）
df["price"] = df["price"].fillna(method="ffill")   # 用前一个值填充
df["price"] = df["price"].fillna(method="bfill")   # 用后一个值填充

# 用插值填充（时序数据）
df["temperature"] = df["temperature"].interpolate(method="linear")
```

### 重复值处理

```python
# 检查重复行
print(df.duplicated().sum())   # 重复行数量
print(df[df.duplicated()])     # 查看重复行

# 删除重复行
df = df.drop_duplicates()                          # 删除完全重复的行
df = df.drop_duplicates(subset=["user_id"])        # 指定列重复才删除
df = df.drop_duplicates(subset=["user_id"], keep="last")  # 保留最后一条
```

### 数据类型转换

```python
df = pd.DataFrame({
    "id":       ["001", "002", "003"],
    "score":    ["85.5", "90.0", "78.3"],
    "date":     ["2024-01-01", "2024-01-02", "2024-01-03"],
    "is_valid": ["True", "False", "True"],
})

# 类型转换
df["id"]       = df["id"].astype(int)
df["score"]    = df["score"].astype(float)
df["date"]     = pd.to_datetime(df["date"])
df["is_valid"] = df["is_valid"].map({"True": True, "False": False})

# 查看转换后的类型
print(df.dtypes)

# 数值转换遇到错误时不崩溃（coerce 将无法转换的值设为 NaN）
df["amount"] = pd.to_numeric(df["score"], errors="coerce")
```

### 字符串清洗

```python
df["name"] = df["name"].str.strip()             # 去除首尾空格
df["name"] = df["name"].str.lower()             # 转小写
df["email"] = df["email"].str.replace(" ", "")  # 删除空格
df["text"]  = df["text"].str.replace(r"\s+", " ", regex=True)  # 合并多余空格

# 提取信息
df["domain"] = df["email"].str.split("@").str[1]  # 提取 @ 后面的域名
df["year"]   = df["date"].dt.year                 # 从日期列提取年份
```

---

## 数据过滤与选择

### loc 与 iloc

```python
df = pd.read_csv("data/titanic.csv")

# iloc：按位置（整数索引）
df.iloc[0]          # 第0行（Series）
df.iloc[0:5]        # 前5行（DataFrame）
df.iloc[:, 0:3]     # 所有行，前3列
df.iloc[0:5, 1:4]   # 前5行，第1-3列

# loc：按标签（行索引/列名）
df.loc[0, "Age"]         # 第0行的 Age 列
df.loc[:, "Age":"Fare"]  # 所有行，Age 到 Fare 的列
df.loc[df["Survived"] == 1, ["Name", "Age"]]  # 布尔过滤 + 列选择
```

### 条件过滤

```python
# 单条件
adults = df[df["Age"] >= 18]

# 多条件（用 & | ~，不用 and or not）
survived_adults = df[(df["Age"] >= 18) & (df["Survived"] == 1)]
first_or_second = df[df["Pclass"].isin([1, 2])]

# 字符串包含
tech_names = df[df["Name"].str.contains("Mr\.", regex=True)]

# 非空过滤
df_no_null = df[df["Age"].notna()]

# query 方法（更简洁的语法）
result = df.query("Age >= 18 and Pclass == 1")
result = df.query("Pclass in [1, 2] and Survived == 1")
```

---

## 分组聚合

### groupby 基础

```python
df = pd.read_csv("data/titanic.csv")

# 按单列分组，计算均值
age_by_class = df.groupby("Pclass")["Age"].mean()
print(age_by_class)

# 按多列分组
survival = df.groupby(["Pclass", "Sex"])["Survived"].mean()
print(survival)

# 多种聚合函数
stats = df.groupby("Pclass")["Fare"].agg(["mean", "std", "min", "max"])
print(stats)

# 自定义聚合
result = df.groupby("Pclass").agg(
    avg_age    = ("Age",      "mean"),
    max_fare   = ("Fare",     "max"),
    n_survived = ("Survived", "sum"),
    n_total    = ("Survived", "count"),
)
result["survival_rate"] = result["n_survived"] / result["n_total"]
```

### 透视表

```python
# 生成交叉表（类似 Excel 数据透视表）
pivot = df.pivot_table(
    values="Survived",
    index="Pclass",
    columns="Sex",
    aggfunc="mean",
    fill_value=0
)
print(pivot)
# Sex       female      male
# Pclass
# 1          0.968     0.369
# 2          0.921     0.157
# 3          0.500     0.135
```

### 变换与应用

```python
# transform：分组计算但保持原始行数（用于填充分组均值）
df["Age_filled"] = df.groupby("Pclass")["Age"].transform(
    lambda x: x.fillna(x.median())
)

# apply：在每个分组上运行自定义函数
def group_summary(group):
    return pd.Series({
        "count":    len(group),
        "avg_fare": group["Fare"].mean(),
        "survival": group["Survived"].mean(),
    })

summary = df.groupby("Pclass").apply(group_summary)
```

---

## 特征工程

### 类别编码

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    "color":  ["red", "blue", "green", "red", "blue"],
    "size":   ["S", "M", "L", "XL", "M"],
    "target": [1, 0, 1, 0, 1],
})

# 标签编码（Label Encoding）— 适合有序类别
from sklearn.preprocessing import LabelEncoder
le = LabelEncoder()
df["size_encoded"] = le.fit_transform(df["size"])
# S→0, M→1, L→2, XL→3（按字母顺序，不反映真实大小关系）

# 有序类别的正确做法：手动映射
size_order = {"S": 0, "M": 1, "L": 2, "XL": 3}
df["size_ordered"] = df["size"].map(size_order)

# One-Hot 编码（适合无序类别）
color_dummies = pd.get_dummies(df["color"], prefix="color")
df = pd.concat([df, color_dummies], axis=1)

# drop_first=True 避免多重共线性（n类别只需 n-1 列）
color_dummies = pd.get_dummies(df["color"], prefix="color", drop_first=True)

# 频率编码（高基数类别特征常用）
freq_map = df["color"].value_counts(normalize=True)
df["color_freq"] = df["color"].map(freq_map)

# 目标编码（Target Encoding）— 防止信息泄露需交叉验证
target_mean = df.groupby("color")["target"].mean()
df["color_target"] = df["color"].map(target_mean)
```

### 数值特征归一化

```python
from sklearn.preprocessing import StandardScaler, MinMaxScaler

df = pd.read_csv("data/train.csv")
num_cols = ["age", "salary", "experience"]

# Z-Score 标准化
scaler = StandardScaler()
df[num_cols] = scaler.fit_transform(df[num_cols])

# 用 Pandas 手动实现（更透明）
for col in num_cols:
    mean = df[col].mean()
    std  = df[col].std()
    df[col] = (df[col] - mean) / (std + 1e-8)

# Min-Max 归一化
for col in num_cols:
    col_min = df[col].min()
    col_max = df[col].max()
    df[col] = (df[col] - col_min) / (col_max - col_min + 1e-8)
```

### 特征构造

```python
df = pd.DataFrame({
    "purchase_date": pd.to_datetime(["2024-01-15", "2024-06-20", "2024-12-01"]),
    "birth_date":    pd.to_datetime(["1990-05-10", "1985-03-22", "2000-07-30"]),
    "price":         [100.0, 250.0, 75.0],
    "quantity":      [2, 1, 3],
})

# 时间特征
df["purchase_month"]    = df["purchase_date"].dt.month
df["purchase_dayofweek"] = df["purchase_date"].dt.dayofweek  # 0=周一
df["purchase_quarter"]  = df["purchase_date"].dt.quarter
df["is_weekend"]        = df["purchase_dayofweek"].isin([5, 6]).astype(int)

# 年龄计算
today = pd.Timestamp.now()
df["age"] = (today - df["birth_date"]).dt.days // 365

# 组合特征
df["total_amount"]  = df["price"] * df["quantity"]
df["log_price"]     = np.log1p(df["price"])         # 对数变换（处理右偏分布）
df["price_bucket"]  = pd.cut(df["price"], bins=3, labels=["low", "mid", "high"])
df["price_qbucket"] = pd.qcut(df["price"], q=3, labels=["q1", "q2", "q3"])
```

---

## 常用 AI 数据处理模式

### 数据集拆分

```python
import pandas as pd
import numpy as np

df = pd.read_csv("data/dataset.csv")

# 按比例随机拆分（8:2）
df_shuffled  = df.sample(frac=1, random_state=42).reset_index(drop=True)
split_idx    = int(len(df_shuffled) * 0.8)
train_df     = df_shuffled.iloc[:split_idx]
val_df       = df_shuffled.iloc[split_idx:]

# 分层拆分（保持各类别比例，分类任务推荐）
from sklearn.model_selection import train_test_split
train_df, test_df = train_test_split(
    df, test_size=0.2, random_state=42, stratify=df["label"]
)
```

### 批量读取大文件

```python
# 分块读取大 CSV（内存不足时）
chunk_size = 10000
processed_chunks = []

for chunk in pd.read_csv("data/large_file.csv", chunksize=chunk_size):
    # 在每个 chunk 上做预处理
    chunk = chunk.dropna(subset=["text", "label"])
    chunk["text"] = chunk["text"].str.strip().str.lower()
    processed_chunks.append(chunk)

df = pd.concat(processed_chunks, ignore_index=True)
```

### 文本数据预处理

```python
import pandas as pd
import re

df = pd.DataFrame({
    "text":  ["Hello, World! 123", "  NLP is great  ", "AI & ML 🤖"],
    "label": [1, 0, 1],
})

# 文本清洗流水线
def clean_text(text):
    text = str(text).strip()
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)   # 删除标点
    text = re.sub(r"\d+", " NUM ", text)  # 数字替换
    text = re.sub(r"\s+", " ", text)      # 合并多余空格
    return text.strip()

df["text_clean"] = df["text"].apply(clean_text)

# 文本长度统计（用于过滤或截断）
df["text_len"]    = df["text_clean"].str.len()
df["word_count"]  = df["text_clean"].str.split().str.len()

# 过滤极短文本
df = df[df["word_count"] >= 3]
```

### 数据增强与平衡

```python
df = pd.read_csv("data/imbalanced.csv")

print(df["label"].value_counts())
# 0    900
# 1    100  — 严重不平衡

# 过采样少数类（随机复制）
pos_df = df[df["label"] == 1]
neg_df = df[df["label"] == 0]
pos_upsampled = pos_df.sample(n=len(neg_df), replace=True, random_state=42)
balanced_df = pd.concat([neg_df, pos_upsampled]).sample(frac=1, random_state=42)

# 欠采样多数类
neg_downsampled = neg_df.sample(n=len(pos_df), random_state=42)
balanced_df = pd.concat([pos_df, neg_downsampled]).sample(frac=1, random_state=42)
```

---

## 与 NumPy / PyTorch 集成

### DataFrame → NumPy

```python
import pandas as pd
import numpy as np

df = pd.read_csv("data/features.csv")

# 提取特征矩阵和标签
feature_cols = [c for c in df.columns if c != "label"]
X = df[feature_cols].values               # DataFrame → numpy array (float64)
y = df["label"].values                    # Series → numpy array

# 指定类型
X = df[feature_cols].to_numpy(dtype=np.float32)   # 直接转为 float32

# 处理含字符串列（只取数值列）
num_df = df.select_dtypes(include=[np.number])
X = num_df.drop(columns=["label"]).values
```

### DataFrame → PyTorch Dataset

```python
import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader

class TabularDataset(Dataset):
    """
    将 Pandas DataFrame 封装为 PyTorch Dataset
    适合表格类结构化数据
    """
    def __init__(self, df: pd.DataFrame, feature_cols: list, label_col: str):
        self.X = df[feature_cols].to_numpy(dtype=np.float32)
        self.y = df[label_col].to_numpy(dtype=np.int64)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return torch.tensor(self.X[idx]), torch.tensor(self.y[idx])

# 使用示例
df = pd.read_csv("data/train.csv")
feature_cols = ["age", "salary", "experience"]

dataset = TabularDataset(df, feature_cols, label_col="is_churn")
loader  = DataLoader(dataset, batch_size=32, shuffle=True)

for X_batch, y_batch in loader:
    print(X_batch.shape, y_batch.shape)  # (32, 3), (32,)
    break
```

### 预测结果写回 DataFrame

```python
import pandas as pd
import numpy as np

test_df = pd.read_csv("data/test.csv")

# 模拟模型预测
probs  = np.random.softmax(np.random.randn(len(test_df), 2), axis=1)
labels = probs.argmax(axis=1)

# 将预测写入 DataFrame
test_df["pred_label"] = labels
test_df["pred_prob"]  = probs[:, 1]   # 正类概率

# 按置信度排序，查看高置信度样本
high_conf = test_df[test_df["pred_prob"] > 0.9].sort_values("pred_prob", ascending=False)
print(high_conf.head(10))

# 保存结果
test_df[["id", "pred_label", "pred_prob"]].to_csv(
    "output/predictions.csv", index=False
)
```

---

## 常见问题与最佳实践

### 1. 链式赋值警告（SettingWithCopyWarning）

```python
# 错误：链式赋值，行为不可预测
df[df["age"] > 18]["salary"] = 10000  # 可能不生效！

# 正确：使用 loc 直接赋值
df.loc[df["age"] > 18, "salary"] = 10000

# 或者先复制再操作
subset = df[df["age"] > 18].copy()
subset["salary"] = 10000
```

### 2. 内存优化

```python
df = pd.read_csv("data/large.csv")

# 查看内存使用
print(df.memory_usage(deep=True).sum() / 1024**2, "MB")

# 优化整数列
for col in df.select_dtypes(include=["int64"]).columns:
    df[col] = pd.to_numeric(df[col], downcast="integer")  # 降为最小可用整数类型

# 优化浮点列
for col in df.select_dtypes(include=["float64"]).columns:
    df[col] = df[col].astype(np.float32)

# 类别列用 category 类型（高重复度字符串列）
df["dept"] = df["dept"].astype("category")  # 极大节省内存
```

### 3. 避免低效的行迭代

```python
df = pd.DataFrame({"a": range(10000), "b": range(10000)})

# 极慢：逐行迭代
results = []
for _, row in df.iterrows():
    results.append(row["a"] + row["b"])

# 正确：向量化操作
results = (df["a"] + df["b"]).tolist()

# 无法向量化时，用 apply（比 iterrows 快约 10 倍）
df["c"] = df.apply(lambda row: row["a"] ** 2 + row["b"], axis=1)

# 复杂逻辑用 numpy 向量化
a = df["a"].values
b = df["b"].values
df["c"] = a ** 2 + b  # 最快
```

### 4. 合并与连接

```python
df1 = pd.DataFrame({"id": [1, 2, 3], "name": ["a", "b", "c"]})
df2 = pd.DataFrame({"id": [2, 3, 4], "score": [85, 90, 78]})

# merge（类似 SQL JOIN）
inner = pd.merge(df1, df2, on="id", how="inner")   # 交集
left  = pd.merge(df1, df2, on="id", how="left")    # 保留左表所有行
outer = pd.merge(df1, df2, on="id", how="outer")   # 并集

# concat（纵向/横向拼接）
vertical   = pd.concat([df1, df1], ignore_index=True)  # 行拼接
horizontal = pd.concat([df1, df2], axis=1)              # 列拼接（需索引对齐）
```
