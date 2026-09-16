/**
 * Devvit payments fulfilment.
 *
 * This is the ONLY place gems come into existence. Reddit takes the money and
 * then calls these endpoints; the client is never in the loop, so it can neither
 * grant itself gems nor tell the server which bundle it "bought" - the SKU comes
 * off the order.
 *
 * Both handlers are idempotent on the order id. Reddit may retry a delivery, and
 * a retry must not pay out twice.
 */
import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import type {
  PaymentHandlerRequest,
  PaymentHandlerResponse,
} from '@devvit/payments/shared';
import { gemsForSku } from '../../shared/engine/economy.js';
import { loadProfile, saveProfile } from '../core/profile.js';

export const paymentsRoutes = new Hono();

/**
 * Orders already paid out, as orderId -> userId.
 *
 * `hSetNX` is what makes the claim safe: it returns 1 only for the caller that
 * created the field, so two concurrent retries cannot both win it. (`set` with
 * `nx` would read more naturally, but Devvit types it as always returning a
 * string, which leaves nothing to branch on.)
 *
 * There is deliberately no expiry. An order id must never become payable again,
 * and one field per real purchase is a cost worth carrying for that.
 */
const FULFILLED = 'orders:fulfilled';

const gemsInOrder = (order: PaymentHandlerRequest): number => {
  let total = 0;
  for (const product of order.products ?? []) {
    const gems = gemsForSku(product.sku);
    // An unknown SKU is a catalogue we do not recognise. Refusing is right:
    // paying out a guess is worse than failing the delivery and being retried.
    if (gems === null) return -1;
    total += gems;
  }
  return total;
};

paymentsRoutes.post('/fulfill', async (c) => {
  const { userId } = context;
  const order = await c.req.json<PaymentHandlerRequest>().catch(() => null);
  if (!order?.id)
    return c.json<PaymentHandlerResponse>({
      success: false,
      reason: 'malformed order',
    });
  if (!userId)
    return c.json<PaymentHandlerResponse>({
      success: false,
      reason: 'no user on the order',
    });

  const gems = gemsInOrder(order);
  if (gems < 0)
    return c.json<PaymentHandlerResponse>({
      success: false,
      reason: 'order contains a product this app does not sell',
    });

  // Claim the order before crediting: this is the point of no return, and a
  // concurrent retry finds the field taken and pays out nothing.
  const claimed = await redis.hSetNX(FULFILLED, order.id, userId);
  if (claimed !== 1) {
    // Already delivered. Reporting success is correct - the player has the gems,
    // and reporting failure would invite another retry.
    console.log(`Order ${order.id} was already fulfilled; acknowledging.`);
    return c.json<PaymentHandlerResponse>({ success: true });
  }

  try {
    const profile = await loadProfile(userId, context.username ?? 'anonymous');
    await saveProfile(userId, { gems: profile.gems + gems });
    console.log(`Order ${order.id}: granted ${gems} gems to ${userId}.`);
    return c.json<PaymentHandlerResponse>({ success: true });
  } catch (error) {
    // The claim must not outlive a failed payout, or the retry is refused and
    // the player is charged for nothing.
    await redis.hDel(FULFILLED, [order.id]);
    console.error(`Order ${order.id} failed to fulfill:`, error);
    return c.json<PaymentHandlerResponse>({
      success: false,
      reason: 'could not credit the account',
    });
  }
});

paymentsRoutes.post('/refund', async (c) => {
  const order = await c.req.json<PaymentHandlerRequest>().catch(() => null);
  if (!order?.id)
    return c.json<PaymentHandlerResponse>({
      success: false,
      reason: 'malformed order',
    });

  // The account that was credited, not whoever is holding the session now.
  const paidTo = await redis.hGet(FULFILLED, order.id);
  if (!paidTo) {
    console.log(`Refund for ${order.id}: nothing was ever granted.`);
    return c.json<PaymentHandlerResponse>({ success: true });
  }

  const gems = gemsInOrder(order);
  const profile = await loadProfile(paidTo, 'refund');
  // Gems may already be spent, so the balance floors at zero rather than going
  // negative and silently taxing everything the player buys next.
  await saveProfile(paidTo, {
    gems: Math.max(0, profile.gems - Math.max(0, gems)),
  });
  await redis.hDel(FULFILLED, [order.id]);
  console.log(
    `Refund for ${order.id}: reclaimed up to ${gems} gems from ${paidTo}.`
  );
  return c.json<PaymentHandlerResponse>({ success: true });
});
