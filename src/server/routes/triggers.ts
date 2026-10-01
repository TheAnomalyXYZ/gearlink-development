import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { postDailyOnce } from '../core/daily.js';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    // The first post a sub sees is today's gauntlet; the scheduler takes it
    // from there, once a day.
    const result = await postDailyOnce();
    const input = await c.req.json<OnAppInstallRequest>();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Post created in subreddit ${context.subredditName} with id ${result.postId ?? 'pending'} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create post',
      },
      400
    );
  }
});
