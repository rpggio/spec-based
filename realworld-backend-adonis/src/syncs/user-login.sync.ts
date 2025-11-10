import { SyncRule } from '../engine/types';

export const userLoginSyncs: SyncRule[] = [
  {
    name: 'AuthenticateUser',
    when: [
      {
        concept: 'Web',
        action: 'request',
        input: { method: 'POST', path: '/api/users/login' },
      },
    ],
    then: [
      {
        concept: 'User',
        action: 'getByEmail',
        input: { email: '?body.user.email' },
      },
    ],
  },
  {
    name: 'VerifyPassword',
    when: [
      {
        concept: 'Web',
        action: 'request',
        input: { method: 'POST', path: '/api/users/login' },
      },
      {
        concept: 'User',
        action: 'getByEmail',
      },
    ],
    then: [
      {
        concept: 'Password',
        action: 'check',
        input: {
          user: '?user',
          password: '?body.user.password',
        },
      },
    ],
  },
  {
    name: 'GenerateLoginToken',
    when: [
      {
        concept: 'User',
        action: 'getByEmail',
      },
      {
        concept: 'Password',
        action: 'check',
        output: { valid: true },
      },
    ],
    then: [
      {
        concept: 'JWT',
        action: 'generate',
        input: { user: '?user' },
      },
    ],
  },
];
