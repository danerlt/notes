# MarkDown画图(实例讲解) —— 流程图、序列图、饼图、甘特图



>   作者：knowlege_picker
>   链接：https://www.jianshu.com/p/77cc07f47cdc
>   来源：简书



写这篇文章的目的主要是**学习markdown画图**。目前支持画图的MarkDown工具只有**Typora和有道云笔记**

**ProcessOn VS MarkDown。**虽然ProcessOn也能做这件事情，但是每次使用都要以图片的形式进行编辑，不便于微调。在不同应用之间前切换也比较麻烦

**我的学习方法**。我会想出一个综合性的场景，然后把所有的知识点融入到一张图里去。这样做的好处是，回忆的时候只用回忆一张图就够了，提高回忆效率。

[语法参见官网](https://mermaid.js.org/#/)

**文章目录如下：**

-   流程图代码如下：
-   代码说明：
-   typora中效果图如下：
-   序列图代码如下：
-   代码说明:
-   typora中效果图如下：
-   饼图代码如下：
-   typora中效果图如下：
-   甘特图代码说明:
-   代码如下：
-   typora中展示效果如下：

## 流程图

#### 代码如下：



```php
graph TB;
subgraph 分情况
A(开始)-->B{判断}
end
B--第一种情况-->C[第一种方案]
B--第二种情况-->D[第二种方案]
B--第三种情况-->F{第三种方案}
subgraph 分种类
F-.第1个.->J((测试圆形))
F-.第2个.->H>右向旗帜形]
end
H---I(测试完毕)
C--票数100---I(测试完毕)
D---I(测试完毕)
J---I(测试完毕)
```

#### 代码说明：

| 字母表示 | 含义     |
| -------- | -------- |
| TB       | 从上到下 |
| BT       | 从下到上 |
| LR       | 从左到右 |
| RL       | 从右到左 |

| 表述       | 说明         | 含义                                               |
| ---------- | ------------ | -------------------------------------------------- |
| id[文字]   | 矩形节点     | 表示过程                                           |
| id(文字)   | 圆角矩形节点 | 表示开始与结束                                     |
| id((文字)) | 圆形节点     | 表示连接。为避免流程过长或有交叉，可将流程切开成对 |
| id{文字}   | 菱形节点     | 表示判断、决策                                     |
| id>文字 ]  | 右向旗帜节点 |                                                    |

>   1.  T、B、L、T分别是Top/Bottom/Left/Right的缩写
>
>   1.  id为节点的唯一标识，类似于变量。括号内为节点要显示的文字
>
>   1.  单向箭头为流程进行方向。支持虚线与实线，有箭头与无箭头、有文字与无文字。分别是---、-.-、 -->、-.->、--文字-->、-.文字.->、--文字---、-.文字.-
>
>   1.  支持子图。如代码、效果图所示。

#### typora中效果图如下：

![img](https:////upload-images.jianshu.io/upload_images/24068455-2f881f60be5c1c30.png?imageMogr2/auto-orient/strip|imageView2/2/w/658/format/webp)

流程图.png

## 序列图

序列图共有5个部分，分别是：**参与者、消息线、循环、选择、可选、并行、注解**。我们来模拟一个综合场景，如下图所示:

![img](https:////upload-images.jianshu.io/upload_images/24068455-1abd79caf00b05b9.jpg?imageMogr2/auto-orient/strip|imageView2/2/w/1200/format/webp)

购买书籍序列图.jpg

#### 代码如下：



```rust
sequenceDiagram
Title: 小明买书

participant consumer as 小明
participant store as 书店
participant publisher as 出版社

consumer ->> store: 想买一本限量版书籍
store -->> consumer: 缺货
consumer ->> store: 隔一个月再次询问
store -->> consumer: 抢完了
loop 一个星期一次
consumer -x +store: 有货了吗
store --x -consumer: 正在订,有货马上通知你
end

store ->> publisher: 我要订购一批货
publisher --x store: 返回所有书籍的类别信息

alt 书籍类别符合要求
store ->> publisher: 请求书单信息
publisher --x store: 返回该类别书单信息
else 书单里的书有市场需求
store ->> publisher: 购买指定数据
publisher --x store: 确认订单
else 书籍不符合要求
store -->> publisher: 暂时不购买
end

par 并行执行
publisher ->> publisher : 生产
publisher ->> publisher : 销售
end

opt 书籍购买量>=500 && 库存>=50
publisher ->> store : 出货
store --x publisher : 确认收货
end

Note left of consumer : 图书收藏家
Note over consumer,store : 去书店购买书籍
Note left of store : 全国知名书店
Note over store,publisher : 去出版社进货
Note left of publisher : 持有版权的出版社
```

#### 代码说明:

1.  消息线

| 类型 | 描述                             |
| ---- | -------------------------------- |
| ->   | 无箭头的实线                     |
| -->  | 无箭头的虚线                     |
| ->>  | 有箭头的实线(主动发出消息)       |
| -->> | 有箭头的虚线(响应)               |
| -x   | 末端为X的实线(主动发出异步消息)  |
| --x  | 有箭头的实线(以异步形式响应消息) |

>   alt 可以理解为可替代的方案，可能的情况
>
>   opt可以理解为一个if语句，满足条件下执行的操作

#### typora中效果图如下：

![img](https:////upload-images.jianshu.io/upload_images/24068455-3a7f4fe83fdef536.png?imageMogr2/auto-orient/strip|imageView2/2/w/468/format/webp)

序列图.png

## 饼图

#### 代码如下：



```bash
pie
 title Pie Chart
 "Dogs" : 386
 "cats" : 567
 "rabbit" : 700
 "pig":365
 "tiger" : 15
```

#### typora中效果图如下：

![img](https:////upload-images.jianshu.io/upload_images/24068455-99e43b5361e6805a.png?imageMogr2/auto-orient/strip|imageView2/2/w/1200/format/webp)

饼图.png

## 甘特图

这是我用Process做的，我们就以张图为例，用MarkDown画一张甘特图吧。

顺便对比一下这两种方式，看看哪个展示效果好一点

![img](https:////upload-images.jianshu.io/upload_images/24068455-254b9f963e7832a5.jpg?imageMogr2/auto-orient/strip|imageView2/2/w/1200/format/webp)

甘特图.jpg

#### 代码说明：

从官网上看一下**语法**，如下所示:



```csharp
gantt
 dateFormat  YYYY-MM-DD    //底部的时间格式
 title     Adding GANTT diagram functionality to mermaid   //甘特图名称
 excludes   weekends               //周末有休息

 section A         //可以理解为一个功能模块
 task1        :done,des1, 2014-01-06,2014-01-08   //可以理解为这个功能模块的各项进度安排
 task2        :active,des2, 2014-01-09, 3d      //以下参数都是合法的
 task3        :des3, after des2, 5d          //我们等一下每个都试一下
 task4        :crit, done, 2014-01-06,24h
 task5        :crit, done, after des1, 2d
 task6        :crit, active, 3d
 task7        :crit, 5d
 task8        :2d
 task9        :1d
 ...         :[参数1:crit,可不填],[参数2:active,done,可不填表示待完成],[参数3:小名],
 [参数4:开始时间],[参数5:结束时间]
 section B
 section C 
 ...
```

这里要注意的是，时间的表示有多种，如上，

可以是

-   2014-01-06,2014-01-08
-   2014-01-09, 3d
-   after des2, 5d
-   5d
-   状态默认是待完成，建议给每个任务desc

#### 代码如下：



```css
gantt
 dateFormat  YYYY-MM-DD
 title     软件开发任务进度安排 
 excludes   weekends

 section 软硬件选型 
 硬件选择      :done,desc1, 2020-01-01,6w 
 软件设计      :active,desc2, after desc1,3w

 section 编码准备
 软件选择       :crit,done,desc3,2020-01-01,2020-01-29
 编码和测试软件   :1w
 安装测试系统    :2020-02-12,1w

 section 完成论文
 编写手册      :desc5,2020-01-01,10w
 论文修改      :crit,after desc3,3w
 论文定稿      :after desc5,3w
```

#### typora中展示效果如下：

![img](https:////upload-images.jianshu.io/upload_images/24068455-ce4d6932263e281e.png?imageMogr2/auto-orient/strip|imageView2/2/w/1200/format/webp)

甘特图.png



