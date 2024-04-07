# MongoDB

## 数据库
在MongoDB中，文档集合保存在数据库中。
要选择使用的数据库，请在mongoshell程序中发出 `use <db>` 语句，如下方示例：
```
use myDB
```
创建数据库
如果数据库不存在，则在您第一次为该数据库存储数据时，MongoDB会创建该数据库。这样，您可以切换到不存在的数据库并在mongoshell中执行以下操作 ：
```
use myNewDB

db.myNewCollection1.insertOne( { x: 1 } )
```
该`insertOne()`操作将同时创建数据库myNewDB和集合myNewCollection1（如果它们尚不存在）。确保数据库名称和集合名称均遵循MongoDB 命名限制。

## 集合
MongoDB将文档存储在集合中。集合类似于关系数据库中的表。
### 创建集合
如果不存在集合，则在您第一次为该集合存储数据时，MongoDB会创建该集合。
```
db.myNewCollection2.insertOne( { x: 1 } )
db.myNewCollection3.createIndex( { y: 1 } )
```
如果`insertOne()`和`createIndex()`操作都还不存在，则会创建它们各自的集合。确保集合名称遵循MongoDB 命名限制。
### 显示创建
 MongoDB提供了`db.createCollection()`使用
各种选项显式创建集合的方法，例如设置最大大小或文档验证规则。如果未指定这些选项，则无需显式创建集合，因为在首次存储集合数据时，MongoDB会创建新集合。