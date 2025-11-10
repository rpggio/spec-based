import { Concept } from '../engine/types';

export const Web: Concept = {
  state: {
    requests: new Set<string>(),
    method: new Map<string, string>(),
    path: new Map<string, string>(),
    headers: new Map<string, any>(),
    body: new Map<string, any>(),
    params: new Map<string, any>(),
    query: new Map<string, any>(),
    responses: new Map<string, any>(),
  },

  async execute(action: string, input: any) {
    const state = this.state;

    if (action === 'request') {
      const { request, method, path, headers = {}, body = {}, params = {}, query = {} } = input;

      state.requests.add(request);
      state.method.set(request, method);
      state.path.set(request, path);
      state.headers.set(request, headers);
      state.body.set(request, body);
      state.params.set(request, params);
      state.query.set(request, query);

      return { request };
    }

    if (action === 'respond') {
      const { request, status, body } = input;
      state.responses.set(request, { status, body });
      return { request };
    }

    if (action === 'respondError') {
      const { request, status, error } = input;
      state.responses.set(request, { status, error });
      return { request };
    }

    if (action === 'respondValidationError') {
      const { request, errors } = input;
      state.responses.set(request, { status: 422, errors });
      return { request };
    }

    if (action === 'getAuthToken') {
      const { request } = input;
      const headers = state.headers.get(request);

      if (!headers || !headers.authorization) {
        throw new Error('No authorization header');
      }

      const authHeader = headers.authorization;
      if (!authHeader.startsWith('Token ') && !authHeader.startsWith('Bearer ')) {
        throw new Error('Invalid authorization header format');
      }

      const token = authHeader.substring(authHeader.indexOf(' ') + 1);
      return { token };
    }

    throw new Error(`Unknown action: ${action}`);
  }
};
