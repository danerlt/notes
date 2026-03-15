# Function Calling

## 什么是 Function Calling

Function Calling（函数调用/工具调用）是 LLM 的一项能力，允许模型在生成回复时**识别出需要调用外部函数的场景**，并输出结构化的调用参数，由开发者在应用层执行函数后将结果返回给模型。

这项能力的核心价值在于：
- **打破 LLM 信息边界**：让模型能获取实时数据、查询数据库
- **执行真实世界操作**：发邮件、下订单、操作文件
- **返回结构化数据**：不再依赖文本解析，直接获得 JSON 格式参数

```
用户 → LLM → 识别需要调用函数 → 输出结构化参数
                                        ↓
用户 ← LLM ← 根据结果生成回复 ← 开发者执行函数 → 真实 API/DB
```

---

## OpenAI Function Calling 标准格式

OpenAI 于 2023 年推出 Function Calling，目前已成为行业事实标准，众多模型（包括国内的通义千问、文心一言等）都支持相同格式。

### 基本流程

```
1. 开发者在请求中定义可用函数（tools）
2. 模型判断是否需要调用函数
3. 若需要，模型返回 finish_reason="tool_calls"，包含函数名和参数
4. 开发者执行函数，获取结果
5. 将函数结果作为 tool 角色消息发回
6. 模型根据结果生成最终回复
```

### 最简示例

```python
import json
from openai import OpenAI

client = OpenAI()

# 第一步：定义工具
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_current_time",
            "description": "获取当前时间",
            "parameters": {
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "时区，如 Asia/Shanghai"
                    }
                },
                "required": []
            }
        }
    }
]

# 第二步：发送请求
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "现在几点了？"}],
    tools=tools,
)

message = response.choices[0].message
print(f"finish_reason: {response.choices[0].finish_reason}")
# 输出: finish_reason: tool_calls

# 第三步：检查是否需要调用函数
if message.tool_calls:
    tool_call = message.tool_calls[0]
    print(f"函数名: {tool_call.function.name}")
    print(f"参数: {tool_call.function.arguments}")
```

---

## 如何定义函数 Schema

函数的描述质量直接影响模型能否正确调用，需要遵循 JSON Schema 规范。

### Schema 结构说明

```python
{
    "type": "function",
    "function": {
        "name": "函数名称",           # 英文，下划线分隔，如 get_weather
        "description": "函数描述",    # 清晰说明函数用途，越详细越好
        "parameters": {
            "type": "object",
            "properties": {
                "参数名": {
                    "type": "string | number | boolean | array | object",
                    "description": "参数说明",
                    "enum": ["可选值1", "可选值2"],  # 可选，限定枚举值
                    "default": "默认值"               # 可选
                }
            },
            "required": ["必填参数1", "必填参数2"]   # 必填参数列表
        }
    }
}
```

### 参数类型对照表

| JSON Schema 类型 | Python 类型 | 示例 |
|----------------|------------|------|
| string | str | "北京" |
| number | int / float | 3.14 |
| integer | int | 42 |
| boolean | bool | true |
| array | list | ["a", "b"] |
| object | dict | {"key": "value"} |

### 复杂参数示例

```python
# 带有嵌套对象和数组的复杂 schema
search_schema = {
    "type": "function",
    "function": {
        "name": "search_products",
        "description": "在电商平台搜索商品，支持多种筛选条件",
        "parameters": {
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "搜索关键词"
                },
                "filters": {
                    "type": "object",
                    "description": "筛选条件",
                    "properties": {
                        "price_range": {
                            "type": "object",
                            "properties": {
                                "min": {"type": "number", "description": "最低价格"},
                                "max": {"type": "number", "description": "最高价格"}
                            }
                        },
                        "categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "商品分类列表"
                        },
                        "in_stock": {
                            "type": "boolean",
                            "description": "是否仅显示有库存商品",
                            "default": True
                        }
                    }
                },
                "sort_by": {
                    "type": "string",
                    "enum": ["price_asc", "price_desc", "rating", "sales"],
                    "description": "排序方式",
                    "default": "sales"
                },
                "page": {
                    "type": "integer",
                    "description": "页码，从 1 开始",
                    "default": 1
                }
            },
            "required": ["keyword"]
        }
    }
}
```

---

## 完整示例：天气查询

```python
import json
import requests
from openai import OpenAI

client = OpenAI()

# ============ 真实工具实现 ============

def get_weather(city: str, date: str = "today") -> dict:
    """
    调用天气 API 获取天气信息
    实际项目中替换为真实的天气 API
    """
    # 模拟 API 调用结果
    weather_data = {
        "city": city,
        "date": date,
        "condition": "晴天",
        "temperature": {"high": 22, "low": 15, "unit": "celsius"},
        "humidity": 45,
        "wind": {"speed": 12, "direction": "北风"},
        "aqi": 42,
        "suggestion": "空气质量良好，适合户外运动"
    }
    return weather_data

def get_forecast(city: str, days: int = 3) -> list:
    """获取未来几天的天气预报"""
    forecasts = []
    conditions = ["晴天", "多云", "小雨", "阴天", "大风"]

    for i in range(days):
        forecasts.append({
            "date": f"2024-01-{15 + i:02d}",
            "condition": conditions[i % len(conditions)],
            "temperature": {"high": 20 - i, "low": 10 - i}
        })
    return forecasts

# ============ 工具 schema 定义 ============

weather_tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定城市当天或指定日期的天气信息，包括温度、湿度、风力和出行建议",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称，如：北京、上海、广州、深圳"
                    },
                    "date": {
                        "type": "string",
                        "description": "查询日期，支持 'today'（今天）、'tomorrow'（明天）或具体日期 'YYYY-MM-DD'",
                        "default": "today"
                    }
                },
                "required": ["city"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_forecast",
            "description": "获取指定城市未来多天的天气预报",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称"
                    },
                    "days": {
                        "type": "integer",
                        "description": "预报天数，1-7 天",
                        "default": 3
                    }
                },
                "required": ["city"]
            }
        }
    }
]

# 工具调度
TOOL_REGISTRY = {
    "get_weather": get_weather,
    "get_forecast": get_forecast,
}

# ============ 核心调用逻辑 ============

def weather_assistant(user_query: str) -> str:
    """天气查询助手"""
    messages = [
        {
            "role": "system",
            "content": "你是一个天气助手，可以查询实时天气和天气预报。请用友好的语气回答用户问题。"
        },
        {"role": "user", "content": user_query}
    ]

    # 第一次调用：让模型决定是否调用工具
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=weather_tools,
        tool_choice="auto"
    )

    message = response.choices[0].message

    # 如果没有工具调用，直接返回
    if not message.tool_calls:
        return message.content

    # 处理工具调用
    messages.append(message)  # 将 assistant 消息加入历史

    for tool_call in message.tool_calls:
        func_name = tool_call.function.name
        func_args = json.loads(tool_call.function.arguments)

        print(f"[调用工具] {func_name}({func_args})")

        # 执行工具
        result = TOOL_REGISTRY[func_name](**func_args)

        # 将工具结果加入消息历史
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "name": func_name,
            "content": json.dumps(result, ensure_ascii=False)
        })

    # 第二次调用：让模型根据工具结果生成最终回复
    final_response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
    )

    return final_response.choices[0].message.content

# 测试
if __name__ == "__main__":
    print(weather_assistant("北京今天天气怎么样？"))
    print(weather_assistant("上海未来三天天气预报"))
```

---

## 完整示例：数据库查询

```python
import json
import sqlite3
from openai import OpenAI

client = OpenAI()

# ============ 模拟数据库 ============

def init_db():
    """初始化示例数据库"""
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            customer_name TEXT,
            product TEXT,
            amount REAL,
            status TEXT,
            created_at TEXT
        )
    """)

    # 插入示例数据
    cursor.executemany(
        "INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?)",
        [
            (1, "张三", "MacBook Pro", 15999.0, "已完成", "2024-01-10"),
            (2, "李四", "iPhone 15", 7999.0, "配送中", "2024-01-12"),
            (3, "张三", "AirPods", 1299.0, "已完成", "2024-01-13"),
            (4, "王五", "iPad Pro", 8999.0, "待付款", "2024-01-14"),
        ]
    )
    conn.commit()
    return conn

DB_CONN = init_db()

# ============ 数据库工具函数 ============

def query_orders(
    customer_name: str = None,
    status: str = None,
    limit: int = 10
) -> list:
    """查询订单"""
    sql = "SELECT * FROM orders WHERE 1=1"
    params = []

    if customer_name:
        sql += " AND customer_name = ?"
        params.append(customer_name)

    if status:
        sql += " AND status = ?"
        params.append(status)

    sql += f" LIMIT {limit}"

    cursor = DB_CONN.execute(sql, params)
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()

    return [dict(zip(columns, row)) for row in rows]

def get_order_stats(customer_name: str = None) -> dict:
    """获取订单统计信息"""
    if customer_name:
        sql = """
            SELECT
                COUNT(*) as total_orders,
                SUM(amount) as total_amount,
                AVG(amount) as avg_amount
            FROM orders
            WHERE customer_name = ?
        """
        cursor = DB_CONN.execute(sql, [customer_name])
    else:
        sql = """
            SELECT
                COUNT(*) as total_orders,
                SUM(amount) as total_amount,
                AVG(amount) as avg_amount
            FROM orders
        """
        cursor = DB_CONN.execute(sql)

    row = cursor.fetchone()
    return {
        "total_orders": row[0],
        "total_amount": row[1],
        "avg_amount": round(row[2], 2) if row[2] else 0
    }

# ============ Schema 定义 ============

db_tools = [
    {
        "type": "function",
        "function": {
            "name": "query_orders",
            "description": "查询订单列表，可按客户姓名和订单状态筛选",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {
                        "type": "string",
                        "description": "客户姓名，不填则查询所有客户"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["已完成", "配送中", "待付款", "已取消"],
                        "description": "订单状态筛选"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "返回记录数上限",
                        "default": 10
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_order_stats",
            "description": "获取订单统计信息，包括订单总数、总金额、平均金额",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {
                        "type": "string",
                        "description": "客户姓名，不填则统计所有客户"
                    }
                },
                "required": []
            }
        }
    }
]
```

---

## 并行 Function Calling

GPT-4 支持在一次响应中同时调用多个函数，减少来回次数。

```python
def handle_parallel_tool_calls(user_query: str) -> str:
    """处理并行工具调用"""
    messages = [{"role": "user", "content": user_query}]

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=weather_tools,
        tool_choice="auto"
    )

    message = response.choices[0].message

    if not message.tool_calls:
        return message.content

    messages.append(message)

    # 并行处理所有工具调用
    print(f"本次并行调用 {len(message.tool_calls)} 个工具")

    for tool_call in message.tool_calls:
        func_name = tool_call.function.name
        func_args = json.loads(tool_call.function.arguments)

        print(f"  - {func_name}({func_args})")
        result = TOOL_REGISTRY[func_name](**func_args)

        # 每个工具调用对应一个 tool 消息，通过 tool_call_id 关联
        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": json.dumps(result, ensure_ascii=False)
        })

    # 所有工具结果都加入后，再次调用模型
    final_response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
    )

    return final_response.choices[0].message.content

# 测试：同时查询多个城市的天气
# 模型会并行调用 get_weather("北京") 和 get_weather("上海")
result = handle_parallel_tool_calls("帮我比较一下北京和上海今天的天气")
print(result)
```

---

## 错误处理

```python
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

def safe_execute_tool(
    tool_name: str,
    tool_args: dict,
    tool_registry: dict
) -> tuple[Any, bool]:
    """
    安全执行工具调用，统一处理异常

    Returns:
        (result, success): 结果和是否成功的元组
    """
    if tool_name not in tool_registry:
        error_msg = f"工具 '{tool_name}' 不存在，可用工具: {list(tool_registry.keys())}"
        logger.warning(error_msg)
        return error_msg, False

    try:
        result = tool_registry[tool_name](**tool_args)
        return result, True

    except TypeError as e:
        # 参数类型或数量错误
        error_msg = f"工具 {tool_name} 参数错误: {str(e)}"
        logger.error(error_msg)
        return error_msg, False

    except Exception as e:
        # 其他运行时错误
        error_msg = f"工具 {tool_name} 执行失败: {type(e).__name__}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return error_msg, False


def robust_agent(user_query: str, tools_def: list, tool_registry: dict) -> str:
    """带错误处理的健壮 Agent"""
    messages = [{"role": "user", "content": user_query}]
    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=tools_def,
            tool_choice="auto"
        )

        message = response.choices[0].message
        messages.append(message)

        if response.choices[0].finish_reason == "stop":
            return message.content

        has_error = False

        for tool_call in (message.tool_calls or []):
            func_name = tool_call.function.name

            # 安全解析 JSON 参数
            try:
                func_args = json.loads(tool_call.function.arguments)
            except json.JSONDecodeError as e:
                func_args = {}
                result = f"参数 JSON 解析失败: {str(e)}"
                has_error = True
            else:
                result, success = safe_execute_tool(
                    func_name, func_args, tool_registry
                )
                if not success:
                    has_error = True

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result, ensure_ascii=False)
                           if not isinstance(result, str)
                           else result
            })

        # 如果有错误，增加重试计数
        if has_error:
            retry_count += 1
            if retry_count >= max_retries:
                messages.append({
                    "role": "user",
                    "content": "工具调用多次失败，请尝试用你已有的知识直接回答。"
                })

    # 最终强制生成回复
    final = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
    )
    return final.choices[0].message.content
```

---

## 与 Anthropic Claude 的 Tool Use 对比

Claude 提供了等价的工具调用功能，称为 **Tool Use**，格式略有不同。

### 格式对比

**OpenAI Function Calling**：

```python
# 请求格式
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "...",
        "parameters": { ... }
    }
}]

# 响应中的工具调用
# message.tool_calls[0].function.name
# message.tool_calls[0].function.arguments  (JSON 字符串)

# 工具结果消息
{"role": "tool", "tool_call_id": "xxx", "content": "结果"}
```

**Anthropic Claude Tool Use**：

```python
import anthropic

client = anthropic.Anthropic()

# 请求格式（tools 结构相似，但无 "type": "function" 包装）
tools = [{
    "name": "get_weather",
    "description": "...",
    "input_schema": {   # 注意：用 input_schema 而非 parameters
        "type": "object",
        "properties": { ... },
        "required": [...]
    }
}]

response = client.messages.create(
    model="claude-opus-4-5",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "北京天气怎么样？"}]
)

# 响应解析
for block in response.content:
    if block.type == "tool_use":
        tool_name = block.name
        tool_input = block.input   # 直接是 dict，不是 JSON 字符串

# 工具结果消息格式不同
messages.append({
    "role": "user",
    "content": [{
        "type": "tool_result",
        "tool_use_id": block.id,
        "content": json.dumps(result, ensure_ascii=False)
    }]
})
```

### 主要差异汇总

| 特性 | OpenAI | Anthropic Claude |
|------|--------|-----------------|
| 工具定义字段 | `parameters` | `input_schema` |
| 外层包装 | `{"type": "function", "function": {...}}` | 直接对象 |
| 参数格式 | JSON 字符串（需 `json.loads`） | 直接 dict |
| 工具结果角色 | `tool` | `user`（content 为数组） |
| 停止原因 | `tool_calls` | `tool_use` |
| 并行调用 | 支持 | 支持 |
| 强制调用 | `tool_choice: {"type": "function", "function": {"name": "xxx"}}` | `tool_choice: {"type": "tool", "name": "xxx"}` |

### 兼容层封装

如果需要同时支持两个平台，可以封装一个统一接口：

```python
from abc import ABC, abstractmethod

class LLMClient(ABC):
    """统一的 LLM 工具调用接口"""

    @abstractmethod
    def chat_with_tools(
        self,
        messages: list,
        tools: list,
        system: str = None
    ) -> tuple[str, list]:
        """
        Returns:
            (final_response, tool_calls_log)
        """
        pass

class OpenAIClient(LLMClient):
    def chat_with_tools(self, messages, tools, system=None):
        # OpenAI 实现
        ...

class ClaudeClient(LLMClient):
    def chat_with_tools(self, messages, tools, system=None):
        # Claude 实现，处理格式差异
        ...
```

---

## 常见问题

### 1. 模型不调用工具，直接回答

**原因**：工具描述不够清晰，或问题可以直接回答。

**解决方案**：
- 改进工具描述，明确说明何时应使用该工具
- 使用 `tool_choice: "required"` 强制调用工具（慎用）

### 2. 工具参数不符合预期

**原因**：参数描述不够具体，模型推断有误。

**解决方案**：
- 在参数描述中加入具体格式示例
- 对枚举值使用 `enum` 字段约束

### 3. 工具结果被忽略

**原因**：工具结果消息格式错误，或 `tool_call_id` 不匹配。

**解决方案**：
```python
# 确保 tool_call_id 与请求中的 id 对应
for tool_call in message.tool_calls:
    result = execute_tool(tool_call.function.name, ...)
    messages.append({
        "role": "tool",
        "tool_call_id": tool_call.id,  # 必须与 tool_call.id 一致
        "content": str(result)
    })
```
