import express from 'express';
import cors from 'cors';
import { LegibleEngine } from './engine/Engine';
import { User } from './concepts/User';
import { Password } from './concepts/Password';
import { JWT } from './concepts/JWT';
import { Article } from './concepts/Article';
import { Comment } from './concepts/Comment';
import { Favorite } from './concepts/Favorite';
import { Following } from './concepts/Following';
import { Tag } from './concepts/Tag';
import { Profile } from './concepts/Profile';
import { Web } from './concepts/Web';
import { uuid, nextId } from './utils/helpers';
import { slugify } from './utils/slug';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize engine
const engine = new LegibleEngine();

// Register concepts
engine.registerConcept('User', User);
engine.registerConcept('Password', Password);
engine.registerConcept('JWT', JWT);
engine.registerConcept('Article', Article);
engine.registerConcept('Comment', Comment);
engine.registerConcept('Favorite', Favorite);
engine.registerConcept('Following', Following);
engine.registerConcept('Tag', Tag);
engine.registerConcept('Profile', Profile);
engine.registerConcept('Web', Web);

// Helper to extract token
function extractToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  if (authHeader.startsWith('Token ')) {
    return authHeader.substring(6);
  }
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Helper to handle errors
function handleError(res: express.Response, error: any, allowEmpty: boolean = false) {
  console.error('Error:', error.message);
  if (error.message.includes('not found') || error.message.includes('Not found')) {
    if (allowEmpty) {
      // For listing endpoints, return empty array instead of error
      return res.json({ articles: [], articlesCount: 0 });
    }
    return res.status(404).json({ errors: { body: [error.message] } });
  }
  if (error.message.includes('Invalid or expired token') || error.message.includes('No authorization')) {
    return res.status(401).json({ errors: { body: ['unauthorized'] } });
  }
  return res.status(422).json({ errors: { body: [error.message] } });
}

// Routes
// User registration
app.post('/api/users', async (req, res) => {
  try {
    const userId = uuid();
    const { email, username, password } = req.body.user || {};

    // Validate password
    const validateResult = await engine.invoke('Password', 'validate', { password }, 'flow');
    if (!validateResult.valid) {
      return res.status(422).json({ errors: { body: ['password must be at least 8 characters'] } });
    }

    // Register user
    await engine.invoke('User', 'register', { user: userId, email, username }, 'flow');

    // Set password
    await engine.invoke('Password', 'set', { user: userId, password }, 'flow');

    // Generate token
    const tokenResult = await engine.invoke('JWT', 'generate', { user: userId }, 'flow');

    // Get user details
    const userState = User.state;
    const userResponse = {
      email: userState.email.get(userId),
      username: userState.username.get(userId),
      bio: userState.bio.get(userId),
      image: userState.image.get(userId),
      token: tokenResult.token,
    };

    res.status(201).json({ user: userResponse });
  } catch (error: any) {
    handleError(res, error);
  }
});

// User login
app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body.user || {};

    // Get user by email
    const userResult = await engine.invoke('User', 'getByEmail', { email }, 'flow');
    const userId = userResult.user;

    // Check password
    const passwordResult = await engine.invoke('Password', 'check', { user: userId, password }, 'flow');
    if (!passwordResult.valid) {
      return res.status(422).json({ errors: { body: ['email or password is invalid'] } });
    }

    // Generate token
    const tokenResult = await engine.invoke('JWT', 'generate', { user: userId }, 'flow');

    // Get user details
    const userState = User.state;
    const userResponse = {
      email: userState.email.get(userId),
      username: userState.username.get(userId),
      bio: userState.bio.get(userId),
      image: userState.image.get(userId),
      token: tokenResult.token,
    };

    res.json({ user: userResponse });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Get current user
app.get('/api/user', async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const userId = verifyResult.user;

    const userState = User.state;
    const tokenResult = await engine.invoke('JWT', 'getToken', { user: userId }, 'flow');

    const userResponse = {
      email: userState.email.get(userId),
      username: userState.username.get(userId),
      bio: userState.bio.get(userId),
      image: userState.image.get(userId),
      token: tokenResult.token,
    };

    res.json({ user: userResponse });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Update current user
app.put('/api/user', async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const userId = verifyResult.user;

    const { email, username, password, bio, image } = req.body.user || {};

    // Update user
    await engine.invoke('User', 'update', {
      user: userId,
      email: email || User.state.email.get(userId),
      bio: bio !== undefined ? bio : User.state.bio.get(userId),
      image: image !== undefined ? image : User.state.image.get(userId),
    }, 'flow');

    // Update password if provided
    if (password) {
      await engine.invoke('Password', 'set', { user: userId, password }, 'flow');
    }

    const userState = User.state;
    const tokenResult = await engine.invoke('JWT', 'getToken', { user: userId }, 'flow');

    const userResponse = {
      email: userState.email.get(userId),
      username: userState.username.get(userId),
      bio: userState.bio.get(userId),
      image: userState.image.get(userId),
      token: tokenResult.token,
    };

    res.json({ user: userResponse });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Get profile
app.get('/api/profiles/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const token = extractToken(req);

    // Get user by username
    const userResult = await engine.invoke('User', 'getByUsername', { username }, 'flow');
    const userId = userResult.user;

    const userState = User.state;
    let following = false;

    if (token) {
      try {
        const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
        const viewerId = verifyResult.user;
        const followResult = await engine.invoke('Following', 'isFollowing', {
          follower: viewerId,
          target: userId,
        }, 'flow');
        following = followResult.following;
      } catch (e) {
        // Token invalid, continue as unauthenticated
      }
    }

    const profile = {
      username: userState.username.get(userId),
      bio: userState.bio.get(userId) || '',
      image: userState.image.get(userId) || '',
      following,
    };

    res.json({ profile });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Follow user
app.post('/api/profiles/:username/follow', async (req, res) => {
  try {
    const { username } = req.params;
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const followerId = verifyResult.user;

    const userResult = await engine.invoke('User', 'getByUsername', { username }, 'flow');
    const targetId = userResult.user;

    await engine.invoke('Following', 'follow', { follower: followerId, target: targetId }, 'flow');

    const userState = User.state;
    const profile = {
      username: userState.username.get(targetId),
      bio: userState.bio.get(targetId) || '',
      image: userState.image.get(targetId) || '',
      following: true,
    };

    res.json({ profile });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Unfollow user
app.delete('/api/profiles/:username/follow', async (req, res) => {
  try {
    const { username } = req.params;
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const followerId = verifyResult.user;

    const userResult = await engine.invoke('User', 'getByUsername', { username }, 'flow');
    const targetId = userResult.user;

    await engine.invoke('Following', 'unfollow', { follower: followerId, target: targetId }, 'flow');

    const userState = User.state;
    const profile = {
      username: userState.username.get(targetId),
      bio: userState.bio.get(targetId) || '',
      image: userState.image.get(targetId) || '',
      following: false,
    };

    res.json({ profile });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Create article
app.post('/api/articles', async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const authorId = verifyResult.user;

    const { title, description, body, tagList } = req.body.article || {};
    const articleId = uuid();
    const slug = slugify(title);

    // Create article
    await engine.invoke('Article', 'create', {
      article: articleId,
      slug,
      title,
      description,
      body,
      author: authorId,
    }, 'flow');

    // Add tags if provided
    if (tagList && Array.isArray(tagList)) {
      for (const tag of tagList) {
        await engine.invoke('Tag', 'add', { article: articleId, tag }, 'flow');
      }
    }

    // Build response
    const articleState = Article.state;
    const userState = User.state;
    const tagResult = await engine.invoke('Tag', 'getTagNames', { article: articleId }, 'flow');
    const favCountResult = await engine.invoke('Favorite', 'getCount', { article: articleId }, 'flow');

    const article = {
      slug: articleState.slug.get(articleId),
      title: articleState.title.get(articleId),
      description: articleState.description.get(articleId),
      body: articleState.body.get(articleId),
      tagList: tagResult.tagList || [],
      createdAt: articleState.createdAt.get(articleId),
      updatedAt: articleState.updatedAt.get(articleId),
      favorited: false,
      favoritesCount: favCountResult.count,
      author: {
        username: userState.username.get(authorId),
        bio: userState.bio.get(authorId) || '',
        image: userState.image.get(authorId) || '',
        following: false,
      },
    };

    res.status(201).json({ article });
  } catch (error: any) {
    handleError(res, error);
  }
});

// List articles
app.get('/api/articles', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const tag = req.query.tag as string;
    const author = req.query.author as string;
    const favorited = req.query.favorited as string;
    const token = extractToken(req);

    let viewerId: string | null = null;
    if (token) {
      try {
        const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
        viewerId = verifyResult.user;
      } catch (e) {
        // Invalid token, continue as unauthenticated
      }
    }

    let articlesResult;

    if (tag) {
      const tagArticlesResult = await engine.invoke('Tag', 'getArticles', { tag }, 'flow');
      const tagArticles = Array.from(tagArticlesResult.articles);
      articlesResult = {
        articles: new Set(tagArticles.slice(offset, offset + limit)),
        count: tagArticles.length,
      };
    } else if (author) {
      try {
        const authorResult = await engine.invoke('User', 'getByUsername', { username: author }, 'flow');
        articlesResult = await engine.invoke('Article', 'listByAuthor', {
          author: authorResult.user,
          limit,
          offset,
        }, 'flow');
      } catch (error: any) {
        if (error.message.includes('not found')) {
          // Author not found, return empty result
          articlesResult = { articles: new Set(), count: 0 };
        } else {
          throw error;
        }
      }
    } else if (favorited) {
      const favUserResult = await engine.invoke('User', 'getByUsername', { username: favorited }, 'flow');
      const favArticlesResult = await engine.invoke('Favorite', 'getFavorites', {
        user: favUserResult.user,
      }, 'flow');
      const favArticles = Array.from(favArticlesResult.articles);
      articlesResult = {
        articles: new Set(favArticles.slice(offset, offset + limit)),
        count: favArticles.length,
      };
    } else {
      articlesResult = await engine.invoke('Article', 'list', { limit, offset }, 'flow');
    }

    const articles = await Promise.all(
      Array.from(articlesResult.articles).map(async (articleId: any) => {
        const articleState = Article.state;
        const authorId = articleState.author.get(articleId);
        const userState = User.state;
        const tagResult = await engine.invoke('Tag', 'getTagNames', { article: articleId }, 'flow');
        const favCountResult = await engine.invoke('Favorite', 'getCount', { article: articleId }, 'flow');

        let favorited = false;
        let following = false;

        if (viewerId) {
          const favResult = await engine.invoke('Favorite', 'isFavorited', {
            article: articleId,
            user: viewerId,
          }, 'flow');
          favorited = favResult.favorited;

          const followResult = await engine.invoke('Following', 'isFollowing', {
            follower: viewerId,
            target: authorId,
          }, 'flow');
          following = followResult.following;
        }

        return {
          slug: articleState.slug.get(articleId),
          title: articleState.title.get(articleId),
          description: articleState.description.get(articleId),
          body: articleState.body.get(articleId),
          tagList: tagResult.tagList || [],
          createdAt: articleState.createdAt.get(articleId),
          updatedAt: articleState.updatedAt.get(articleId),
          favorited,
          favoritesCount: favCountResult.count,
          author: {
            username: userState.username.get(authorId),
            bio: userState.bio.get(authorId) || '',
            image: userState.image.get(authorId) || '',
            following,
          },
        };
      })
    );

    res.json({ articles, articlesCount: articlesResult.count });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Get article feed
app.get('/api/articles/feed', async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const userId = verifyResult.user;

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get followed users
    const followingResult = await engine.invoke('Following', 'getFollowing', { user: userId }, 'flow');
    const followedUsers = Array.from(followingResult.following);

    // Get articles from followed users
    const allArticles: any[] = [];
    for (const followedUser of followedUsers) {
      const articlesResult = await engine.invoke('Article', 'listByAuthor', {
        author: followedUser,
        limit: 1000,
        offset: 0,
      }, 'flow');
      allArticles.push(...Array.from(articlesResult.articles));
    }

    // Sort by date and paginate
    const articleState = Article.state;
    const sortedArticles = allArticles.sort((a, b) => {
      const dateA = articleState.createdAt.get(a)?.getTime() || 0;
      const dateB = articleState.createdAt.get(b)?.getTime() || 0;
      return dateB - dateA;
    });

    const paginatedArticles = sortedArticles.slice(offset, offset + limit);

    const articles = await Promise.all(
      paginatedArticles.map(async (articleId: any) => {
        const authorId = articleState.author.get(articleId);
        const userState = User.state;
        const tagResult = await engine.invoke('Tag', 'getTagNames', { article: articleId }, 'flow');
        const favCountResult = await engine.invoke('Favorite', 'getCount', { article: articleId }, 'flow');

        const favResult = await engine.invoke('Favorite', 'isFavorited', {
          article: articleId,
          user: userId,
        }, 'flow');

        return {
          slug: articleState.slug.get(articleId),
          title: articleState.title.get(articleId),
          description: articleState.description.get(articleId),
          body: articleState.body.get(articleId),
          tagList: tagResult.tagList || [],
          createdAt: articleState.createdAt.get(articleId),
          updatedAt: articleState.updatedAt.get(articleId),
          favorited: favResult.favorited,
          favoritesCount: favCountResult.count,
          author: {
            username: userState.username.get(authorId),
            bio: userState.bio.get(authorId) || '',
            image: userState.image.get(authorId) || '',
            following: true,
          },
        };
      })
    );

    res.json({ articles, articlesCount: sortedArticles.length });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Get single article
app.get('/api/articles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const token = extractToken(req);

    const articleResult = await engine.invoke('Article', 'getBySlug', { slug }, 'flow');
    const articleId = articleResult.article;
    const authorId = articleResult.author;

    let viewerId: string | null = null;
    if (token) {
      try {
        const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
        viewerId = verifyResult.user;
      } catch (e) {
        // Invalid token
      }
    }

    const articleState = Article.state;
    const userState = User.state;
    const tagResult = await engine.invoke('Tag', 'getTagNames', { article: articleId }, 'flow');
    const favCountResult = await engine.invoke('Favorite', 'getCount', { article: articleId }, 'flow');

    let favorited = false;
    let following = false;

    if (viewerId) {
      const favResult = await engine.invoke('Favorite', 'isFavorited', {
        article: articleId,
        user: viewerId,
      }, 'flow');
      favorited = favResult.favorited;

      const followResult = await engine.invoke('Following', 'isFollowing', {
        follower: viewerId,
        target: authorId,
      }, 'flow');
      following = followResult.following;
    }

    const article = {
      slug: articleState.slug.get(articleId),
      title: articleState.title.get(articleId),
      description: articleState.description.get(articleId),
      body: articleState.body.get(articleId),
      tagList: tagResult.tagList || [],
      createdAt: articleState.createdAt.get(articleId),
      updatedAt: articleState.updatedAt.get(articleId),
      favorited,
      favoritesCount: favCountResult.count,
      author: {
        username: userState.username.get(authorId),
        bio: userState.bio.get(authorId) || '',
        image: userState.image.get(authorId) || '',
        following,
      },
    };

    res.json({ article });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Update article
app.put('/api/articles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const userId = verifyResult.user;

    const articleResult = await engine.invoke('Article', 'getBySlug', { slug }, 'flow');
    const articleId = articleResult.article;
    const authorId = articleResult.author;

    // Check ownership
    if (userId !== authorId) {
      return res.status(403).json({ errors: { body: ['forbidden'] } });
    }

    const { title, description, body } = req.body.article || {};
    const articleState = Article.state;

    await engine.invoke('Article', 'update', {
      article: articleId,
      title: title || articleState.title.get(articleId),
      description: description !== undefined ? description : articleState.description.get(articleId),
      body: body !== undefined ? body : articleState.body.get(articleId),
    }, 'flow');

    const userState = User.state;
    const tagResult = await engine.invoke('Tag', 'getTagNames', { article: articleId }, 'flow');
    const favCountResult = await engine.invoke('Favorite', 'getCount', { article: articleId }, 'flow');

    const favResult = await engine.invoke('Favorite', 'isFavorited', {
      article: articleId,
      user: userId,
    }, 'flow');

    const article = {
      slug: articleState.slug.get(articleId),
      title: articleState.title.get(articleId),
      description: articleState.description.get(articleId),
      body: articleState.body.get(articleId),
      tagList: tagResult.tagList || [],
      createdAt: articleState.createdAt.get(articleId),
      updatedAt: articleState.updatedAt.get(articleId),
      favorited: favResult.favorited,
      favoritesCount: favCountResult.count,
      author: {
        username: userState.username.get(authorId),
        bio: userState.bio.get(authorId) || '',
        image: userState.image.get(authorId) || '',
        following: false,
      },
    };

    res.json({ article });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Delete article
app.delete('/api/articles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const userId = verifyResult.user;

    const articleResult = await engine.invoke('Article', 'getBySlug', { slug }, 'flow');
    const articleId = articleResult.article;
    const authorId = articleResult.author;

    // Check ownership
    if (userId !== authorId) {
      return res.status(403).json({ errors: { body: ['forbidden'] } });
    }

    // Delete comments
    const commentsResult = await engine.invoke('Comment', 'list', { article: articleId }, 'flow');
    for (const commentId of commentsResult.comments) {
      await engine.invoke('Comment', 'delete', { comment: commentId }, 'flow');
    }

    // Delete article
    await engine.invoke('Article', 'delete', { article: articleId }, 'flow');

    res.status(204).send();
  } catch (error: any) {
    handleError(res, error);
  }
});

// Favorite article
app.post('/api/articles/:slug/favorite', async (req, res) => {
  try {
    const { slug } = req.params;
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const userId = verifyResult.user;

    const articleResult = await engine.invoke('Article', 'getBySlug', { slug }, 'flow');
    const articleId = articleResult.article;
    const authorId = articleResult.author;

    await engine.invoke('Favorite', 'add', { article: articleId, user: userId }, 'flow');

    const articleState = Article.state;
    const userState = User.state;
    const tagResult = await engine.invoke('Tag', 'getTagNames', { article: articleId }, 'flow');
    const favCountResult = await engine.invoke('Favorite', 'getCount', { article: articleId }, 'flow');

    const followResult = await engine.invoke('Following', 'isFollowing', {
      follower: userId,
      target: authorId,
    }, 'flow');

    const article = {
      slug: articleState.slug.get(articleId),
      title: articleState.title.get(articleId),
      description: articleState.description.get(articleId),
      body: articleState.body.get(articleId),
      tagList: tagResult.tagList || [],
      createdAt: articleState.createdAt.get(articleId),
      updatedAt: articleState.updatedAt.get(articleId),
      favorited: true,
      favoritesCount: favCountResult.count,
      author: {
        username: userState.username.get(authorId),
        bio: userState.bio.get(authorId) || '',
        image: userState.image.get(authorId) || '',
        following: followResult.following,
      },
    };

    res.json({ article });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Unfavorite article
app.delete('/api/articles/:slug/favorite', async (req, res) => {
  try {
    const { slug } = req.params;
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const userId = verifyResult.user;

    const articleResult = await engine.invoke('Article', 'getBySlug', { slug }, 'flow');
    const articleId = articleResult.article;
    const authorId = articleResult.author;

    await engine.invoke('Favorite', 'remove', { article: articleId, user: userId }, 'flow');

    const articleState = Article.state;
    const userState = User.state;
    const tagResult = await engine.invoke('Tag', 'getTagNames', { article: articleId }, 'flow');
    const favCountResult = await engine.invoke('Favorite', 'getCount', { article: articleId }, 'flow');

    const followResult = await engine.invoke('Following', 'isFollowing', {
      follower: userId,
      target: authorId,
    }, 'flow');

    const article = {
      slug: articleState.slug.get(articleId),
      title: articleState.title.get(articleId),
      description: articleState.description.get(articleId),
      body: articleState.body.get(articleId),
      tagList: tagResult.tagList || [],
      createdAt: articleState.createdAt.get(articleId),
      updatedAt: articleState.updatedAt.get(articleId),
      favorited: false,
      favoritesCount: favCountResult.count,
      author: {
        username: userState.username.get(authorId),
        bio: userState.bio.get(authorId) || '',
        image: userState.image.get(authorId) || '',
        following: followResult.following,
      },
    };

    res.json({ article });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Create comment
app.post('/api/articles/:slug/comments', async (req, res) => {
  try {
    const { slug } = req.params;
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const authorId = verifyResult.user;

    const articleResult = await engine.invoke('Article', 'getBySlug', { slug }, 'flow');
    const articleId = articleResult.article;

    const { body } = req.body.comment || {};
    const commentId = uuid();
    const id = nextId();

    await engine.invoke('Comment', 'create', {
      comment: commentId,
      id,
      body,
      article: articleId,
      author: authorId,
    }, 'flow');

    const commentState = Comment.state;
    const userState = User.state;

    const comment = {
      id: commentState.id.get(commentId),
      body: commentState.body.get(commentId),
      createdAt: commentState.createdAt.get(commentId),
      updatedAt: commentState.updatedAt.get(commentId),
      author: {
        username: userState.username.get(authorId),
        bio: userState.bio.get(authorId) || '',
        image: userState.image.get(authorId) || '',
        following: false,
      },
    };

    res.status(201).json({ comment });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Get comments
app.get('/api/articles/:slug/comments', async (req, res) => {
  try {
    const { slug } = req.params;
    const token = extractToken(req);

    let viewerId: string | null = null;
    if (token) {
      try {
        const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
        viewerId = verifyResult.user;
      } catch (e) {
        // Invalid token
      }
    }

    const articleResult = await engine.invoke('Article', 'getBySlug', { slug }, 'flow');
    const articleId = articleResult.article;

    const commentsResult = await engine.invoke('Comment', 'list', { article: articleId }, 'flow');

    const comments = await Promise.all(
      Array.from(commentsResult.comments).map(async (commentId: any) => {
        const commentState = Comment.state;
        const authorId = commentState.author.get(commentId);
        const userState = User.state;

        let following = false;
        if (viewerId) {
          const followResult = await engine.invoke('Following', 'isFollowing', {
            follower: viewerId,
            target: authorId,
          }, 'flow');
          following = followResult.following;
        }

        return {
          id: commentState.id.get(commentId),
          body: commentState.body.get(commentId),
          createdAt: commentState.createdAt.get(commentId),
          updatedAt: commentState.updatedAt.get(commentId),
          author: {
            username: userState.username.get(authorId),
            bio: userState.bio.get(authorId) || '',
            image: userState.image.get(authorId) || '',
            following,
          },
        };
      })
    );

    res.json({ comments });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Delete comment
app.delete('/api/articles/:slug/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ errors: { body: ['unauthorized'] } });
    }

    const verifyResult = await engine.invoke('JWT', 'verify', { token }, 'flow');
    const userId = verifyResult.user;

    const commentResult = await engine.invoke('Comment', 'getById', { id: parseInt(id) }, 'flow');
    const commentId = commentResult.comment;

    const authorResult = await engine.invoke('Comment', 'getAuthor', { comment: commentId }, 'flow');
    const authorId = authorResult.author;

    // Check ownership
    if (userId !== authorId) {
      return res.status(403).json({ errors: { body: ['forbidden'] } });
    }

    await engine.invoke('Comment', 'delete', { comment: commentId }, 'flow');

    res.status(204).send();
  } catch (error: any) {
    handleError(res, error);
  }
});

// Get tags
app.get('/api/tags', async (req, res) => {
  try {
    const tagsResult = await engine.invoke('Tag', 'list', {}, 'flow');
    res.json({ tags: tagsResult.tags });
  } catch (error: any) {
    handleError(res, error);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`RealWorld API server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});

export default app;
