import { BarChart, ChartCard, LineChart } from 'gearlink-ds';
import '../preview-kit/admin.module.css';
import { AdminStage } from '../preview-kit/frames';

const DAYS = ['Oct 1', 'Oct 2', 'Oct 3', 'Oct 4', 'Oct 5', 'Oct 6', 'Oct 7'];

/** The labelled panel every dashboard chart sits in, two to a row. */
export const Grid = () => (
  <AdminStage>
    <div className="grid grid-cols-2 gap-3">
      <ChartCard label="Daily active users">
        <LineChart data={DAYS.map((label, i) => ({ label, value: [412, 468, 455, 530, 610, 588, 702][i]! }))} />
      </ChartCard>
      <ChartCard label="Reddit Gold orders">
        <BarChart data={DAYS.map((label, i) => ({ label, value: [3, 5, 2, 6, 9, 4, 11][i]! }))} color="#eab308" />
      </ChartCard>
    </div>
  </AdminStage>
);
