import { Concept } from '../engine/types';

export const Favorite: Concept = {
  state: {
    favorites: new Map<string, Set<string>>(), // article -> set of users
    count: new Map<string, number>(),
  },

  async execute(action: string, input: any) {
    const state = this.state;

    if (action === 'add') {
      const { article, user } = input;

      if (!state.favorites.has(article)) {
        state.favorites.set(article, new Set());
        state.count.set(article, 0);
      }

      const favs = state.favorites.get(article)!;
      if (favs.has(user)) {
        throw new Error('Article already favorited');
      }

      favs.add(user);
      state.count.set(article, favs.size);

      return { article };
    }

    if (action === 'remove') {
      const { article, user } = input;

      if (!state.favorites.has(article)) {
        throw new Error('Article not favorited');
      }

      const favs = state.favorites.get(article)!;
      if (!favs.has(user)) {
        throw new Error('Article not favorited');
      }

      favs.delete(user);
      state.count.set(article, favs.size);

      return { article };
    }

    if (action === 'isFavorited') {
      const { article, user } = input;

      if (!state.favorites.has(article)) {
        return { favorited: false };
      }

      const favs = state.favorites.get(article)!;
      return { favorited: favs.has(user) };
    }

    if (action === 'getCount') {
      const { article } = input;
      return { count: state.count.get(article) || 0 };
    }

    if (action === 'getFavorites') {
      const { user } = input;
      const articles = new Set<string>();
      for (const [article, users] of state.favorites) {
        if (users.has(user)) {
          articles.add(article);
        }
      }
      return { articles };
    }

    if (action === 'listByFavoriter') {
      const { username, limit = 20, offset = 0 } = input;
      // This requires user lookup, will be handled in syncs
      return { articles: new Set(), count: 0 };
    }

    throw new Error(`Unknown action: ${action}`);
  }
};
