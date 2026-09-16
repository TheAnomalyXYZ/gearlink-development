import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'GearLink Battle - link your gear, break the wave',
  });
};
