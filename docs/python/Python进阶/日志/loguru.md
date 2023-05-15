# Python日志库 loguru 使用教程

## 安装

```bash
pip install loguru
```
## 特性

### 开箱即用，无需样板文件

Loguru的主要概念是有且只有一个 `logger` 。
为了方便起见，它是预先配置的，并从 `stderr` 开始输出（但这是完全可配置的）。

```python
from loguru import logger

logger.debug("That's it, beautiful and simple logging!")
```

`logger` 只是一个接口，它将日志消息分派给已配置的处理程序。

### 无Handler、无Formatter、无Filter,一个函数来搞定

如何添加 Handler ？如何设置日志格式？如何过滤日志消息？如何设置日志级别？

答案是： `add()` 函数。

添加一个处理程序，将日志消息发送到`sink`。`sink`（文件类对象、字符串、pathlib.Path 对象、可调用对象、协程函数或
logging.Handler）负责接收格式化的日志消息并将其传播到适当的终端的对象。

### 更易于文件日志记录，支持轮换/保留/压缩

如果想将记录的消息发送到一个文件，只需要使用字符串路径作为接收器。为了方便，它也可以自动计时：

```python

logger.add("file_{time}.log")
```

如果需要轮转日志，或者删除旧的日志，或者在关闭时压缩文件，它也很容易配置。

```python

logger.add("file_1.log", rotation="500 MB")  # 日志文件超过500MB，自动轮转
logger.add("file_2.log", rotation="12:00")  # 每天12点轮转
logger.add("file_3.log", rotation="1 week")  # 每周轮转

logger.add("file_X.log", retention="10 days")  # 每隔10天轮转

logger.add("file_Y.log", compression="zip")  # 使用zip压缩轮转的日志文件
```

### 使用大括号格式化字符串

Loguru喜欢更优雅和强大的 `{}` 格式，而不是 `%` ，日志功能实际上相当于 `str.format()` 。

```python
logger.info("If you're using Python {}, prefer {feature} of course!", 3.6, feature="f-strings")
```

源码解析：
首先调用 `info`方法, 在 `loguru._logger.py` 中定义如下，这个方法直接调用了 `_log` 方法，将上面日志中的 `3.6` 当作 `args`
传入，将 `feature="f-strings"` 当作 `kwargs` 传入。

```python
def info(__self, __message, *args, **kwargs):  # noqa: N805
    r"""Log ``message.format(*args, **kwargs)`` with severity ``'INFO'``."""
    __self._log("INFO", False, __self._options, __message, args, kwargs)
```

`_log`方法定义如下：

```python

    def _log(self, level, from_decorator, options, message, args, kwargs):
        core = self._core

        if not core.handlers:
            return

        try:
            level_id, level_name, level_no, level_icon = core.levels_lookup[level]
        except (KeyError, TypeError):
            if isinstance(level, str):
                raise ValueError("Level '%s' does not exist" % level) from None
            if not isinstance(level, int):
                raise TypeError(
                    "Invalid level, it should be an integer or a string, not: '%s'"
                    % type(level).__name__
                ) from None
            if level < 0:
                raise ValueError(
                    "Invalid level value, it should be a positive integer, not: %d" % level
                ) from None
            cache = (None, "Level %d" % level, level, " ")
            level_id, level_name, level_no, level_icon = cache
            core.levels_lookup[level] = cache

        if level_no < core.min_level:
            return

        (exception, depth, record, lazy, colors, raw, capture, patchers, extra) = options

        frame = get_frame(depth + 2)

        try:
            name = frame.f_globals["__name__"]
        except KeyError:
            name = None

        try:
            if not core.enabled[name]:
                return
        except KeyError:
            enabled = core.enabled
            if name is None:
                status = core.activation_none
                enabled[name] = status
                if not status:
                    return
            else:
                dotted_name = name + "."
                for dotted_module_name, status in core.activation_list:
                    if dotted_name[: len(dotted_module_name)] == dotted_module_name:
                        if status:
                            break
                        enabled[name] = False
                        return
                enabled[name] = True

        current_datetime = aware_now()

        code = frame.f_code
        file_path = code.co_filename
        file_name = basename(file_path)
        thread = current_thread()
        process = current_process()
        elapsed = current_datetime - start_time

        if exception:
            if isinstance(exception, BaseException):
                type_, value, traceback = (type(exception), exception, exception.__traceback__)
            elif isinstance(exception, tuple):
                type_, value, traceback = exception
            else:
                type_, value, traceback = sys.exc_info()
            exception = RecordException(type_, value, traceback)
        else:
            exception = None

        log_record = {
            "elapsed": elapsed,
            "exception": exception,
            "extra": {**core.extra, **context.get(), **extra},
            "file": RecordFile(file_name, file_path),
            "function": code.co_name,
            "level": RecordLevel(level_name, level_no, level_icon),
            "line": frame.f_lineno,
            "message": str(message),
            "module": splitext(file_name)[0],
            "name": name,
            "process": RecordProcess(process.ident, process.name),
            "thread": RecordThread(thread.ident, thread.name),
            "time": current_datetime,
        }

        if lazy:
            args = [arg() for arg in args]
            kwargs = {key: value() for key, value in kwargs.items()}

        if capture and kwargs:
            log_record["extra"].update(kwargs)

        if record:
            if "record" in kwargs:
                raise TypeError(
                    "The message can't be formatted: 'record' shall not be used as a keyword "
                    "argument while logger has been configured with '.opt(record=True)'"
                )
            kwargs.update(record=log_record)

        if colors:
            if args or kwargs:
                colored_message = Colorizer.prepare_message(message, args, kwargs)
            else:
                colored_message = Colorizer.prepare_simple_message(str(message))
            log_record["message"] = colored_message.stripped
        elif args or kwargs:
            colored_message = None
            log_record["message"] = message.format(*args, **kwargs)
        else:
            colored_message = None

        if core.patcher:
            core.patcher(log_record)

        for patcher in patchers:
            patcher(log_record)

        for handler in core.handlers.values():
            handler.emit(log_record, level_id, from_decorator, raw, colored_message)
```

其中
```python
        elif args or kwargs:
            colored_message = None
            log_record["message"] = message.format(*args, **kwargs)
```
这里的 `message.format(*args, **kwargs)` 就是将`logger.info`中的`args`和`kwargs`传递过来格式化字符串。


### 在线程或主线程内捕获异常
你有没有见过你的程序意外崩溃，而在日志文件中看不到任何东西？您是否注意到线程中发生的异常没有被记录下来？这可以使用 `catch()` 装饰器/上下文管理器来解决，它确保任何错误都正确地传播到 `logger` 。

```python
@logger.catch
def my_function(x, y, z):
    # An error? It's caught anyway!
    return 1 / (x + y + z)
```
### 漂亮的颜色记录
如果终端兼容，`Loguru`会自动为日志添加颜色。可以使用[标签](https://loguru.readthedocs.io/en/stable/api/logger.html#color)来定义自己喜欢的样式。
```python
logger.add(sys.stdout, colorize=True, format="<green>{time}</green> <level>{message}</level>")
```

### 异步、线程安全、多进程安全
默认情况下，添加到 `logger` 的所有接收器都是线程安全的。*它们不是多进程安全的*，但您可以 `enqueue` 消息以确保日志的完整性。如果您想要异步日志记录，也可以使用相同的参数。
```python
logger.add("somefile.log", enqueue=True)
```
支持用作接收器的协程函数，使用 `complete()`实现异步。



### 完整的异常描述
记录代码中发生的异常对于跟踪错误非常重要，但如果不知道失败的原因，则相当无用。

`Loguru`通过允许显示整个堆栈跟踪（包括变量值）来帮助您识别问题（使用了[`better_exceptions`项目](https://github.com/Qix-/better-exceptions)！）。

示例代码：
```python
logger.add("out.log", backtrace=True, diagnose=True)  # 注意，可能会在生产环境中泄露敏感数据

def func(a, b):
    return a / b

def nested(c):
    try:
        func(5, c)
    except ZeroDivisionError:
        logger.exception("What?!")

nested(0)
```

日志内容：
```text
2018-07-17 01:38:43.975 | ERROR    | __main__:nested:10 - What?!
Traceback (most recent call last):

  File "test.py", line 12, in <module>
    nested(0)
    └ <function nested at 0x7f5c755322f0>

> File "test.py", line 8, in nested
    func(5, c)
    │       └ 0
    └ <function func at 0x7f5c79fc2e18>

  File "test.py", line 4, in func
    return a / b
           │   └ 0
           └ 5

ZeroDivisionError: division by zero
```

请注意，由于帧数据不可用，该特性在默认`Python REPL`上不起作用。

### 根据需要进行结构化日志记录

使用 `serialize` 参数，每个日志消息在发送到配置的接收器之前将被转换为JSON字符串。

```python
logger.add(custom_sink_function, serialize=True)
```

使用`bind()`方法，您可以通过修改额外记录属性来使日志消息具有上下文。
```python
logger.add("file.log", format="{extra[ip]} {extra[user]} {message}")
context_logger = logger.bind(ip="192.168.0.1", user="someone")
context_logger.info("Contextualize your logger easily")
context_logger.bind(user="someone_else").info("Inline binding of extra attribute")
context_logger.info("Use kwargs to add context during formatting: {user}", user="anybody")
```
可以使用 `contextualize()` 临时修改上下文本地状态：
```python
with logger.contextualize(task=task_id):
    do_something()
    logger.info("End of task")
```
还可以通过组合 `bind()` 和 `filter` 对日志进行更细粒度的控制：
```python
logger.add("special.log", filter=lambda record: "special" in record["extra"])
logger.debug("This message is not logged to the file")
logger.bind(special=True).info("This message, though, is logged to the file!")
```
最后， `patch()` 方法允许将动态值附加到每个新消息的`record `字典：
```python
logger.add(sys.stderr, format="{extra[utc]} {message}")
logger = logger.patch(lambda record: record["extra"].update(utc=datetime.utcnow()))
```

### 延迟计算昂贵函数
有时候，您希望在生产环境中记录详细信息而不影响性能，您可以使用 `opt()` 方法来实现这一点。
```python
logger.opt(lazy=True).debug("If sink level <= DEBUG: {x}", x=lambda: expensive_function(2**64))

# By the way, "opt()" serves many usages
logger.opt(exception=True).info("Error stacktrace added to the log message (tuple accepted too)")
logger.opt(colors=True).info("Per message <blue>colors</blue>")
logger.opt(record=True).info("Display values from the record (eg. {record[thread]})")
logger.opt(raw=True).info("Bypass sink formatting\n")
logger.opt(depth=1).info("Use parent stack context (useful within wrapped functions)")
logger.opt(capture=False).info("Keyword arguments not added to {dest} dict", dest="extra")
```

###  自定义日志级别
Loguru提供了所有标准日志记录级别，其中还添加了 `trace()` 和 `success()` 。还需要其他的日志级别，只需使用 `level()` 函数创建它。

```python
new_level = logger.level("SNAKY", no=38, color="<yellow>", icon="🐍")

logger.log("SNAKY", "Here we go!")
```

### 更好的日期时间处理
标准日志记录包含诸如`datefmt`或`msecs`、`%(asctime)s`和`%(created)s`等参数，以及缺乏时区信息的本地日期时间、不直观的格式等问题。Loguru解决了这些问题：

```python
logger.add("file.log", format="{time:YYYY-MM-DD at HH:mm:ss} | {level} | {message}")
```


### 适用于脚本和库

在脚本中使用日志记录器很容易，并且可以在启动时进行`configure()`配置。如果要从库内部使用`Loguru`，请记住永远不要调用`add()`，而是使用`disable()`使日志函数变为关闭。如果开发人员希望查看您的库的日志，则可以再次启用`enable()`。

示例代码
```python
# For scripts
config = {
    "handlers": [
        {"sink": sys.stdout, "format": "{time} - {message}"},
        {"sink": "file.log", "serialize": True},
    ],
    "extra": {"user": "someone"}
}
logger.configure(**config)

# For libraries
logger.disable("my_library")
logger.info("No matter added sinks, this message is not displayed")
logger.enable("my_library")
logger.info("This message however is propagated to the sinks")
```

### 与标准日志记录完全兼容

使用内置日志 `Handler `作为`Loguru`接收器
```python
handler = logging.handlers.SysLogHandler(address=('localhost', 514))
logger.add(handler)
```

将Loguru消息传播到标准日志记录
```python
class PropagateHandler(logging.Handler):
    def emit(self, record):
        logging.getLogger(record.name).handle(record)

logger.add(PropagateHandler(), format="{message}")
```

拦截发往Loguru接收器的标准日志消息
```python
class InterceptHandler(logging.Handler):
    def emit(self, record):
        # Get corresponding Loguru level if it exists.
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message.
        frame, depth = sys._getframe(6), 6
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())

logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
```

### 通过环境变量进行个性化默认设置
```bash

# Linux / OSX
export LOGURU_FORMAT="{time} | <lvl>{message}</lvl>"

# Windows
setx LOGURU_DEBUG_COLOR "<green>"
```


### 方便的解析器
从生成的日志中提取特定信息通常很有用，这就是为什么Loguru提供了一个`parse()`方法来处理日志和正则表达式。
```python

pattern = r"(?P<time>.*) - (?P<level>[0-9]+) - (?P<message>.*)"  # Regex with named groups
caster_dict = dict(time=dateutil.parser.parse, level=int)        # Transform matching groups

for groups in logger.parse("file.log", pattern, cast=caster_dict):
    print("Parsed:", groups)
    # {"level": 30, "message": "Log example", "time": datetime(2018, 12, 09, 11, 23, 55)}
```


### 全面通知器
`Loguru` 可以轻松地与强大的 `notifiers` 库（必须单独安装）结合使用，以便在程序意外失败时接收电子邮件或发送许多其他类型的通知。
```python
import notifiers

params = {
    "username": "you@gmail.com",
    "password": "abc123",
    "to": "dest@gmail.com"
}

# Send a single notification
notifier = notifiers.get_notifier("gmail")
notifier.notify(message="The application is running!", **params)

# Be alerted on each error message
from notifiers.logging import NotificationHandler

handler = NotificationHandler("gmail", defaults=params)
logger.add(handler, level="ERROR")
```




## 参考链接：
- [loguru](https://github.com/Delgan/loguru)