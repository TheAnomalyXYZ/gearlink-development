import assert from 'node:assert/strict';
import test from 'node:test';
import {
  QUESTS,
  questById,
  questPeriodKey,
  questResetAt,
  questStatus,
  rewardLabel,
  runQuestEvents,
  sortQuestStatuses,
} from './quests.js';
import { packById } from './economy.js';

void test('quest ids are unique and every reward resolves', () => {
  const ids = QUESTS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const q of QUESTS) {
    assert.ok(q.target > 0, q.id + ' has no target');
    if (q.reward.kind === 'pack')
      assert.ok(packById(q.reward.packId), q.id + ' pays an unknown pack');
    else assert.ok(q.reward.amount > 0, q.id + ' pays nothing');
  }
  assert.equal(questById('d_battles')?.metric, 'battles');
  assert.equal(questById('nope'), null);
});

void test('the daily capstone asks for fewer dailies than exist to claim', () => {
  const cap = QUESTS.find((q) => q.metric === 'dailies')!;
  const others = QUESTS.filter(
    (q) => q.period === 'daily' && q.metric !== 'dailies'
  ).length;
  assert.ok(cap.target <= others);
});

void test('days roll at UTC midnight and weeks on Monday', () => {
  // 2026-09-23 is a Wednesday.
  const wed = Date.UTC(2026, 8, 23, 15, 30);
  const sunLate = Date.UTC(2026, 8, 27, 23, 59);
  const mon = Date.UTC(2026, 8, 28, 0, 0);
  assert.equal(questResetAt('daily', wed), Date.UTC(2026, 8, 24));
  assert.equal(questResetAt('weekly', wed), mon);
  assert.equal(
    questPeriodKey('weekly', wed),
    questPeriodKey('weekly', sunLate)
  );
  assert.notEqual(
    questPeriodKey('weekly', sunLate),
    questPeriodKey('weekly', mon)
  );
  assert.notEqual(questPeriodKey('daily', wed), questPeriodKey('daily', mon));
  assert.equal(questResetAt('weekly', mon), Date.UTC(2026, 9, 5));
});

void test('status caps progress and only a finished, unpaid quest is claimable', () => {
  const q = questById('d_battles')!;
  const over = questStatus(q, { metrics: { battles: 9 }, claimed: [] });
  assert.equal(over.progress, q.target);
  assert.equal(over.claimable, true);
  const paid = questStatus(q, { metrics: { battles: 9 }, claimed: [q.id] });
  assert.equal(paid.claimable, false);
  assert.equal(paid.claimed, true);
  const short = questStatus(q, { metrics: { battles: 1 }, claimed: [] });
  assert.equal(short.claimable, false);
});

void test('the board sorts claimable, then in progress, then done', () => {
  const daily = QUESTS.filter((q) => q.period === 'daily');
  const sorted = sortQuestStatuses(
    daily.map((q) =>
      questStatus(q, {
        metrics: { packs: 1, wins: 2 },
        claimed: ['d_packs'],
      })
    )
  );
  assert.equal(sorted[0]!.def.id, 'd_wins');
  assert.equal(sorted[sorted.length - 1]!.def.id, 'd_packs');
});

void test('a run reports only what it actually did', () => {
  const lost = runQuestEvents({
    won: false,
    king: false,
    waves: 0,
    chain: 0,
    coins: 0,
  });
  assert.deepEqual(lost, [{ metric: 'battles', amount: 1 }]);
  const king = runQuestEvents({
    won: true,
    king: true,
    waves: 5,
    chain: 9,
    coins: 140,
  });
  assert.deepEqual(
    king.map((e) => e.metric),
    ['battles', 'wins', 'kings', 'waves', 'chain', 'coins']
  );
});

void test('reward labels read as the wallet does', () => {
  assert.equal(rewardLabel({ kind: 'coins', amount: 60 }), '+60 coins');
  assert.equal(rewardLabel({ kind: 'gems', amount: 5 }), '+5 gems');
  assert.equal(rewardLabel({ kind: 'pack', packId: 'bronze' }), 'BRONZE PACK');
});
