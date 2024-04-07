# Docker 命令说明
```bash
docker --help

用法:  docker [选项] 命令

Docker 是一个自给自足的容器运行时

常用命令:
  run         从镜像创建并运行新容器
  exec        在正在运行的容器中执行命令
  ps          列出容器  
  build       从Dockerfile创建镜像
  pull        从仓库下载镜像
  push        上传镜像到仓库
  images      列出镜像
  login       登录到仓库
  logout      从仓库登出
  search      在Docker Hub中搜索镜像
  version     显示Docker版本信息
  info        显示系统范围的信息

管理命令:
  builder     管理构建
  buildx*     Docker Buildx (Docker Inc., v0.10.4)
  compose*    Docker Compose (Docker Inc., v2.17.2)
  container   管理容器
  context     管理上下文
  image       管理镜像
  manifest    管理Docker镜像清单和清单列表
  network     管理网络
  plugin      管理插件
  system      管理Docker
  trust       管理对Docker镜像的信任
  volume      管理卷

集群命令:
  swarm       管理集群

命令:
  attach      将本地标准输入、输出和错误流附加到运行中的容器
  commit      基于容器的更改创建新镜像
  cp          在容器和本地文件系统之间复制文件/文件夹
  create      创建新容器
  diff        检查容器文件系统上文件或目录的更改
  events      从服务器获取实时事件
  export      导出容器的文件系统为tar存档,和import命令组合使用
  history     显示镜像的历史记录
  import      从tar包导入内容以创建文件系统镜像,和export命令组合使用
  inspect     返回Docker对象的低级别信息
  kill        杀死一个或多个运行中的容器
  load        从tar存档或STDIN加载镜像,和save命令组合使用
  logs        获取容器的日志
  pause       暂停一个或多个容器中的所有进程
  port        列出端口映射或容器的特定映射
  rename      重命名容器
  restart     重启一个或多个容器
  rm          删除一个或多个容器
  rmi         删除一个或多个镜像
  save        将一个或多个镜像保存到tar存档(默认情况下传输到STDOUT),和load命令组合使用
  start       启动一个或多个已停止的容器
  stats       显示容器资源使用统计的实时流
  stop        停止一个或多个运行中的容器
  tag         创建tag
  top         显示容器中运行的进程
  unpause     在一个或多个容器中恢复所有进程
  update      更新一个或多个容器的配置
  wait        阻塞直到一个或多个容器停止,然后打印它们的退出代码  

全局选项:
      --config string      客户端配置文件的位置 (默认值 "/root/.docker")
  -c, --context string     用于连接到守护程序的上下文名称(覆盖DOCKER_HOST环境变量和使用"docker context use"设置的默认上下文)
  -D, --debug              启用调试模式
  -H, --host list          要连接的守护程序套接字
  -l, --log-level string   设置日志级别("debug", "info", "warn", "error", "fatal") (默认值 "info")
      --tls                使用TLS;由--tlsverify隐含
      --tlscacert string   信任由此CA签名的证书(默认值 "/root/.docker/ca.pem")
      --tlscert string     TLS证书文件的路径(默认值 "/root/.docker/cert.pem")
      --tlskey string      TLS密钥文件的路径(默认值 "/root/.docker/key.pem")  
      --tlsverify          使用TLS并验证远程
  -v, --version            打印版本信息并退出

运行 'docker 命令 --help' 获取有关命令的更多信息。

要获取有关如何使用Docker的更多帮助,请访问 https://docs.docker.com/go/guides/

```