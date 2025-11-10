import { Concept } from '../engine/types';

export const Following: Concept = {
  state: {
    following: new Map<string, Set<string>>(), // follower -> targets
    followers: new Map<string, Set<string>>(), // target -> followers
    count: new Map<string, number>(),
  },

  async execute(action: string, input: any) {
    const state = this.state;

    if (action === 'follow') {
      const { follower, target } = input;

      if (follower === target) {
        throw new Error('Cannot follow yourself');
      }

      if (!state.following.has(follower)) {
        state.following.set(follower, new Set());
      }
      if (!state.followers.has(target)) {
        state.followers.set(target, new Set());
        state.count.set(target, 0);
      }

      const followingSet = state.following.get(follower)!;
      if (followingSet.has(target)) {
        throw new Error('Already following this user');
      }

      followingSet.add(target);
      const followersSet = state.followers.get(target)!;
      followersSet.add(follower);
      state.count.set(target, followersSet.size);

      return { follower, target };
    }

    if (action === 'unfollow') {
      const { follower, target } = input;

      if (!state.following.has(follower)) {
        throw new Error('Not following this user');
      }

      const followingSet = state.following.get(follower)!;
      if (!followingSet.has(target)) {
        throw new Error('Not following this user');
      }

      followingSet.delete(target);
      const followersSet = state.followers.get(target);
      if (followersSet) {
        followersSet.delete(follower);
        state.count.set(target, followersSet.size);
      }

      return { follower, target };
    }

    if (action === 'isFollowing') {
      const { follower, target } = input;

      if (!state.following.has(follower)) {
        return { following: false };
      }

      const followingSet = state.following.get(follower)!;
      return { following: followingSet.has(target) };
    }

    if (action === 'getFollowing') {
      const { user } = input;
      const following = state.following.get(user) || new Set();
      return { following };
    }

    if (action === 'getFollowers') {
      const { user } = input;
      const followers = state.followers.get(user) || new Set();
      return { followers };
    }

    throw new Error(`Unknown action: ${action}`);
  }
};
