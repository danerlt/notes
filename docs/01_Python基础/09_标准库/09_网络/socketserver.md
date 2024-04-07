# socketserver模块

## 介绍

socketserver 模块简化了编写网络服务器的任务。

该模块具有四个基础实体服务器类:

- class socketserver.TCPServer(server_address, RequestHandlerClass, bind_and_activate=True)
该类使用互联网 TCP 协议，它可以提供客户端与服务器之间的连续数据流。 如果 bind_and_activate 为真值，该类的构造器会自动尝试发起调用 server_bind() 和 server_activate()。 其他形参会被传递给 BaseServer 基类。

- class socketserver.UDPServer(server_address, RequestHandlerClass, bind_and_activate=True)
该类使用数据包，即一系列离散的信息分包，它们可能会无序地到达或在传输中丢失。 该类的形参与 TCPServer 的相同。

- class socketserver.UnixStreamServer(server_address, RequestHandlerClass, bind_and_activate=True)
- class socketserver.UnixDatagramServer(server_address, RequestHandlerClass, bind_and_activate=True)
这两个更常用的类与 TCP 和 UDP 类相似，但使用 Unix 域套接字；它们在非 Unix 系统平台上不可用。 它们的形参与 TCPServer 的相同。

这四个类会 同步地 处理请求；每个请求必须完成才能开始下一个请求。 这就不适用于每个请求要耗费很长时间来完成的情况，或者因为它需要大量的计算，又或者它返回了大量的数据而客户端处理起来很缓慢。 解决方案是创建单独的进程或线程来处理每个请求；ForkingMixIn 和 ThreadingMixIn 混合类可以被用于支持异步行为。

创建一个服务器需要分几个步骤进行。 首先，你必须通过子类化 BaseRequestHandler 类并重载其 handle() 方法来创建一个请求处理句柄类；这个方法将处理传入的请求。 其次，你必须实例化某个服务器类，将服务器地址和请求处理句柄类传给它。 建议在 with 语句中使用该服务器。 然后再调用服务器对象的 handle_request() 或 serve_forever() 方法来处理一个或多个请求。 最后，调用 server_close() 来关闭套接字（除非你使用了 with 语句）。

当从 ThreadingMixIn 继承线程连接行为时，你应当显式地声明你希望在突然关机时你的线程采取何种行为。 ThreadingMixIn 类定义了一个属性 daemon_threads，它指明服务器是否应当等待线程终止。 如果你希望线程能自主行动你应当显式地设置这个旗标；默认值为 False，表示 Python 将不会在 ThreadingMixIn 所创建的所有线程都退出之前退出。

服务器类具有同样的外部方法和属性，无论它们使用哪种网络协议。

## TCPServer样例

见代码 [https://github.com/danerlt/memo/tree/main/python/network-demo](https://github.com/danerlt/memo/tree/main/python/network-demo)


## 参考链接


[socketserver --- 用于网络服务器的框架](https:docs.python.org/zh-cn/3/library/socketserver.html)        :param server: 服务端
        :param result_queue: 结果队列 
        """
        self.request = request
        self.client_address = client_address
        self.server = server
        self.result_queue = result_queue

        log.info(f"连接到客户端: {self.client_address}")
        self.setup()
        try:
            self.handle()
        finally:
            self.finish()

    def setup(self):
        pass

    def handle(self):
        log.info("handle 处理")
        # 这里必须阻塞 否则会导致handle_request线程还没启动就执行了shutdown_request将request关闭了。
        self.handle_request()

    def finish(self):
        pass

    def handle_request(self):
        while True:
            try:
                # 开始接受数据
                data = self.request.recv(1024)
                if not data:
                    continue
                log.info(f"服务端收到数据: {data}")
                log.info(f"服务端收到数据: type(data): {type(data)}")
                self.result_queue.put(data)
            except OSError:
                trace_log.info("客户端断开连接")
                break
            except Exception as e:
                trace_log.error(f"服务端接收数据异常: {e}")
                break



class MyTcpServer(socketserver.ThreadingTCPServer):

    def __init__(self, server_address, RequestHandlerClass, result_queue=None):
        super().__init__(server_address, RequestHandlerClass)
        self.result_queue = result_queue

    def finish_request(self, request, client_address):
        """Finish one request by instantiating RequestHandlerClass."""
        self.RequestHandlerClass(request, client_address, self, result_queue=self.result_queue)


def main():
 HOST, PORT = "localhost", 9999

    queue = Queue()
    # Create the server, binding to localhost on port 9999
    with MyTcpServer((HOST, PORT), MyRequestHandler) as server:
        # Activate the server; this will keep running until you
        # interrupt the program with Ctrl-C
        server.serve_forever()

        
if __name__ == "__main__":
    main()
   
```

## 参考链接

[socketserver --- 用于网络服务器的框架](https://docs.python.org/zh-cn/3/library/socketserver.html)
    # Create the server, binding to localhost on port 9999
    with MyTcpServer((HOST, PORT), MyRequestHandler) as server:
        # Activate the server; this will keep running until you
        # interrupt the program with Ctrl-C
        server.serve_forever()
```

## 参考链接

[socketserver --- 用于网络服务器的框架](https://docs.python.org/zh-cn/3/library/socketserver.html)
