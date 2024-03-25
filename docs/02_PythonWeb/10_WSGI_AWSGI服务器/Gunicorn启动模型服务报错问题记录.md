# Gunicorn启动模型服务报错问题记录


## 问题描述
我有一个Web服务，其中使用SentenceTransformmer库加载模型，然后使用Flask Web框架来提供RESTful接口。

在使用Gunicorn 启动Flask Web 服务端的时候，报错`RuntimeError: Cannot re-initialize CUDA in forked subprocess. To use CUDA with multiprocessing, you must use the 'spawn' start method`

其中`main.py`内容如下：
```python
from sentence_transformers import SentenceTransformer
from flask import Flask, request, jsonify
import torch
from pathlib import Path

app = Flask(__name__)

def infer_torch_device():
    has_cuda = torch.cuda.is_available()
    if has_cuda:
        return "cuda"
    return "cpu"

current_path = Path(__file__).parent

model_name = "m3e-base"

model_path = "/data/models/m3e-base"

device = infer_torch_device()

m3e = SentenceTransformer(model_path, device=device)

@app.route('/embed', methods=['POST'])
def embed():
    data = request.get_json()
    query_list = data.get("input", None)
    embeddings = m3e.encode(query_list)
    data = []
    for i, emb in enumerate(embeddings):
        item = {
            "object": "embedding",
            "embedding": emb.astype(float).tolist(),
            "index": i
        }
        data.append(item)
    result = {
        'object': "list",
        "data": data,
        "model": model_name,
        "usage": {
            "prompt_tokens": 11,
            "total_tokens": 11
        }
    }
    return jsonify(result)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)

```

启动的命令如下：

```bash
# -w 4 表示启动4个工作进程
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```

在在调用 `embed` 接口的时候会报错`RuntimeError: Cannot re-initialize CUDA in forked subprocess. To use CUDA with multiprocessing, you must use the 'spawn' start method`。

## 解决办法


在使用Gunicorn的启动Web服务的时候，Gunicorn 默认会使用 `fork` 的方式创建进程。
解决办法：

- 使用uvicorn框架和fastapi框架启动，启动的时候可以制定多个进程，如果指定多个进程，GPU上会加载多次模型。参数格式如：`uvicorn main:app --host 0.0.0.0 --port 5000 --loop uvloop --workers 4`。
- 或者使用Gunicorn框架启动的时候指定只启动一个进程，Gunicorn启动多个进程还是会出现上面的错误，只能指定一个进程。参数格式如：`gunicorn -w 1 -b 0.0.0.0:5000 main:app`。
- 使用uwsgi框架启动，在指定了只启动一个进程，并且不能加上`--master参数`。uwsgi框架指定`--master` 参数也会出现上面的错误，指定多个进程也会出现上面的错误。参数格式如：`uwsgi --http 0.0.0.0:5000 -p 1 -w main:app --enable-threads`。

## 问题分析记录

使用`Gunicorn`框架启动的时候，执行`gunicorn`命令会执行`gunicorn`目录下的`__main__.py`,代码如下：
```python
# -*- coding: utf-8 -
#
# This file is part of gunicorn released under the MIT license.
# See the NOTICE for more information.

from gunicorn.app.wsgiapp import run

if __name__ == "__main__":
    # see config.py - argparse defaults to basename(argv[0]) == "__main__.py"
    # todo: let runpy.run_module take care of argv[0] rewriting
    run(prog="gunicorn")
```
这里面会调用`wsgiapp`模块的的run方法，代码如下：
```python
def run(prog=None):
    """\
    The ``gunicorn`` command line runner for launching Gunicorn with
    generic WSGI applications.
    """
    from gunicorn.app.wsgiapp import WSGIApplication
    WSGIApplication("%(prog)s [OPTIONS] [APP_MODULE]", prog=prog).run()

```

其中`WSGIApplication`继承自`Application`, `WSGIApplication`代码如下：

```python
class WSGIApplication(Application):
            return self.load_wsgiapp()

```

`WSGIApplication`类没有定义`run`方法，所有会继承父类的`run`方法，父类(Application) 的`run`方法定义如下：

```python

class Application(BaseApplication):

    def run(self):
        super().run()
```

这个里面会调用父类`BaseApplication`的`run`方法。

`BaseApplication`的`run`方法定义如下：

```python
class BaseApplication(object):


    def run(self):
        try:
            Arbiter(self).run()
        except RuntimeError as e:
            print("\nError: %s\n" % e, file=sys.stderr)
            sys.stderr.flush()
            sys.exit(1)

```

这个里面会实例化`Arbiter`类，然后调用其的`run`方法。

类`Arbiter`的定义在`gunicorn/arbiter.py`中，其`run`代码如下：

```python
class Arbiter(object):
    def run(self):
        "Main master loop."
        self.start()
        util._setproctitle("master [%s]" % self.proc_name)

        try:
            self.manage_workers()

            while True:
                self.maybe_promote_master()

                sig = self.SIG_QUEUE.pop(0) if self.SIG_QUEUE else None
                if sig is None:
                    self.sleep()
                    self.murder_workers()
                    self.manage_workers()
                    continue

                if sig not in self.SIG_NAMES:
                    self.log.info("Ignoring unknown signal: %s", sig)
                    continue

                signame = self.SIG_NAMES.get(sig)
                handler = getattr(self, "handle_%s" % signame, None)
                if not handler:
                    self.log.error("Unhandled signal: %s", signame)
                    continue
                self.log.info("Handling signal: %s", signame)
                handler()
                self.wakeup()
        except (StopIteration, KeyboardInterrupt):
            self.halt()
        except HaltServer as inst:
            self.halt(reason=inst.reason, exit_status=inst.exit_status)
        except SystemExit:
            raise
        except Exception:
            self.log.error("Unhandled exception in main loop",
                           exc_info=True)
            self.stop(False)
            if self.pidfile is not None:
                self.pidfile.unlink()
            sys.exit(-1)
```

其中的`manager_workers`方法用来管理work，代码定义如下：

```python

    def manage_workers(self):
        """\
        Maintain the number of workers by spawning or killing
        as required.
        """
        if len(self.WORKERS) < self.num_workers:
            self.spawn_workers()

        workers = self.WORKERS.items()
        workers = sorted(workers, key=lambda w: w[1].age)
        while len(workers) > self.num_workers:
            (pid, _) = workers.pop(0)
            self.kill_worker(pid, signal.SIGTERM)

        active_worker_count = len(workers)
        if self._last_logged_active_worker_count != active_worker_count:
            self._last_logged_active_worker_count = active_worker_count
            self.log.debug("{0} workers".format(active_worker_count),
                           extra={"metric": "gunicorn.workers",
                                  "value": active_worker_count,
                                  "mtype": "gauge"})
```

其中会调用`spawn_workers`来创建`works`，`spawn_workers`代码如下：

```python
    def spawn_workers(self):
        """\
        Spawn new workers as needed.

        This is where a worker process leaves the main loop
        of the master process.
        """

        for _ in range(self.num_workers - len(self.WORKERS)):
            self.spawn_worker()
            time.sleep(0.1 * random.random())
```

其中会调用`spawn_worker`方法来创建`worker`，`spawn_worker`代码如下：

```python
    def spawn_worker(self):
        self.worker_age += 1
        worker = self.worker_class(self.worker_age, self.pid, self.LISTENERS,
                                   self.app, self.timeout / 2.0,
                                   self.cfg, self.log)
        self.cfg.pre_fork(self, worker)
        pid = os.fork()
        if pid != 0:
            worker.pid = pid
            self.WORKERS[pid] = worker
            return pid

        # Do not inherit the temporary files of other workers
        for sibling in self.WORKERS.values():
            sibling.tmp.close()

        # Process Child
        worker.pid = os.getpid()
        try:
            util._setproctitle("worker [%s]" % self.proc_name)
            self.log.info("Booting worker with pid: %s", worker.pid)
            self.cfg.post_fork(self, worker)
            worker.init_process()
            sys.exit(0)
        except SystemExit:
            raise
        except AppImportError as e:
            self.log.debug("Exception while loading the application",
                           exc_info=True)
            print("%s" % e, file=sys.stderr)
            sys.stderr.flush()
            sys.exit(self.APP_LOAD_ERROR)
        except Exception:
            self.log.exception("Exception in worker process")
            if not worker.booted:
                sys.exit(self.WORKER_BOOT_ERROR)
            sys.exit(-1)
        finally:
            self.log.info("Worker exiting (pid: %s)", worker.pid)
            try:
                worker.tmp.close()
                self.cfg.worker_exit(self, worker)
            except Exception:
                self.log.warning("Exception during worker exit:\n%s",
                                 traceback.format_exc())
```

首先会根据`worker_class`来实例化`worker`，然后调用`cfg.pre_fork`方法，接着调用`os.fork`方法来创建`worker`，然后调用`cfg.post_fork`方法，最后调用`worker.init_process`方法来初始化`worker`。

调用os模块中的fork方法后会生成一个子进程，子进程会复制父进程的数据信息，而后程序就分两个进程继续运行后面的程序，在子进程内，这个方法会返回0；在父进程内，这个方法会返回子进程的编号PID。

所以下面的if语句会在父进程中执行：
```python
        if pid != 0:
            worker.pid = pid
            self.WORKERS[pid] = worker
            return pid
```

而在子进程中会执行：
```python
 # Do not inherit the temporary files of other workers
        for sibling in self.WORKERS.values():
            sibling.tmp.close()

        # Process Child
        worker.pid = os.getpid()
        try:
            util._setproctitle("worker [%s]" % self.proc_name)
            self.log.info("Booting worker with pid: %s", worker.pid)
            self.cfg.post_fork(self, worker)
            worker.init_process()
            sys.exit(0)
        except SystemExit:
            raise
        except AppImportError as e:
            self.log.debug("Exception while loading the application",
                           exc_info=True)
            print("%s" % e, file=sys.stderr)
            sys.stderr.flush()
            sys.exit(self.APP_LOAD_ERROR)
        except Exception:
            self.log.exception("Exception in worker process")
            if not worker.booted:
                sys.exit(self.WORKER_BOOT_ERROR)
            sys.exit(-1)
        finally:
            self.log.info("Worker exiting (pid: %s)", worker.pid)
            try:
                worker.tmp.close()
                self.cfg.worker_exit(self, worker)
            except Exception:
                self.log.warning("Exception during worker exit:\n%s",
                                 traceback.format_exc())
```

导致报错`RuntimeError: Cannot re-initialize CUDA in forked subprocess. To use CUDA with multiprocessing, you must use the 'spawn' start method`的问题就出在这个`os.fork`这里。

那为啥`uvicorn`可以呢?

执行`uvicorn`的时候，同样也会调用`uvicorn`包下面的`__main__.py`，内容如下：
```python
import uvicorn

if __name__ == "__main__":
    uvicorn.main()
```
其中会调用`uvicorn.main`模块的`main`方法，代码如下：

其`main`方法定义如下:
```python
# 省略参数定义
def main(
    app: str,
    host: str,
    port: int,
    uds: str,
    fd: int,
    loop: LoopSetupType,
    http: HTTPProtocolType,
    ws: WSProtocolType,
    ws_max_size: int,
    ws_max_queue: int,
    ws_ping_interval: float,
    ws_ping_timeout: float,
    ws_per_message_deflate: bool,
    lifespan: LifespanType,
    interface: InterfaceType,
    reload: bool,
    reload_dirs: list[str],
    reload_includes: list[str],
    reload_excludes: list[str],
    reload_delay: float,
    workers: int,
    env_file: str,
    log_config: str,
    log_level: str,
    access_log: bool,
    proxy_headers: bool,
    server_header: bool,
    date_header: bool,
    forwarded_allow_ips: str,
    root_path: str,
    limit_concurrency: int,
    backlog: int,
    limit_max_requests: int,
    timeout_keep_alive: int,
    timeout_graceful_shutdown: int | None,
    ssl_keyfile: str,
    ssl_certfile: str,
    ssl_keyfile_password: str,
    ssl_version: int,
    ssl_cert_reqs: int,
    ssl_ca_certs: str,
    ssl_ciphers: str,
    headers: list[str],
    use_colors: bool,
    app_dir: str,
    h11_max_incomplete_event_size: int | None,
    factory: bool,
) -> None:
    run(
        app,
        host=host,
        port=port,
        uds=uds,
        fd=fd,
        loop=loop,
        http=http,
        ws=ws,
        ws_max_size=ws_max_size,
        ws_max_queue=ws_max_queue,
        ws_ping_interval=ws_ping_interval,
        ws_ping_timeout=ws_ping_timeout,
        ws_per_message_deflate=ws_per_message_deflate,
        lifespan=lifespan,
        env_file=env_file,
        log_config=LOGGING_CONFIG if log_config is None else log_config,
        log_level=log_level,
        access_log=access_log,
        interface=interface,
        reload=reload,
        reload_dirs=reload_dirs or None,
        reload_includes=reload_includes or None,
        reload_excludes=reload_excludes or None,
        reload_delay=reload_delay,
        workers=workers,
        proxy_headers=proxy_headers,
        server_header=server_header,
        date_header=date_header,
        forwarded_allow_ips=forwarded_allow_ips,
        root_path=root_path,
        limit_concurrency=limit_concurrency,
        backlog=backlog,
        limit_max_requests=limit_max_requests,
        timeout_keep_alive=timeout_keep_alive,
        timeout_graceful_shutdown=timeout_graceful_shutdown,
        ssl_keyfile=ssl_keyfile,
        ssl_certfile=ssl_certfile,
        ssl_keyfile_password=ssl_keyfile_password,
        ssl_version=ssl_version,
        ssl_cert_reqs=ssl_cert_reqs,
        ssl_ca_certs=ssl_ca_certs,
        ssl_ciphers=ssl_ciphers,
        headers=[header.split(":", 1) for header in headers],  # type: ignore[misc]
        use_colors=use_colors,
        factory=factory,
        app_dir=app_dir,
        h11_max_incomplete_event_size=h11_max_incomplete_event_size,
    )
```

其中会调用`run`方法，`run`方法定义如下：

```python
def run(
    app: ASGIApplication | Callable[..., Any] | str,
    *,
    host: str = "127.0.0.1",
    port: int = 8000,
    uds: str | None = None,
    fd: int | None = None,
    loop: LoopSetupType = "auto",
    http: type[asyncio.Protocol] | HTTPProtocolType = "auto",
    ws: type[asyncio.Protocol] | WSProtocolType = "auto",
    ws_max_size: int = 16777216,
    ws_max_queue: int = 32,
    ws_ping_interval: float | None = 20.0,
    ws_ping_timeout: float | None = 20.0,
    ws_per_message_deflate: bool = True,
    lifespan: LifespanType = "auto",
    interface: InterfaceType = "auto",
    reload: bool = False,
    reload_dirs: list[str] | str | None = None,
    reload_includes: list[str] | str | None = None,
    reload_excludes: list[str] | str | None = None,
    reload_delay: float = 0.25,
    workers: int | None = None,
    env_file: str | os.PathLike[str] | None = None,
    log_config: dict[str, Any] | str | None = LOGGING_CONFIG,
    log_level: str | int | None = None,
    access_log: bool = True,
    proxy_headers: bool = True,
    server_header: bool = True,
    date_header: bool = True,
    forwarded_allow_ips: list[str] | str | None = None,
    root_path: str = "",
    limit_concurrency: int | None = None,
    backlog: int = 2048,
    limit_max_requests: int | None = None,
    timeout_keep_alive: int = 5,
    timeout_graceful_shutdown: int | None = None,
    ssl_keyfile: str | None = None,
    ssl_certfile: str | os.PathLike[str] | None = None,
    ssl_keyfile_password: str | None = None,
    ssl_version: int = SSL_PROTOCOL_VERSION,
    ssl_cert_reqs: int = ssl.CERT_NONE,
    ssl_ca_certs: str | None = None,
    ssl_ciphers: str = "TLSv1",
    headers: list[tuple[str, str]] | None = None,
    use_colors: bool | None = None,
    app_dir: str | None = None,
    factory: bool = False,
    h11_max_incomplete_event_size: int | None = None,
) -> None:
    if app_dir is not None:
        sys.path.insert(0, app_dir)

    config = Config(
        app,
        host=host,
        port=port,
        uds=uds,
        fd=fd,
        loop=loop,
        http=http,
        ws=ws,
        ws_max_size=ws_max_size,
        ws_max_queue=ws_max_queue,
        ws_ping_interval=ws_ping_interval,
        ws_ping_timeout=ws_ping_timeout,
        ws_per_message_deflate=ws_per_message_deflate,
        lifespan=lifespan,
        interface=interface,
        reload=reload,
        reload_dirs=reload_dirs,
        reload_includes=reload_includes,
        reload_excludes=reload_excludes,
        reload_delay=reload_delay,
        workers=workers,
        env_file=env_file,
        log_config=log_config,
        log_level=log_level,
        access_log=access_log,
        proxy_headers=proxy_headers,
        server_header=server_header,
        date_header=date_header,
        forwarded_allow_ips=forwarded_allow_ips,
        root_path=root_path,
        limit_concurrency=limit_concurrency,
        backlog=backlog,
        limit_max_requests=limit_max_requests,
        timeout_keep_alive=timeout_keep_alive,
        timeout_graceful_shutdown=timeout_graceful_shutdown,
        ssl_keyfile=ssl_keyfile,
        ssl_certfile=ssl_certfile,
        ssl_keyfile_password=ssl_keyfile_password,
        ssl_version=ssl_version,
        ssl_cert_reqs=ssl_cert_reqs,
        ssl_ca_certs=ssl_ca_certs,
        ssl_ciphers=ssl_ciphers,
        headers=headers,
        use_colors=use_colors,
        factory=factory,
        h11_max_incomplete_event_size=h11_max_incomplete_event_size,
    )
    server = Server(config=config)

    if (config.reload or config.workers > 1) and not isinstance(app, str):
        logger = logging.getLogger("uvicorn.error")
        logger.warning("You must pass the application as an import string to enable 'reload' or " "'workers'.")
        sys.exit(1)

    if config.should_reload:
        sock = config.bind_socket()
        ChangeReload(config, target=server.run, sockets=[sock]).run()
    elif config.workers > 1:
        sock = config.bind_socket()
        Multiprocess(config, target=server.run, sockets=[sock]).run()
    else:
        server.run()
    if config.uds and os.path.exists(config.uds):
        os.remove(config.uds)  # pragma: py-win32

    if not server.started and not config.should_reload and config.workers == 1:
        sys.exit(STARTUP_FAILURE)
```

该函数通过解析参数创建一个配置对象，然后根据配置创建一个服务器实例，并最终运行该服务器。根据配置的不同，服务器可以以单进程、多进程或热加载的方式运行。

当`workers`大于 `1` 时，会`Multiprocess(config, target=server.run, sockets=[sock]).run()` 创建多进程执行`server.run`。

`Multiprocess`类定义在`uvicorn.supervisors.multiprocess.py`文件中。

```python
class Multiprocess:
    def __init__(
        self,
        config: Config,
        target: Callable[[list[socket] | None], None],
        sockets: list[socket],
    ) -> None:
        self.config = config
        self.target = target
        self.sockets = sockets
        self.processes: list[SpawnProcess] = []
        self.should_exit = threading.Event()
        self.pid = os.getpid()

    def signal_handler(self, sig: int, frame: FrameType | None) -> None:
        """
        A signal handler that is registered with the parent process.
        """
        self.should_exit.set()

    def run(self) -> None:
        self.startup()
        self.should_exit.wait()
        self.shutdown()

    def startup(self) -> None:
        message = f"Started parent process [{str(self.pid)}]"
        color_message = "Started parent process [{}]".format(click.style(str(self.pid), fg="cyan", bold=True))
        logger.info(message, extra={"color_message": color_message})

        for sig in HANDLED_SIGNALS:
            signal.signal(sig, self.signal_handler)

        for _idx in range(self.config.workers):
            process = get_subprocess(config=self.config, target=self.target, sockets=self.sockets)
            process.start()
            self.processes.append(process)

    def shutdown(self) -> None:
        for process in self.processes:
            process.terminate()
            process.join()

        message = f"Stopping parent process [{str(self.pid)}]"
        color_message = "Stopping parent process [{}]".format(click.style(str(self.pid), fg="cyan", bold=True))
        logger.info(message, extra={"color_message": color_message})
```

其`run`方法会调用`startup`方法，`startup`方法调用`get_subprocess`方法获取子进程，然后调用`start`方法启动子进程。

`get_subprocess`方法定义在`uvicorn._subprocess·py`中：

```python

import multiprocessing
from multiprocessing.context import SpawnProcess

multiprocessing.allow_connection_pickling()
spawn = multiprocessing.get_context("spawn")


def get_subprocess(
    config: Config,
    target: Callable[..., None],
    sockets: list[socket],
) -> SpawnProcess:
    """
    Called in the parent process, to instantiate a new child process instance.
    The child is not yet started at this point.

    * config - The Uvicorn configuration instance.
    * target - A callable that accepts a list of sockets. In practice this will
               be the `Server.run()` method.
    * sockets - A list of sockets to pass to the server. Sockets are bound once
                by the parent process, and then passed to the child processes.
    """
    # We pass across the stdin fileno, and reopen it in the child process.
    # This is required for some debugging environments.
    try:
        stdin_fileno = sys.stdin.fileno()
    # The `sys.stdin` can be `None`, see https://docs.python.org/3/library/sys.html#sys.__stdin__.
    except (AttributeError, OSError):
        stdin_fileno = None

    kwargs = {
        "config": config,
        "target": target,
        "sockets": sockets,
        "stdin_fileno": stdin_fileno,
    }

    return spawn.Process(target=subprocess_started, kwargs=kwargs)
```

它使用了`Python`的`multiprocessing`库的`get_context`方法，该方法的功能是返回一个具有 `multiprocessing` 模块相同的属性的上下文对象，启动方式为`spawn`。

据平台的不同， `multiprocessing` 支持三种启动进程的方式。这些启动方法是

- spawn : 父进程启动一个新的Python解释器进程。子进程只会继承运行进程对象的 run() 方法所需资源。可在 POSIX 和 Windows 平台上使用。 Windows 和 macOS 上的默认设置。
- fork: 父进程使用 os.fork() 来派生 Python 解释器。子进程在启动时实际上与父进程相同。父进程的所有资源都被子进程继承。可用于 POSIX 系统。当前 POSIX 上的默认值（macOS 除外）。
- forkserver: 当程序启动并选择 forkserver 启动方法时，会产生一个 server 进程。从那时起，无论何时需要一个新进程，父进程都会连接到 server 进程 并请求其 fork 一个新进程。

具体说明可查看：[multiprocess Contexts and start methods](https://docs.python.org/3/library/multiprocessing.html#multiprocessing-start-methods)

所以通过`uvicorn`框架启动的子进程是使用`spawn`方式启动的，不会出现`RuntimeError: Cannot re-initialize CUDA in forked subprocess. To use CUDA with multiprocessing, you must use the 'spawn' start method`这个错误。
