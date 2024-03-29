# 异步io

## 基础概念

异步 IO 是一种并发编程设计，已在 Python 中获得专门支持，从 Python 3.4 快速发展到 3.7，甚至可能更高。

首先要理解几个概念：异步(Asynchronous)，同步(Synchronous)，并发(concurrency)，并行(parallelism)，线程(threading)和多进程(multiprocessing)。

- 同步(Synchronous): 执行多个任务，任务的执行顺序是有序的,前一个任务做完后再执行后一个任务，当前任务结束之前,不会执行下一个任务。
- 异步(Asynchronous): 执行多个任务时，任务执行顺序是不固定的，多个任务可以同时执行而不需要按顺序等待。
- 并发(concurrency): 同一时间段处理多个任务，强调的是可以运行多个任务。并发的概念更广泛，并行只是是并发中的一种情况。
- 并行(parallelism): 同一时刻可以执行多个任务，强调是同一时刻。在Python中，由于GIL的存在，多进程是常见的一种实现并发的手段。
- 线程(threading): 线程是进程中的基本执行单元,一个进程中可以包含多个线程。线程是一种并发执行模型，多个线程轮流执行任务。由于GIL的存在，同一时刻，一个Python解释器只允许一个线程执行。 关于GIL的具体可查看： [Python GIL](https://realpython.com/python-gil/)。线程更适合 IO 密集型任务
- 多进程(multiprocessing): 进程是操作系统资源分配的基本单位,每个进程有独立的内存空间。多进程可以利用多核CPU实现真正的并行计算。

![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/t5TlwL.png)


总结一下:

同步是顺序执行,异步是不需要等待的执行方式。并发是同一时间段有多个任务执行,并行是同一时刻有多个任务执行。多线程可以实现并发，适合 IO 密集型任务。多进程可以实现并行，适合 CPU 密集型任务。


从Python3.4开始，CPython 中更全面地内置了一种单独的设计：异步 IO，通过标准库的 ``asyncio` 包以及新的 `async` 和 `await` 语言关键字。

Python 文档将 `asyncio` 包视为编写并发代码的库。然而，异步IO不是线程，也不是多进程。它不是建立在这两者之上的。

事实上，异步 IO 是一种单线程、单进程设计：它使用协作式多任务处理(cooperative multitasking)。换句话说，尽管在单个进程中使用单个线程，异步 IO 仍给人一种并发的感觉。协程(Coroutines: Co-routine 协作的程序)（异步 IO 的核心功能）可以并发调度，但它们本质上并不是同时执行的。

异步 IO 是一种并发(concurrency)编程风格，但它不是并行(parallelism)。对比多线程和多进程，异步 IO 和多线程更接近，但与这两者有很大不同，是并发技术中的一个单独的技术。

## 异步 IO 解释

异步 IO 乍一看可能违反直觉且自相矛盾。怎么可能使用单线程和单 CPU 核心并发的执行代码？

下面是一个例子：

象棋大师小明举办了一个象棋比赛，他和多个业余棋手进行比赛。他进行比赛有同步和异步两种方法。

假设： 
1. 有 24 个对手
2. 小明在 5 秒内可以完成一步棋
3. 其他人需要在 55 秒内完成走棋
4. 游戏平均 30 步（一个人走30步，两个人总共60步）

同步的方式：

小明一次玩一局，每局结束后，小明再接着下一局，直到所有对手都完成比赛。
```text
# 一局比赛的执行时间为：
# 小明走的时间 + 对手走的时间
5 + 55 = 60 秒
一局比赛的时间为
30 * 60 = 1800 秒 = 30 分钟
# 完成所有比赛的时间：
24 * 30 = 720 分钟 = 12 小时
```

异步的方式：

小明和一名棋手下完就接着和另一名棋手下，忽略切换对手的时间。

```text
# 小明和所有对手走完一步的时间为：
24 * 5 = 120 秒
# 整个比赛结束需要小明走30步, 完成所有比赛的时间：
120 * 30 + 55 = 3655 秒  # 1个小时多一点
# 最后的55秒是最后一个对手最后一步的走棋时间
```

类比到多进程和多线程中，小明只有一个人，表示是一个单进程，小明一次只能走一步棋，这就是一个单线程。但是通过异步的方式，将比赛时间从 7 个小时缩短到了 1 个小时。


## async / await 和协程(Coroutines)



## 参考链接

- [Python 官方文档：异步 I/O](https://docs.python.org/zh-cn/3/library/asyncio.html)
- [RealPython: Async IO in Python](https://realpython.com/async-io-python/)
- [一文为你讲解清楚并发，同步，异步，互斥，阻塞，非阻塞](https://cloud.tencent.com/developer/article/1829301)