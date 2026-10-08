import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post.js';
import { postDailyOnce } from '../core/daily.js';
import { postWarChestOnce } from '../core/warchest.js';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/daily-post', async (c) => {
  try {
    const result = await postDailyOnce();
    if (!result.postId)
      return c.json<UiResponse>(
        { showToast: "Today's Daily Battle is already being posted" },
        200
      );
    return c.json<UiResponse>(
      {
        showToast:
          result.status === 'created'
            ? "Today's Daily Battle is up"
            : "Today's Daily Battle is already up",
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${result.postId}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating daily post: ${error}`);
    return c.json<UiResponse>(
      { showToast: 'Failed to post the Daily Battle' },
      400
    );
  }
});

menu.post('/warchest-post', async (c) => {
  try {
    const result = await postWarChestOnce();
    if (!result.postId)
      return c.json<UiResponse>(
        { showToast: "This week's War Chest is already being posted" },
        200
      );
    return c.json<UiResponse>(
      {
        showToast:
          result.status === 'created'
            ? "This week's War Chest is up"
            : "This week's War Chest is already up",
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${result.postId}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating war chest post: ${error}`);
    return c.json<UiResponse>(
      { showToast: 'Failed to post the War Chest' },
      400
    );
  }
});
