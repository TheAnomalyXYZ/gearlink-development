import { ChartCard, LineChart } from 'gearlink-ds';
import '../preview-kit/admin.module.css';
import { AdminStage } from '../preview-kit/frames';

const DAYS = ['Oct 1', 'Oct 2', 'Oct 3', 'Oct 4', 'Oct 5', 'Oct 6', 'Oct 7'];

/** Daily active users over a week, in the default green. */
export const DailyActive = () => (
  <AdminStage>
    <ChartCard label="Daily active users">
      <LineChart
        data={DAYS.map((label, i) => ({ label, value: [412, 468, 455, 530, 610, 588, 702][i]! }))}
      />
    </ChartCard>
  </AdminStage>
);

/** A percentage series with its own colour and suffix. */
export const WinRate = () => (
  <AdminStage>
    <ChartCard label="Run win rate (%)">
      <LineChart
        data={DAYS.map((label, i) => ({ label, value: [38, 41, 40, 44, 47, 45, 49][i]! }))}
        color="#06b6d4"
        suffix="%"
      />
    </ChartCard>
  </AdminStage>
);

/** Fewer than two points draws the empty state. */
export const NoData = () => (
  <AdminStage>
    <ChartCard label="Daily active users">
      <LineChart data={[]} />
    </ChartCard>
  </AdminStage>
);
