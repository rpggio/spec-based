import { Concept } from '../engine/types';

export const Article: Concept = {
  state: {
    articles: new Set<string>(),
    slug: new Map<string, string>(),
    title: new Map<string, string>(),
    description: new Map<string, string>(),
    body: new Map<string, string>(),
    author: new Map<string, string>(),
    createdAt: new Map<string, Date>(),
    updatedAt: new Map<string, Date>(),
    slugToArticle: new Map<string, string>(),
  },

  async execute(action: string, input: any) {
    const state = this.state;

    if (action === 'create') {
      const { article, slug, title, description, body, author } = input;

      // Validation
      if (!title || title.trim().length < 1) {
        throw new Error('title is required');
      }
      if (!description) {
        throw new Error('description is required');
      }
      if (!body) {
        throw new Error('body is required');
      }

      // Check slug uniqueness
      if (state.slugToArticle.has(slug)) {
        throw new Error('Article with this slug already exists');
      }

      // Create article
      state.articles.add(article);
      state.slug.set(article, slug);
      state.title.set(article, title);
      state.description.set(article, description);
      state.body.set(article, body);
      state.author.set(article, author);
      const now = new Date();
      state.createdAt.set(article, now);
      state.updatedAt.set(article, now);
      state.slugToArticle.set(slug, article);

      return { article };
    }

    if (action === 'getBySlug') {
      const { slug } = input;

      const article = state.slugToArticle.get(slug);
      if (!article) {
        throw new Error('Article not found');
      }

      return {
        article,
        title: state.title.get(article)!,
        description: state.description.get(article)!,
        body: state.body.get(article)!,
        author: state.author.get(article)!,
        createdAt: state.createdAt.get(article)!,
        updatedAt: state.updatedAt.get(article)!,
      };
    }

    if (action === 'update') {
      const { article, title, description, body } = input;

      if (!state.articles.has(article)) {
        throw new Error('Article not found');
      }

      // Validation
      if (title && title.trim().length < 1) {
        throw new Error('title cannot be empty');
      }

      // Update fields
      if (title) state.title.set(article, title);
      if (description !== undefined) state.description.set(article, description);
      if (body !== undefined) state.body.set(article, body);
      state.updatedAt.set(article, new Date());

      return { article };
    }

    if (action === 'delete') {
      const { article } = input;

      if (!state.articles.has(article)) {
        throw new Error('Article not found');
      }

      const slug = state.slug.get(article)!;
      state.slugToArticle.delete(slug);
      state.articles.delete(article);
      state.slug.delete(article);
      state.title.delete(article);
      state.description.delete(article);
      state.body.delete(article);
      state.author.delete(article);
      state.createdAt.delete(article);
      state.updatedAt.delete(article);

      return { article };
    }

    if (action === 'list') {
      const { limit = 20, offset = 0 } = input;
      const allArticles = Array.from(state.articles);
      const articles = allArticles.slice(offset, offset + limit);
      return { articles: new Set(articles), count: allArticles.length };
    }

    if (action === 'listByAuthor') {
      const { author, limit = 20, offset = 0 } = input;
      const authorArticles = Array.from(state.articles).filter(
        a => state.author.get(a) === author
      );
      const articles = authorArticles.slice(offset, offset + limit);
      return { articles: new Set(articles), count: authorArticles.length };
    }

    if (action === 'listByTag') {
      const { tag, limit = 20, offset = 0 } = input;
      // This will be populated by the Tag concept
      // For now, return empty
      return { articles: new Set(), count: 0 };
    }

    if (action === 'feed') {
      const { user, limit = 20, offset = 0 } = input;
      // This will be filtered by Following concept
      // For now, return all articles
      const allArticles = Array.from(state.articles);
      const articles = allArticles.slice(offset, offset + limit);
      return { articles: new Set(articles), count: allArticles.length };
    }

    if (action === 'getAuthor') {
      const { article } = input;
      if (!state.articles.has(article)) {
        throw new Error('Article not found');
      }
      return { author: state.author.get(article)! };
    }

    if (action === 'exists') {
      const { article } = input;
      return { exists: state.articles.has(article) };
    }

    throw new Error(`Unknown action: ${action}`);
  }
};
