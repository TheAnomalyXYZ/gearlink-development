import { Hono } from 'hono';
import { postDailyOnce } from '../core/daily.js';
import { postWarChestOnce } from '../core/warchest.js';

export const scheduler = new Hono();

/** Fired by the `dailyBattle` cron in devvit.json at 00:00 UTC. */
scheduler.post('/daily-post', async (c) => {
  try {
    const result = await postDailyOnce();
    console.log(`[scheduler/daily-post] ${JSON.stringify(result)}`);
    return c.json(result, 200);
  } catch (error) {
    console.error(`[scheduler/daily-post] failed: ${error}`);
    return c.json({ status: 'error' }, 500);
  }
});

/** Fired by the `warChest` cron in devvit.json at Monday 00:05 UTC, just
 *  after the old chest empties. */
scheduler.post('/warchest-post', async (c) => {
  try {
    const result = await postWarChestOnce();
    console.log(`[scheduler/warchest-post] ${JSON.stringify(result)}`);
    return c.json(result, 200);
  } catch (error) {
    console.error(`[scheduler/warchest-post] failed: ${error}`);
    return c.json({ status: 'error' }, 500);
  }
});
