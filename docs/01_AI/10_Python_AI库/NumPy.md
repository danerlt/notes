# NumPy 在 AI 中的应用

## 简介

NumPy（Numerical Python）是 Python 科学计算的基础库，几乎所有 AI/ML 框架的底层都依赖它。PyTorch、TensorFlow、scikit-learn 在数据的读取、预处理、后处理阶段都与 NumPy 紧密集成。

**核心价值：**
- 提供高性能的多维数组对象 `ndarray`
- 向量化运算替代 Python 循环，速度提升数十倍
- 丰富的线性代数、随机数、傅里叶变换等数学函数
- 与 C/Fortran 代码无缝互操作

```python
import numpy as np

# 验证安装
print(np.__version__)  # 例如：1.26.4
```

---

## ndarray 基础

### 形状、维度与数据类型

`ndarray` 是 NumPy 的核心数据结构，理解它的属性是后续所有操作的前提。

```python
import numpy as np

arr = np.array([[1, 2, 3],
                [4, 5, 6]], dtype=np.float32)

print(arr.shape)    # (2, 3)  — 2行3列
print(arr.ndim)     # 2       — 二维数组
print(arr.dtype)    # float32 — 数据类型
print(arr.size)     # 6       — 元素总数
print(arr.nbytes)   # 24      — 占用字节数（6 * 4字节）
```

### AI 中常用的数据类型

| dtype | 说明 | 典型用途 |
|-------|------|----------|
| `float32` | 单精度浮点 | 模型权重、特征值（GPU 标准精度） |
| `float64` | 双精度浮点 | 科学计算、统计分析 |
| `int32` / `int64` | 整数 | 标签索引、token id |
| `bool` | 布尔 | 掩码（mask）操作 |
| `uint8` | 无符号8位整数 | 图像像素值（0-255） |

```python
# 类型转换
arr_f64 = np.array([1.0, 2.0, 3.0])          # 默认 float64
arr_f32 = arr_f64.astype(np.float32)          # 转为 float32（节省内存）
arr_int = arr_f64.astype(np.int32)            # 转为整数

# 查看内存布局
print(arr_f64.strides)  # 每个维度步进字节数
```

---

## 数组创建

### 常用创建函数

```python
import numpy as np

# --- 全零、全一、常数 ---
zeros = np.zeros((3, 4))                       # 3x4 全零矩阵
ones  = np.ones((2, 3), dtype=np.float32)      # 2x3 全一矩阵
full  = np.full((2, 2), 7.0)                   # 2x2，值全为7.0
eye   = np.eye(4)                              # 4x4 单位矩阵

# --- 序列与等间隔 ---
arange   = np.arange(0, 10, 2)                # [0, 2, 4, 6, 8]
linspace = np.linspace(0, 1, 5)               # [0.0, 0.25, 0.5, 0.75, 1.0] — 含端点
logspace = np.logspace(0, 3, 4)               # [1, 10, 100, 1000] 对数间隔

# --- 随机数（AI 中极常用）---
np.random.seed(42)                            # 固定随机种子，保证可复现
rand_uniform = np.random.rand(3, 4)           # [0, 1) 均匀分布
rand_normal  = np.random.randn(3, 4)          # 标准正态分布 N(0,1)
rand_int     = np.random.randint(0, 10, (3, 4))  # 整数随机
rand_normal2 = np.random.normal(0, 0.01, (3, 4)) # 自定义均值/标准差

# 更推荐使用新的 Generator API（可复现性更强）
rng = np.random.default_rng(seed=42)
x = rng.standard_normal((100, 10))

# --- 从已有数据创建 ---
lst = [[1, 2], [3, 4]]
arr = np.array(lst)
arr_copy = arr.copy()    # 深拷贝（避免修改原数组）
arr_view = arr.view()    # 浅拷贝（共享内存）
```

### 形状变换

```python
arr = np.arange(12)         # [0, 1, ..., 11]

# reshape：不改变数据，返回新视图
mat   = arr.reshape(3, 4)   # 3x4 矩阵
mat3d = arr.reshape(2, 2, 3) # 3维：2x2x3

# -1 表示自动推断该维度大小
flat = mat.reshape(-1)      # 展平为 1D
rows = mat.reshape(2, -1)   # 2行，列数自动计算=6

# flatten 与 ravel（展平）
f1 = mat.flatten()  # 返回副本
f2 = mat.ravel()    # 返回视图（推荐，更快）

# 转置
transposed = mat.T  # 等价于 mat.transpose()
```

---

## 索引与切片

### 基本索引

```python
arr = np.arange(24).reshape(4, 6)

# 单元素
print(arr[0, 0])      # 第0行第0列 → 0
print(arr[-1, -1])    # 最后一行最后一列 → 23

# 切片：[start:stop:step]
print(arr[0, :])      # 第0行所有列
print(arr[:, 2])      # 第2列所有行
print(arr[1:3, 2:5])  # 子矩阵
print(arr[::2, ::2])  # 行列各隔一个取样
```

### 布尔索引（AI 中高频使用）

```python
scores = np.array([0.9, 0.3, 0.7, 0.1, 0.85])

# 布尔掩码
mask = scores > 0.5
print(mask)           # [True, False, True, False, True]
print(scores[mask])   # [0.9, 0.7, 0.85]

# 多条件组合（用 & | ~ 代替 and or not）
filtered = scores[(scores > 0.3) & (scores < 0.9)]

# 用于筛选样本
X = np.random.randn(100, 10)  # 100个样本，10个特征
y = np.random.randint(0, 2, 100)  # 二分类标签

# 取出所有正类样本
X_positive = X[y == 1]
print(X_positive.shape)  # (约50, 10)
```

### 花式索引（Fancy Indexing）

```python
arr = np.arange(10) * 2   # [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]

# 用整数数组索引
indices = [0, 3, 5, 7]
print(arr[indices])       # [0, 6, 10, 14]

# 二维花式索引
mat = np.arange(16).reshape(4, 4)
rows = [0, 2, 3]
cols = [1, 3, 0]
print(mat[rows, cols])    # 取 (0,1), (2,3), (3,0) 三个元素

# np.where：条件选择（实现 ReLU）
x = np.array([-2, -1, 0, 1, 2])
relu = np.where(x > 0, x, 0)  # 正数保留，否则置0
print(relu)  # [0, 0, 0, 1, 2]
```

---

## 广播机制（Broadcasting）

广播是 NumPy 最重要的特性之一，让不同形状的数组可以直接进行运算，**无需手动复制数据**。

### 广播规则

两个数组从**尾部维度**开始对齐，满足以下任一条件即可广播：
1. 维度大小相同
2. 其中一个维度大小为 1

```python
import numpy as np

# 示例1：标量与数组
arr = np.array([1, 2, 3, 4])
result = arr * 2          # 等价于 [2, 4, 6, 8]

# 示例2：1D 与 2D
a = np.array([[1, 2, 3],
              [4, 5, 6]])  # shape (2, 3)
b = np.array([10, 20, 30]) # shape (3,) → 广播为 (2, 3)
print(a + b)
# [[11, 22, 33],
#  [14, 25, 36]]

# 示例3：列向量与行向量（外积思想）
col = np.array([[1], [2], [3]])  # shape (3, 1)
row = np.array([10, 20, 30, 40]) # shape (4,) → (1, 4)
print(col + row)
# [[11, 21, 31, 41],
#  [12, 22, 32, 42],
#  [13, 23, 33, 43]]

# AI 实战：批归一化中减去均值
X = np.random.randn(32, 128)   # 32个样本，128维特征
mean = X.mean(axis=0)          # shape (128,) — 每个特征的均值
std  = X.std(axis=0)           # shape (128,)
X_norm = (X - mean) / (std + 1e-8)  # 广播：(32,128) - (128,) 自动对齐
```

### 手动控制广播维度

```python
a = np.array([1, 2, 3])   # shape (3,)

# np.newaxis 插入新轴
col_vec = a[:, np.newaxis]  # shape (3, 1)
row_vec = a[np.newaxis, :]  # shape (1, 3)

# 外积
outer = col_vec * row_vec   # shape (3, 3)
print(outer)
# [[1, 2, 3],
#  [2, 4, 6],
#  [3, 6, 9]]
```

---

## 向量化运算

向量化是指用数组操作替代 Python 循环，利用底层 C 实现加速。

```python
import numpy as np
import time

n = 1_000_000

# Python 循环（慢）
def loop_sum(n):
    total = 0
    for i in range(n):
        total += i * i
    return total

# NumPy 向量化（快）
def numpy_sum(n):
    arr = np.arange(n, dtype=np.float64)
    return np.sum(arr ** 2)

start = time.time(); loop_sum(n);  print(f"Loop:  {time.time()-start:.3f}s")
start = time.time(); numpy_sum(n); print(f"NumPy: {time.time()-start:.3f}s")
# NumPy 通常快 50-200 倍
```

### 常用通用函数（ufunc）

```python
x = np.linspace(-3, 3, 7)  # [-3, -2, -1, 0, 1, 2, 3]

# 数学运算
np.abs(x)           # 绝对值
np.sqrt(np.abs(x))  # 平方根
np.exp(x)           # e^x
np.log(np.abs(x) + 1e-8)   # 自然对数（加小量防止 log(0)）
np.power(x, 2)      # x 的平方，等同于 x**2
np.clip(x, -1, 1)   # 裁剪到 [-1, 1]

# 聚合运算
arr2d = np.random.randn(4, 5)
arr2d.sum()           # 所有元素求和
arr2d.sum(axis=0)     # 按列求和，结果 shape (5,)
arr2d.sum(axis=1)     # 按行求和，结果 shape (4,)
arr2d.mean(axis=0)    # 按列均值
arr2d.std(axis=0)     # 按列标准差
arr2d.max(axis=1)     # 每行最大值
arr2d.argmax(axis=1)  # 每行最大值的索引 ← 取预测类别
arr2d.cumsum(axis=1)  # 累积求和

# 排序
np.sort(x)            # 升序排序（返回副本）
np.argsort(x)         # 返回排序后的索引
np.argsort(x)[::-1]   # 降序索引（Top-K 实现基础）
```

---

## 矩阵运算

### dot、matmul 与 einsum

```python
import numpy as np

A = np.random.randn(3, 4)  # 3x4 矩阵
B = np.random.randn(4, 5)  # 4x5 矩阵

# 矩阵乘法（三种等价写法）
C1 = np.dot(A, B)       # shape (3, 5)
C2 = A @ B              # Python 3.5+ 推荐写法
C3 = np.matmul(A, B)    # 等同于 @

# 元素逐个相乘（Hadamard 乘积）
X = np.ones((3, 4))
Y = np.ones((3, 4)) * 2
Z = X * Y               # 逐元素，非矩阵乘法

# 批量矩阵乘法（处理 batch）
batch_A = np.random.randn(32, 3, 4)  # 32个 3x4 矩阵
batch_B = np.random.randn(32, 4, 5)  # 32个 4x5 矩阵
batch_C = batch_A @ batch_B          # shape (32, 3, 5)

# 向量内积
v1 = np.array([1., 2., 3.])
v2 = np.array([4., 5., 6.])
inner = np.dot(v1, v2)   # 32.0

# 向量外积
outer = np.outer(v1, v2) # shape (3, 3)
```

### einsum（爱因斯坦求和）

`einsum` 是表达复杂张量运算的通用方式，在注意力机制实现中非常常见。

```python
import numpy as np

A = np.random.randn(3, 4)
B = np.random.randn(4, 5)

# 矩阵乘法：ij,jk->ik
C = np.einsum('ij,jk->ik', A, B)

# 矩阵转置：ij->ji
AT = np.einsum('ij->ji', A)

# 元素逐乘后全部求和（两矩阵点积）：ij,ij->
total = np.einsum('ij,ij->', A, A)

# 批量点积（Attention Score 计算）
Q = np.random.randn(8, 64)   # 8个 query，64维
K = np.random.randn(16, 64)  # 16个 key，64维
scores = np.einsum('id,jd->ij', Q, K)  # shape (8, 16)，等价于 Q @ K.T

# 三维批量矩阵乘（多头注意力）
Q3d = np.random.randn(2, 8, 64)   # batch=2, seq=8, dim=64
K3d = np.random.randn(2, 16, 64)
scores3d = np.einsum('bid,bjd->bij', Q3d, K3d)  # (2, 8, 16)
```

### 线性代数工具

```python
A = np.array([[2., 1.], [1., 3.]])

det            = np.linalg.det(A)            # 行列式
inv            = np.linalg.inv(A)            # 逆矩阵
eigenvalues, eigenvectors = np.linalg.eig(A) # 特征值/特征向量
U, S, Vt       = np.linalg.svd(A)           # SVD 分解（PCA基础）
b = np.array([3., 4.])
x = np.linalg.solve(A, b)                   # 求解线性方程组 Ax=b

# 范数
v = np.array([3., 4.])
l2_norm = np.linalg.norm(v)          # L2范数 = 5.0
l1_norm = np.linalg.norm(v, ord=1)   # L1范数 = 7.0
```

---

## AI 中的常见操作

### 归一化

```python
import numpy as np

X = np.random.randn(100, 10).astype(np.float32)

# Min-Max 归一化，将数据缩放到 [0, 1]
def minmax_normalize(X):
    x_min = X.min(axis=0)           # 每列最小值 shape (10,)
    x_max = X.max(axis=0)           # 每列最大值 shape (10,)
    return (X - x_min) / (x_max - x_min + 1e-8)

X_mm = minmax_normalize(X)

# Z-Score 标准化，使每列均值为0，标准差为1
def zscore_normalize(X):
    mean = X.mean(axis=0)
    std  = X.std(axis=0)
    return (X - mean) / (std + 1e-8)

X_z = zscore_normalize(X)

# L2 归一化（每个样本归一化为单位向量，余弦相似度检索常用）
def l2_normalize(X):
    norms = np.linalg.norm(X, axis=1, keepdims=True)  # shape (100, 1)
    return X / (norms + 1e-8)

X_l2 = l2_normalize(X)
# 验证：每行的 L2 范数应约为 1
print(np.linalg.norm(X_l2, axis=1)[:5])  # [1. 1. 1. 1. 1.]
```

### Softmax 手动实现

```python
import numpy as np

def softmax(x):
    """
    稳定版 Softmax：减去最大值防止数值溢出
    输入 x: shape (..., C)，C 为类别数
    """
    # 减去最大值（数值稳定技巧，不改变结果）
    x_shifted = x - x.max(axis=-1, keepdims=True)
    exp_x = np.exp(x_shifted)
    return exp_x / exp_x.sum(axis=-1, keepdims=True)

# 单样本
logits = np.array([2.0, 1.0, 0.1])
probs  = softmax(logits)
print(probs)         # [0.659, 0.242, 0.099]
print(probs.sum())   # 1.0

# 批量处理（batch=4，3分类）
batch_logits = np.random.randn(4, 3)
batch_probs  = softmax(batch_logits)
print(batch_probs.sum(axis=1))  # [1. 1. 1. 1.]

# 温度缩放（LLM 推理中控制随机程度）
def softmax_with_temperature(x, temperature=1.0):
    # temperature < 1：更尖锐（更确信）
    # temperature > 1：更平滑（更随机）
    return softmax(x / temperature)
```

### One-Hot 编码

```python
import numpy as np

def one_hot(labels, num_classes):
    """
    将整数标签转换为 one-hot 向量
    labels:     shape (N,)，值在 [0, num_classes)
    返回:       shape (N, num_classes)
    """
    N = len(labels)
    matrix = np.zeros((N, num_classes), dtype=np.float32)
    matrix[np.arange(N), labels] = 1.0
    return matrix

labels  = np.array([0, 2, 1, 3, 0])
encoded = one_hot(labels, num_classes=4)
print(encoded)
# [[1. 0. 0. 0.]
#  [0. 0. 1. 0.]
#  [0. 1. 0. 0.]
#  [0. 0. 0. 1.]
#  [1. 0. 0. 0.]]

# 逆操作：从 one-hot 还原标签
decoded = np.argmax(encoded, axis=1)
print(decoded)  # [0, 2, 1, 3, 0]

# 交叉熵损失手动实现
def cross_entropy_loss(probs, labels):
    """
    probs:  shape (N, C)，softmax 后的概率
    labels: shape (N,)，整数标签
    """
    N = len(labels)
    correct_probs = probs[np.arange(N), labels]  # 取真实类别的概率
    loss = -np.log(correct_probs + 1e-8)
    return loss.mean()

logits = np.random.randn(4, 3)
probs  = softmax(logits)
labels = np.array([0, 2, 1, 0])
loss   = cross_entropy_loss(probs, labels)
print(f"Cross Entropy Loss: {loss:.4f}")
```

### 常用数组拼接操作

```python
import numpy as np

a = np.random.randn(4, 8)
b = np.random.randn(4, 8)

# 拼接
np.concatenate([a, b], axis=0)  # shape (8, 8)  — 纵向拼接（增加样本）
np.concatenate([a, b], axis=1)  # shape (4, 16) — 横向拼接（增加特征）
np.vstack([a, b])               # 等价于 axis=0
np.hstack([a, b])               # 等价于 axis=1

# 增加/删除维度
x  = np.array([1, 2, 3])           # shape (3,)
x1 = x[np.newaxis, :]             # shape (1, 3) — 增加 batch 维度
x2 = np.expand_dims(x, axis=0)    # 等价，更语义化
x3 = np.squeeze(x1)               # shape (3,)  — 删除大小为1的维度

# np.stack 沿新轴拼接
arrays  = [np.ones((4,)) * i for i in range(3)]
stacked = np.stack(arrays, axis=0) # shape (3, 4)
```

---

## 与 PyTorch / TensorFlow 的互转

### NumPy ↔ PyTorch

```python
import numpy as np
import torch

# NumPy → PyTorch Tensor
arr = np.array([1.0, 2.0, 3.0], dtype=np.float32)

# 方法1：共享内存（修改一方会影响另一方）
tensor_shared = torch.from_numpy(arr)

# 方法2：复制数据（互不影响，推荐用于安全场景）
tensor_copy = torch.tensor(arr)

# PyTorch Tensor → NumPy（CPU tensor 才能直接转）
tensor    = torch.randn(3, 4)
arr_back  = tensor.numpy()           # 共享内存
arr_detach = tensor.detach().numpy() # detach 断开梯度图

# GPU Tensor → NumPy（必须先移回 CPU）
# gpu_tensor = torch.randn(3, 4).cuda()
# arr_from_gpu = gpu_tensor.cpu().detach().numpy()

# 注意：PyTorch 默认 float32，NumPy 默认 float64
# 训练时统一使用 float32 可节省显存
np_f32    = np.zeros((3, 4), dtype=np.float32)
torch_f32 = torch.from_numpy(np_f32)   # dtype=torch.float32
```

### NumPy ↔ TensorFlow

```python
import numpy as np
import tensorflow as tf

arr       = np.array([[1.0, 2.0], [3.0, 4.0]], dtype=np.float32)
tf_tensor = tf.constant(arr)       # NumPy → TF 常量
tf_var    = tf.Variable(arr)       # NumPy → TF 可训练变量

# TF → NumPy
arr_back = tf_tensor.numpy()       # 直接调用 .numpy()

# 数据管道中使用 numpy
dataset = tf.data.Dataset.from_tensor_slices(arr)
for batch in dataset.batch(2):
    print(batch.numpy())
```

---

## 常见问题与最佳实践

### 1. 视图 vs 副本

```python
arr  = np.arange(10)
view = arr[2:5]    # 切片返回视图（共享内存）
view[0] = 999
print(arr[2])      # 999，原数组也被修改了！

# 需要独立副本时显式调用 .copy()
safe = arr[2:5].copy()
safe[0] = 0        # 不影响 arr
```

### 2. 避免不必要的数组复制

```python
X    = np.random.randn(10000, 1000)
mean = X.mean()
std  = X.std()

# 原地操作，节省内存（比 X = (X - mean) / std 少分配两个临时数组）
X -= mean
X /= std
```

### 3. 数值稳定性

```python
probs    = np.array([0.0, 0.5, 0.5])
log_safe = np.log(probs + 1e-8)     # 避免 log(0) → -inf

# np.log1p 对小值更精确（计算 log(1+x)）
small_x = np.array([1e-10, 1e-5, 0.1])
np.log1p(small_x)  # 比 np.log(1 + small_x) 更精确
```

### 4. 随机种子与可复现性

```python
# 推荐：使用 Generator（便于测试和传递）
rng = np.random.default_rng(seed=42)
train_indices = rng.permutation(1000)  # 随机打乱索引

# 数据集划分示例
def train_test_split(X, y, test_ratio=0.2, seed=42):
    rng     = np.random.default_rng(seed)
    n       = len(X)
    indices = rng.permutation(n)
    split   = int(n * (1 - test_ratio))
    train_idx, test_idx = indices[:split], indices[split:]
    return X[train_idx], X[test_idx], y[train_idx], y[test_idx]
```

### 5. 性能提示

| 场景 | 建议 |
|------|------|
| 频繁改变形状 | 用 `reshape` + `ravel`，避免 `flatten`（后者总复制） |
| 大数组遍历 | 用向量化替代 Python for 循环 |
| 内存受限 | 优先使用 `float32` 而非 `float64` |
| 多次拼接 | 用 `np.concatenate` 而非循环 `np.append`（后者每次重新分配） |
| 布尔过滤 | 提前计算并复用掩码，避免重复计算条件 |
