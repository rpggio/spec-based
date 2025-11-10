import { Concept } from '../engine/types';

export const Comment: Concept = {
  state: {
    comments: new Set<string>(),
    id: new Map<string, number>(),
    body: new Map<string, string>(),
    article: new Map<string, string>(),
    author: new Map<string, string>(),
    createdAt: new Map<string, Date>(),
    updatedAt: new Map<string, Date>(),
    idToComment: new Map<number, string>(),
    nextId: 1,
  },

  async execute(action: string, input: any) {
    const state = this.state;

    if (action === 'create') {
      const { comment, id, body, article, author } = input;

      // Validation
      if (!body || body.trim().length < 1) {
        throw new Error('body is required');
      }

      // Create comment
      state.comments.add(comment);
      state.id.set(comment, id);
      state.body.set(comment, body);
      state.article.set(comment, article);
      state.author.set(comment, author);
      const now = new Date();
      state.createdAt.set(comment, now);
      state.updatedAt.set(comment, now);
      state.idToComment.set(id, comment);

      return { comment };
    }

    if (action === 'delete') {
      const { comment } = input;

      if (!state.comments.has(comment)) {
        throw new Error('Comment not found');
      }

      const id = state.id.get(comment)!;
      state.idToComment.delete(id);
      state.comments.delete(comment);
      state.id.delete(comment);
      state.body.delete(comment);
      state.article.delete(comment);
      state.author.delete(comment);
      state.createdAt.delete(comment);
      state.updatedAt.delete(comment);

      return { comment };
    }

    if (action === 'list') {
      const { article } = input;
      const articleComments = Array.from(state.comments).filter(
        c => state.article.get(c) === article
      );
      return { comments: new Set(articleComments) };
    }

    if (action === 'getById') {
      const { id } = input;
      const comment = state.idToComment.get(id);
      if (!comment) {
        throw new Error('Comment not found');
      }
      return { comment };
    }

    if (action === 'getAuthor') {
      const { comment } = input;
      if (!state.comments.has(comment)) {
        throw new Error('Comment not found');
      }
      return { author: state.author.get(comment)! };
    }

    throw new Error(`Unknown action: ${action}`);
  }
};
