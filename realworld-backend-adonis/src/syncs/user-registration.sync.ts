import { SyncRule } from '../engine/types';
import { uuid } from '../utils/helpers';

export const userRegistrationSyncs: SyncRule[] = [
  {
    name: 'ValidateRegistrationPassword',
    when: [
      {
        concept: 'Web',
        action: 'request',
        input: { method: 'POST', path: '/api/users' },
      },
    ],
    then: [
      {
        concept: 'Password',
        action: 'validate',
        input: { password: '?body.user.password' },
      },
    ],
  },
  {
    name: 'RegisterUser',
    when: [
      {
        concept: 'Web',
        action: 'request',
        input: { method: 'POST', path: '/api/users' },
      },
      {
        concept: 'Password',
        action: 'validate',
        output: { valid: true },
      },
    ],
    then: [
      {
        concept: 'User',
        action: 'register',
        input: {
          user: () => uuid(),
          email: '?body.user.email',
          username: '?body.user.username',
        },
      },
    ],
  },
  {
    name: 'SetUserPassword',
    when: [
      {
        concept: 'Web',
        action: 'request',
        input: { method: 'POST', path: '/api/users' },
      },
      {
        concept: 'User',
        action: 'register',
      },
    ],
    then: [
      {
        concept: 'Password',
        action: 'set',
        input: {
          user: '?user',
          password: '?body.user.password',
        },
      },
    ],
  },
  {
    name: 'GenerateRegistrationToken',
    when: [
      {
        concept: 'User',
        action: 'register',
      },
      {
        concept: 'Password',
        action: 'set',
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
