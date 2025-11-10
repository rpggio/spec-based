import { Concept } from '../engine/types';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'realworld-secret-key-change-in-production';
const JWT_EXPIRY = '60d';

export const JWT: Concept = {
  state: {
    tokens: new Map<string, string>(),
    issued: new Map<string, Date>(),
  },

  async execute(action: string, input: any) {
    const state = this.state;

    if (action === 'generate') {
      const { user } = input;

      const token = jwt.sign({ userId: user }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

      state.tokens.set(user, token);
      state.issued.set(user, new Date());

      return { token };
    }

    if (action === 'verify') {
      const { token } = input;

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return { user: decoded.userId };
      } catch (error) {
        throw new Error('Invalid or expired token');
      }
    }

    if (action === 'getToken') {
      const { user } = input;

      if (!state.tokens.has(user)) {
        throw new Error('No token found for user');
      }

      return { token: state.tokens.get(user)! };
    }

    throw new Error(`Unknown action: ${action}`);
  }
};
