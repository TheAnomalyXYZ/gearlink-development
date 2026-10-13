import { BarChart, ChartCard } from 'gearlink-ds';
import '../preview-kit/admin.module.css';
import { AdminStage } from '../preview-kit/frames';

const DAYS = ['Oct 1', 'Oct 2', 'Oct 3', 'Oct 4', 'Oct 5', 'Oct 6', 'Oct 7'];

/** New players per day, in the default blue. */
export const NewPlayers = () => (
  <AdminStage>
    <ChartCard label="New players">
      <BarChart
        data={DAYS.map((label, i) => ({ label, value: [64, 81, 57, 92, 120, 103, 140][i]! }))}
      />
    </ChartCard>
  </AdminStage>
);

/** Two series: runs started, with runs won drawn inside. */
export const StartedAndWon = () => (
  <AdminStage>
    <ChartCard label="Runs: started (amber) and won (green)">
      <BarChart
        data={DAYS.map((label, i) => ({
          label,
          value: [880, 940, 910, 1020, 1180, 1105, 1290][i]!,
          inner: [334, 385, 364, 449, 555, 497, 632][i]!,
        }))}
        color="#f59e0b"
        innerColor="#22c55e"
      />
    </ChartCard>
  </AdminStage>
);
