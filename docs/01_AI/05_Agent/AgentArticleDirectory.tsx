type MarkdownModule = {
  frontmatter?: {
    title?: string;
  };
  title?: string;
};

const articleModules = import.meta.glob('./*.md', {
  eager: true,
}) as Record<string, MarkdownModule>;

const excludedFiles = new Set(['./index.md', './README.md']);

const getFileName = (filePath: string) =>
  filePath.replace('./', '').replace(/\.md$/, '');

const getArticleTitle = (filePath: string, module: MarkdownModule) =>
  module.frontmatter?.title ?? module.title ?? getFileName(filePath);

const articleEntries = Object.entries(articleModules)
  .filter(([filePath]) => !excludedFiles.has(filePath))
  .map(([filePath, module]) => {
    const fileName = getFileName(filePath);

    return {
      fileName,
      title: getArticleTitle(filePath, module),
      href: encodeURI(`./${fileName}/`),
    };
  })
  .sort((left, right) => left.title.localeCompare(right.title, 'zh-CN'));

export function AgentArticleDirectory() {
  if (articleEntries.length === 0) {
    return <p>当前目录下暂时还没有可展示的文章。</p>;
  }

  return (
    <ul>
      {articleEntries.map((article) => (
        <li key={article.fileName}>
          <a href={article.href}>{article.title}</a>
        </li>
      ))}
    </ul>
  );
}
