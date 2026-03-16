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
        text: 'AI',
        activeMatch: '/01_AI/',
        items: [
          {
            text: '基础概念',
            link: '/01_AI/01_基础概念/',
          },
          {
            text: '大模型',
            link: '/01_AI/02_大模型/',
          },
          {
            text: '提示词工程',
            link: '/01_AI/03_提示词工程/',
          },
          {
            text: 'RAG',
            link: '/01_AI/04_RAG/',
          },
          {
            text: 'Agent',
            link: '/01_AI/05_Agent/',
          },
          {
            text: '微调',
            link: '/01_AI/06_微调/',
          },
          {
            text: '推理部署',
            link: '/01_AI/07_推理部署/',
          },
          {
            text: '框架与工具',
            items: [
              {
                text: 'Dify',
                link: '/01_AI/08_框架与工具/Dify/',
              },
              {
                text: 'LangChain',
                link: '/01_AI/08_框架与工具/LangChain/',
              },
              {
                text: 'LlamaIndex',
                link: '/01_AI/08_框架与工具/LlamaIndex/',
              },
            ],
          },
          {
            text: '向量数据库',
            link: '/01_AI/09_向量数据库/',
          },
          {
            text: 'Python_AI库',
            link: '/01_AI/10_Python_AI库/',
          },
          {
            text: 'AIGC',
            items: [
              {
                text: '文生视频',
                link: '/01_AI/11_AIGC/文生视频/',
              },
              {
                text: '文生图',
                link: '/01_AI/11_AIGC/文生图/',
              },
            ],
          },
          {
            text: 'AI工具',
            items: [
              {
                text: 'VibeCoding',
                link: '/01_AI/12_AI工具/VibeCoding/',
              },
            ],
          },
        ],
      },
      {
        text: 'Python后端',
        activeMatch: '/02_Python后端/',
        items: [
          {
            text: 'Python基础',
            link: '/02_Python后端/01_Python基础/',
          },
          {
            text: 'uv包管理',
            link: '/02_Python后端/02_uv包管理/',
          },
          {
            text: 'FastAPI',
            link: '/02_Python后端/03_FastAPI/',
          },
          {
            text: '数据库',
            link: '/02_Python后端/04_数据库/',
          },
          {
            text: '测试',
            link: '/02_Python后端/05_测试/',
          },
          {
            text: '实用工具',
            link: '/02_Python后端/06_实用工具/',
          },
        ],
      },
      {
        text: '交易',
        activeMatch: '/03_交易/',
        items: [
          {
            text: '量化交易',
            link: '/03_交易/01_量化交易/',
          },
          {
            text: '数字货币',
            link: '/03_交易/02_数字货币/',
          },
          {
            text: '交易指标',
            link: '/03_交易/03_交易指标/',
          },
          {
            text: '交易策略',
            link: '/03_交易/04_交易策略/',
          },
        ],
      },
      {
        text: '前端',
        activeMatch: '/04_前端/',
        items: [
          {
            text: 'TypeScript',
            link: '/04_前端/02_TypeScript/',
          },
          {
            text: 'Next.js',
            link: '/04_前端/03_Next.js/',
          },
          {
            text: '工程化',
            link: '/04_前端/04_工程化/',
          },
        ],
      },
      {
        text: '运维',
        activeMatch: '/05_运维/',
        items: [
          {
            text: 'Linux',
            link: '/05_运维/01_Linux/',
          },
          {
            text: 'Docker',
            link: '/05_运维/02_Docker/',
          },
          {
            text: 'Kubernetes',
            link: '/05_运维/03_Kubernetes/',
          },
          {
            text: 'CI_CD',
            link: '/05_运维/04_CI_CD/',
          },
        ],
      },
      {
        text: '算法',
        activeMatch: '/06_算法/',
        items: [
          {
            text: '数据结构',
            link: '/06_算法/01_数据结构/',
          },
          {
            text: '排序算法',
            link: '/06_算法/02_排序算法/',
          },
        ],
      },
      {
        text: '常用',
        link: '/07_常用/',
        activeMatch: '/07_常用/',
      },
      {
        text: '其他',
        link: '/08_其他/',
        activeMatch: '/08_其他/',
      },
      {
        text: '关于',
        link: '/09_关于/',
        activeMatch: '/09_关于/',
      },
      {
        text: '面试',
        link: '/10_面试/',
        activeMatch: '/10_面试/',
      },
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
