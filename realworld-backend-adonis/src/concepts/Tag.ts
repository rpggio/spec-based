import { Concept } from '../engine/types';

export const Tag: Concept = {
  state: {
    tags: new Set<string>(),
    name: new Map<string, string>(),
    articles: new Map<string, Set<string>>(), // tag -> articles
    articleTags: new Map<string, Set<string>>(), // article -> tags
  },

  async execute(action: string, input: any) {
    const state = this.state;

    if (action === 'add') {
      const { article, tag } = input;

      if (!tag || tag.trim().length < 1) {
        throw new Error('tag is required');
      }

      const tagId = tag.toLowerCase();

      // Create tag if doesn't exist
      if (!state.tags.has(tagId)) {
        state.tags.add(tagId);
        state.name.set(tagId, tag);
        state.articles.set(tagId, new Set());
      }

      // Add article to tag
      const tagArticles = state.articles.get(tagId)!;
      tagArticles.add(article);

      // Add tag to article
      if (!state.articleTags.has(article)) {
        state.articleTags.set(article, new Set());
      }
      const articleTagSet = state.articleTags.get(article)!;
      articleTagSet.add(tagId);

      return { tag: tagId };
    }

    if (action === 'remove') {
      const { article, tag } = input;

      if (!state.tags.has(tag)) {
        throw new Error('Tag not found');
      }

      const tagArticles = state.articles.get(tag);
      if (tagArticles) {
        tagArticles.delete(article);
      }

      const articleTagSet = state.articleTags.get(article);
      if (articleTagSet) {
        articleTagSet.delete(tag);
      }

      return { tag };
    }

    if (action === 'getTags') {
      const { article } = input;
      const tags = state.articleTags.get(article) || new Set();
      return { tags };
    }

    if (action === 'getTagNames') {
      const { article } = input;
      const tags = state.articleTags.get(article) || new Set();
      const tagList = Array.from(tags).map(t => state.name.get(t)!);
      return { tagList };
    }

    if (action === 'list') {
      const tags = Array.from(state.tags).map(t => state.name.get(t)!);
      return { tags };
    }

    if (action === 'getArticles') {
      const { tag } = input;
      const tagId = tag.toLowerCase();
      const articles = state.articles.get(tagId) || new Set();
      return { articles };
    }

    throw new Error(`Unknown action: ${action}`);
  }
};
