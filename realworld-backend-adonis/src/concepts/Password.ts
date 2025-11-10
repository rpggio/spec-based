import { Concept } from '../engine/types';
import * as bcrypt from 'bcrypt';

export const Password: Concept = {
  state: {
    password: new Map<string, string>(),
    salt: new Map<string, string>(),
  },

  async execute(action: string, input: any) {
    const state = this.state;

    if (action === 'set') {
      const { user, password } = input;

      // Validate password
      if (!password || password.length < 8) {
        throw new Error('password must be at least 8 characters');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(password, salt);

      state.password.set(user, hashed);
      state.salt.set(user, salt);

      return { user };
    }

    if (action === 'check') {
      const { user, password } = input;

      if (!state.password.has(user)) {
        throw new Error('User not found');
      }

      const hashed = state.password.get(user)!;
      const valid = await bcrypt.compare(password, hashed);

      return { valid };
    }

    if (action === 'validate') {
      const { password } = input;
      const valid = password && password.length >= 8;
      return { valid };
    }

    throw new Error(`Unknown action: ${action}`);
  }
};
