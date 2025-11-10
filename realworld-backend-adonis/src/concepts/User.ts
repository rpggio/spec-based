import { Concept } from '../engine/types';

export const User: Concept = {
  state: {
    users: new Set<string>(),
    email: new Map<string, string>(),
    username: new Map<string, string>(),
    bio: new Map<string, string>(),
    image: new Map<string, string>(),
  },

  async execute(action: string, input: any) {
    const state = this.state;

    if (action === 'register') {
      const { user, email, username } = input;

      // Validation
      if (!email || !email.includes('@')) {
        throw new Error('email must be a valid email address');
      }
      if (!username || username.trim().length < 1) {
        throw new Error('username is required');
      }

      // Check uniqueness
      if ([...state.email.values()].includes(email)) {
        throw new Error('email has already been taken');
      }
      if ([...state.username.values()].includes(username)) {
        throw new Error('username has already been taken');
      }

      // Create user
      state.users.add(user);
      state.email.set(user, email);
      state.username.set(user, username);
      state.bio.set(user, '');
      state.image.set(user, '');

      return { user };
    }

    if (action === 'update') {
      const { user, email, bio, image } = input;

      if (!state.users.has(user)) {
        throw new Error('User not found');
      }

      // Validate email if changed
      if (email && !email.includes('@')) {
        throw new Error('email must be a valid email address');
      }

      // Check email uniqueness if changed
      const currentEmail = state.email.get(user);
      if (email && email !== currentEmail) {
        if ([...state.email.values()].includes(email)) {
          throw new Error('email has already been taken');
        }
        state.email.set(user, email);
      }

      if (bio !== undefined) state.bio.set(user, bio);
      if (image !== undefined) state.image.set(user, image);

      return { user };
    }

    if (action === 'getByEmail') {
      const { email } = input;
      for (const [userId, userEmail] of state.email) {
        if (userEmail === email) {
          return { user: userId };
        }
      }
      throw new Error('User not found');
    }

    if (action === 'getByUsername') {
      const { username } = input;
      for (const [userId, uname] of state.username) {
        if (uname === username) {
          return { user: userId };
        }
      }
      throw new Error('User not found');
    }

    if (action === 'exists') {
      const { user } = input;
      return { exists: state.users.has(user) };
    }

    throw new Error(`Unknown action: ${action}`);
  }
};
