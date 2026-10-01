import { Hono } from 'hono';
import { postDailyOnce } from '../core/daily.js';

export const scheduler = new Hono();

/** Fired by the `dailyGauntlet` cron in devvit.json at 00:00 UTC. */
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
