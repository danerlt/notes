# 常用的Pip源速度测试



常用的 Pip 私有源:

```
# 清华大学pip源
https://pypi.tuna.tsinghua.edu.cn/simple/

# 阿里云pip源
https://mirrors.aliyun.com/pypi/simple/

# 腾讯云pip源
https://mirrors.cloud.tencent.com/pypi/simple/

# 豆瓣(douban) 
https://pypi.douban.com/simple/

# 中国科技大学 
https://pypi.mirrors.ustc.edu.cn/simple/
```



以 `Tensorflow` 为例，测试各个源的速度。Python 版本为 `3.6.8`, Pip 版本为: `21.3.1`



总结: 下载速度, 清华大学源 =中国科技大学>豆瓣>腾讯云 > 阿里云 ,但是清华大学源和中国科技大学的源不能成功安装, 最稳的办法还是使用豆瓣源.

具体测试如下:

### 清华大学源: 

测试命令

```bash
time pip3 download --no-cache-dir Tensorflow -i https://pypi.tuna.tsinghua.edu.cn/simple/ -d /tmp/tuna
```

测试结果: 执行用时 18秒, 但是安装失败了, 再快也没有用.

![image-20230413175425852](images/常用的Pip源速度测试/image-20230413175425852.png)

### 阿里云:

测试命令

```bash
time pip3 download --no-cache-dir Tensorflow -i https://mirrors.aliyun.com/pypi/simple/ -d /tmp/aliyun
```

测试结果:    执行用时 4分25秒

![image-20230413181032295](images/常用的Pip源速度测试/image-20230413181032295.png)



### 腾讯云: 

测试命令:

```bash
time pip3 download --no-cache-dir Tensorflow -i https://mirrors.cloud.tencent.com/pypi/simple/ -d /tmp/tencent
```

测试结果:  执行用时 1分28秒

![image-20230413175322732](images/常用的Pip源速度测试/image-20230413175322732.png)

### 豆瓣云

测试命令

```bash
time pip3 download --no-cache-dir Tensorflow -i https://pypi.douban.com/simple/ -d /tmp/douban
```

测试结果:  执行用时 32秒

![image-20230413180223263](images/常用的Pip源速度测试/image-20230413180223263.png)

### 中国科技大学

测试命令

```bash
time pip3 download --no-cache-dir Tensorflow -i https://pypi.mirrors.ustc.edu.cn/simple/ -d /tmp/ustc
```

测试结果: 执行用时20秒,但是也安装失败了

![image-20230413180348261](images/常用的Pip源速度测试/image-20230413180348261.png)