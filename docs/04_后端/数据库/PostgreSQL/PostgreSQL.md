# PostgreSQL

## psql 用法

```bash
以下是对给定参数说明的翻译:


Copy code
psql是PostgreSQL的交互式终端。

用法:
  psql [选项]... [数据库名称 [用户名]]

一般选项:
  -c, --command=命令    只运行单个命令(SQL或内部命令)然后退出
  -d, --dbname=数据库名称      要连接的数据库名称(默认:"root")
  -f, --file=文件名      执行文件中的命令,然后退出
  -l, --list               列出可用的数据库,然后退出
  -v, --set=, --variable=名称=值
                           设置psql变量名称为值
                           (例如,-v ON_ERROR_STOP=1)
  -V, --version            输出版本信息,然后退出
  -X, --no-psqlrc          不读取启动文件(~/.psqlrc)
  -1 ("one"), --single-transaction
                           作为单个事务执行(如果是非交互式)
  -?, --help[=options]     显示此帮助信息,然后退出
      --help=commands      列出反斜杠命令,然后退出
      --help=variables     列出特殊变量,然后退出

输入和输出选项:
  -a, --echo-all           回显所有从脚本输入的内容
  -b, --echo-errors        回显失败的命令
  -e, --echo-queries       回显发送到服务器的命令
  -E, --echo-hidden        显示内部命令生成的查询
  -L, --log-file=文件名  将会话日志发送到文件
  -n, --no-readline        禁用增强的命令行编辑(readline)
  -o, --output=文件名    将查询结果发送到文件(或|管道)
  -q, --quiet              安静运行(没有消息,只有查询输出)
  -s, --single-step        单步模式(确认每个查询)
  -S, --single-line        单行模式(行尾终止SQL命令)

输出格式选项:
  -A, --no-align           非对齐表输出模式
      --csv                CSV(逗号分隔值)表输出模式
  -F, --field-separator=字符串
                           非对齐输出的字段分隔符(默认:"|")
  -H, --html               HTML表输出模式
  -P, --pset=VAR[=ARG]     设置打印选项VAR为ARG(参见\pset命令)
  -R, --record-separator=字符串
                           非对齐输出的记录分隔符(默认:新行)
  -t, --tuples-only        只打印行
  -T, --table-attr=TEXT    设置HTML表标签属性(例如,width,border)
  -x, --expanded           打开扩展表输出
  -z, --field-separator-zero
                           将非对齐输出的字段分隔符设置为零字节
  -0, --record-separator-zero
                           将非对齐输出的记录分隔符设置为零字节

连接选项:
  -h, --host=主机名      数据库服务器主机或套接字目录(默认:"本地套接字")
  -p, --port=端口          数据库服务器端口(默认:"5432")
  -U, --username=用户名  数据库用户名(默认:"root")
  -w, --no-password        永远不提示输入密码
  -W, --password           强制要求输入密码(应该自动发生)

欲了解更多信息,请在psql内键入"\?"(查看内部命令)或"\help"(查看SQL命令),或参考PostgreSQL文档中的psql部分。

报告错误至<pgsql-bugs@lists.postgresql.org>。
PostgreSQL主页:<https://www.postgresql.org/>
```

连接PostgreSQL数据库命令示例，postgresql在用命令行登录时，无论参数输入-W还是-w都不能避免提示输入密码，可以通过设置环境变量来设置登录密码：
```bash
PGPASSWORD=your_password
psql -h localhost -p 5432 -U root -d postgres
```

PGPASSWORD=GeegaAI123
psql -h 10.113.75.134 -p 35432 -U postgres -d postgres


查看数据库列表命令：
```
\l
```
![](https://danerlt-1258802437.cos.ap-chongqing.myqcloud.com/2024-04-02-0yDOFw.png)

创建数据库命令：
```sql
CREATE DATABASE 数据库名称 WITH OWNER = 用户名 ENCODING = 'UTF8
```

选择数据库命令，  `\c 数据库名称`

删除数据库命令：
```sql
DROP DATABASE 数据库名称;
# dropdb 用于删除 PostgreSQL 数据库。
# dropdb 命令只能由超级管理员或数据库拥有者执行。
# 示例如下：
dropdb  -h localhost -p 5432 -U root  数据库名称
```