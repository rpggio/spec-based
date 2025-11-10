import { SyncRule } from '../engine/types';
import { uuid } from '../utils/helpers';
import { slugify } from '../utils/slug';

export const articleCreateSyncs: SyncRule[] = [
  {
    name: 'AuthenticateCreateArticle',
    when: [
      {
        concept: 'Web',
        action: 'request',
        input: { method: 'POST', path: '/api/articles' },
      },
    ],
    then: [
      {
        concept: 'Web',
        action: 'getAuthToken',
        input: { request: '?request' },
      },
    ],
  },
  {
    name: 'VerifyCreateArticleToken',
    when: [
      {
        concept: 'Web',
        action: 'request',
        input: { method: 'POST', path: '/api/articles' },
      },
      {
        concept: 'Web',
        action: 'getAuthToken',
      },
    ],
    then: [
      {
        concept: 'JWT',
        action: 'verify',
        input: { token: '?token' },
      },
    ],
  },
  {
    name: 'CreateArticle',
    when: [
      {
        concept: 'Web',
        action: 'request',
        input: { method: 'POST', path: '/api/articles' },
      },
      {
        concept: 'JWT',
        action: 'verify',
      },
    ],
    then: [
      {
        concept: 'Article',
        action: 'create',
        input: {
          article: () => uuid(),
          slug: () => '?slug',
          title: '?body.article.title',
          description: '?body.article.description',
          body: '?body.article.body',
          author: '?user',
        },
      },
    ],
  },
  {
    name: 'AddArticleTags',
    when: [
      {
        concept: 'Web',
        action: 'request',
        input: { method: 'POST', path: '/api/articles' },
      },
      {
        concept: 'Article',
        action: 'create',
      },
    ],
    then: [
      {
        concept: 'Tag',
        action: 'add',
        input: {
          article: '?article',
          tag: '?tagName',
        },
      },
    ],
  },
];
