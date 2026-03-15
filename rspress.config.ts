import { defineConfig } from 'rspress/config';

export default defineConfig({
  root: 'docs',
  title: 'danerlt的个人笔记',
  description: 'danerlt的个人笔记',
  lang: 'zh',
  base: '/notes/',
  themeConfig: {
    nav: [
      {
        text: 'Python基础',
        activeMatch: '/01_Python基础/',
        items: [
          { text: '基础语法', link: '/01_Python基础/01_基础/' },
          { text: '进阶', link: '/01_Python基础/02_进阶/' },
          { text: '模块', link: '/01_Python基础/03_模块/' },
          { text: '面向对象', link: '/01_Python基础/04_面向对象/' },
          { text: '异步IO', link: '/01_Python基础/06_异步io/' },
          { text: '并行', link: '/01_Python基础/07_并行/' },
          { text: '测试', link: '/01_Python基础/08_测试/' },
          { text: '文件管理', link: '/01_Python基础/11_文件管理/' },
          { text: '爬虫', link: '/01_Python基础/12_爬虫/' },
          {
            text: '包管理',
            items: [
              { text: 'pip源', link: '/01_Python基础/05_包管理/pip源/' },
            ],
          },
          {
            text: '标准库',
            items: [
              { text: '文本处理', link: '/01_Python基础/09_标准库/01_文本处理/' },
              { text: '数据结构', link: '/01_Python基础/09_标准库/02_数据结构/' },
              { text: '数学', link: '/01_Python基础/09_标准库/03_数学/' },
              { text: '函数式编程', link: '/01_Python基础/09_标准库/04_函数式编程/' },
              { text: '文件和目录', link: '/01_Python基础/09_标准库/05_文件和目录/' },
              { text: '加密', link: '/01_Python基础/09_标准库/06_加密/' },
              { text: '操作系统', link: '/01_Python基础/09_标准库/07_操作系统/' },
              { text: '并发', link: '/01_Python基础/09_标准库/08_并发/' },
              { text: '网络', link: '/01_Python基础/09_标准库/09_网络/' },
              { text: '互联网数据处理', link: '/01_Python基础/09_标准库/10_互联网数据处理/' },
              { text: '开发工具', link: '/01_Python基础/09_标准库/11_开发工具/' },
              { text: '运行时服务', link: '/01_Python基础/09_标准库/12_运行时服务/' },
            ],
          },
          {
            text: '第三方库',
            items: [
              { text: '包管理', link: '/01_Python基础/10_第三方库/01_包管理/' },
              { text: '文件处理', link: '/01_Python基础/10_第三方库/02_文件处理/' },
              { text: '文档相关', link: '/01_Python基础/10_第三方库/03_文档相关/' },
              { text: '命令行工具', link: '/01_Python基础/10_第三方库/04_命令行工具/' },
              { text: '图像处理', link: '/01_Python基础/10_第三方库/05_图像处理/' },
              { text: 'HTTP', link: '/01_Python基础/10_第三方库/06_HTTP/' },
              { text: '后台任务', link: '/01_Python基础/10_第三方库/07_后台任务/' },
              { text: '日志', link: '/01_Python基础/10_第三方库/08_日志/' },
              { text: '爬虫', link: '/01_Python基础/10_第三方库/09_爬虫/' },
              { text: '测试', link: '/01_Python基础/10_第三方库/10_测试/' },
              { text: '代码分析', link: '/01_Python基础/10_第三方库/11_代码分析/' },
              { text: 'DevOps工具', link: '/01_Python基础/10_第三方库/12_DevOps工具/' },
            ],
          },
        ],
      },
      {
        text: 'PythonWeb',
        activeMatch: '/02_PythonWeb/',
        items: [
          {
            text: 'Web框架',
            items: [
              { text: 'Flask', link: '/02_PythonWeb/01_Web框架/01_Flask/' },
              { text: 'FastAPI', link: '/02_PythonWeb/01_Web框架/02_FastAPI/' },
              { text: 'Django', link: '/02_PythonWeb/01_Web框架/03_Django/' },
            ],
          },
          {
            text: '参数校验',
            items: [
              { text: 'webargs', link: '/02_PythonWeb/02_参数校验/01_webargs/' },
              { text: 'WTForms', link: '/02_PythonWeb/02_参数校验/02_WTForms/' },
            ],
          },
          {
            text: '中间件',
            items: [
              { text: 'MQ', link: '/02_PythonWeb/03_中间件/MQ/' },
              { text: '缓存', link: '/02_PythonWeb/03_中间件/缓存/' },
            ],
          },
          {
            text: '数据库',
            items: [
              { text: 'MongoDB', link: '/02_PythonWeb/04_数据库/MongoDB/' },
              { text: 'MySQL', link: '/02_PythonWeb/04_数据库/MySQL/' },
              { text: 'PostgreSQL', link: '/02_PythonWeb/04_数据库/PostgreSQL/' },
            ],
          },
          {
            text: 'ORM',
            items: [
              { text: 'SQLalchemy', link: '/02_PythonWeb/05_ORM/SQLalchemy/' },
            ],
          },
          {
            text: 'WebSocket',
            items: [
              { text: 'websockets', link: '/02_PythonWeb/06_WebSocket/websockets/' },
            ],
          },
          {
            text: 'RESTful API',
            items: [
              { text: 'django-rest-framework', link: '/02_PythonWeb/07_RESTfulAPI/django-rest-framework/' },
              { text: 'flask-restful', link: '/02_PythonWeb/07_RESTfulAPI/flask-restful/' },
            ],
          },
          {
            text: '模板',
            items: [
              { text: 'Jinja2', link: '/02_PythonWeb/08_模板/Jinja2/' },
            ],
          },
          {
            text: '国际化',
            items: [
              { text: 'babel', link: '/02_PythonWeb/09_国际化/babel/' },
            ],
          },
          { text: 'WSGI/ASGI服务器', link: '/02_PythonWeb/10_WSGI_AWSGI服务器/' },
        ],
      },
      {
        text: 'AI',
        activeMatch: '/03_AI/',
        items: [
          {
            text: '大模型',
            items: [
              { text: 'RAG', link: '/03_AI/大模型/RAG/' },
              { text: 'dify', link: '/03_AI/大模型/dify/' },
              { text: 'vllm', link: '/03_AI/大模型/vllm/' },
              { text: '提示词', link: '/03_AI/大模型/提示词/' },
            ],
          },
          {
            text: 'Python库',
            items: [
              { text: 'numpy', link: '/03_AI/python库/numpy/' },
              { text: 'pandas', link: '/03_AI/python库/pandas/' },
              { text: 'matplotlib', link: '/03_AI/python库/matplotlib/' },
            ],
          },
          { text: 'LlamaIndex', link: '/03_AI/LlamaIndex/' },
          { text: '提示词工程', link: '/03_AI/提示词工程/' },
          { text: '机器学习', link: '/03_AI/机器学习/' },
          { text: '深度学习', link: '/03_AI/深度学习/' },
          { text: '数学', link: '/03_AI/数学/' },
        ],
      },
      {
        text: '后端',
        activeMatch: '/04_后端/',
        items: [
          {
            text: '数据库',
            items: [
              { text: 'MySQL', link: '/04_后端/数据库/MySQL/' },
              { text: 'Redis', link: '/04_后端/数据库/Redis/' },
              { text: 'MongoDB', link: '/04_后端/数据库/MongoDB/' },
              { text: 'ES', link: '/04_后端/数据库/es/' },
            ],
          },
          {
            text: '中间件',
            items: [
              { text: 'MQ', link: '/04_后端/中间件/MQ/' },
              { text: 'ES', link: '/04_后端/中间件/ES/' },
            ],
          },
          {
            text: '架构',
            items: [
              { text: '分布式', link: '/04_后端/架构/分布式/' },
              { text: '架构设计', link: '/04_后端/架构/架构设计/' },
              { text: '高并发', link: '/04_后端/架构/高并发/' },
            ],
          },
          {
            text: '设计模式',
            items: [
              { text: '创建型', link: '/04_后端/设计模式/创建型/' },
            ],
          },
          { text: '开发基础', link: '/04_后端/开发基础/' },
          { text: 'Go', link: '/04_后端/Go/' },
          { text: 'Java', link: '/04_后端/Java/' },
          { text: '框架', link: '/04_后端/框架/' },
          { text: '项目管理', link: '/04_后端/项目管理/' },
        ],
      },
      {
        text: '前端',
        activeMatch: '/05_前端/',
        items: [
          { text: 'HTML', link: '/05_前端/HTML/' },
          { text: 'CSS', link: '/05_前端/CSS/' },
          { text: 'JavaScript', link: '/05_前端/JavaScript/' },
          { text: '前端框架', link: '/05_前端/前端框架/' },
        ],
      },
      {
        text: '算法',
        activeMatch: '/06_算法和数据结构/',
        items: [
          { text: '算法基础', link: '/06_算法和数据结构/算法基础/' },
          { text: '数据结构', link: '/06_算法和数据结构/数据结构/' },
          { text: '排序算法', link: '/06_算法和数据结构/排序算法/' },
          { text: '查找算法', link: '/06_算法和数据结构/查找算法/' },
          { text: '其他', link: '/06_算法和数据结构/其他/' },
        ],
      },
      {
        text: '运维',
        activeMatch: '/07_运维/',
        items: [
          {
            text: 'Linux',
            items: [
              { text: 'Linux基础', link: '/07_运维/Linux/Linux基础/' },
              { text: 'Bash基础', link: '/07_运维/Linux/Bash基础/' },
              { text: 'Linux常用命令', link: '/07_运维/Linux/Linux常用命令/' },
            ],
          },
          {
            text: 'Docker',
            items: [
              { text: 'Docker基础', link: '/07_运维/Docker/Docker基础/' },
            ],
          },
          {
            text: 'Kubernetes',
            items: [
              { text: 'Kubernetes基础', link: '/07_运维/Kubernetes/Kubernetes基础/' },
            ],
          },
          {
            text: 'CI/CD',
            items: [
              { text: 'Ansible', link: '/07_运维/CI CD/Ansible/' },
              { text: 'GitHub Action', link: '/07_运维/CI CD/Github Action/' },
              { text: 'Jenkins', link: '/07_运维/CI CD/Jenkins/' },
            ],
          },
        ],
      },
      {
        text: '常用工具',
        activeMatch: '/08_常用工具/',
        items: [
          { text: 'IDE', link: '/08_常用工具/ide/' },
          { text: '画图工具', link: '/08_常用工具/画图工具/' },
          { text: '常用网址', link: '/08_常用工具/常用网址/' },
          { text: 'Windows优化工具', link: '/08_常用工具/windows优化工具/' },
        ],
      },
      { text: '常用命令', link: '/09_常用命令/', activeMatch: '/09_常用命令/' },
      {
        text: '其他',
        activeMatch: '/10_其他/',
        items: [
          {
            text: '数据分析',
            items: [
              { text: '数据分析', link: '/10_其他/数据分析/数据分析/' },
              { text: '数据可视化', link: '/10_其他/数据分析/数据可视化/' },
              { text: '数据清洗', link: '/10_其他/数据分析/数据清洗/' },
              { text: '数据预处理', link: '/10_其他/数据分析/数据预处理/' },
            ],
          },
          {
            text: '爬虫相关',
            items: [
              { text: 'requests', link: '/10_其他/爬虫相关/requests/' },
              { text: 'beautifulsoup', link: '/10_其他/爬虫相关/beautifulsoup/' },
              { text: 'scrapy', link: '/10_其他/爬虫相关/scrapy/' },
              { text: 'selenium', link: '/10_其他/爬虫相关/selenium/' },
              { text: 'xpath', link: '/10_其他/爬虫相关/xpath/' },
            ],
          },
        ],
      },
      { text: '关于', link: '/11_关于/', activeMatch: '/11_关于/' },
      { text: '面试', link: '/12_面试/', activeMatch: '/12_面试/' },
    ],
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/danerlt/notes',
      },
    ],
    footer: {
      message: 'Copyright © danerlt. All rights reserved.',
    },
    enableContentAnimation: true,
    enableScrollToTop: true,
  },
  markdown: {
    showLineNumbers: true,
  },
});
