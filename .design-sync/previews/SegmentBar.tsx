import { SegmentBar } from 'gearlink-ds';
import '../preview-kit/admin.module.css';
import { AdminStage } from '../preview-kit/frames';

/** Hero picks as one proportional bar; colours are Tailwind bg classes. */
export const HeroPicks = () => (
  <AdminStage>
    <SegmentBar
      label="Hero picks for runs (7d)"
      segments={[
        { legend: 'Hero', value: 3120, color: 'bg-blue-600' },
        { legend: 'Archer', value: 2480, color: 'bg-emerald-600' },
        { legend: 'Mage', value: 1795, color: 'bg-purple-600' },
      ]}
    />
  </AdminStage>
);

/** A small slice drops its percentage label but keeps its legend. */
export const SmallSlice = () => (
  <AdminStage>
    <SegmentBar
      label="Duels by type (7d)"
      segments={[
        { legend: 'Ranked', value: 940, color: 'bg-purple-600' },
        { legend: 'Friendly', value: 52, color: 'bg-blue-600' },
      ]}
    />
  </AdminStage>
);

/** All zeros draws the empty state. */
export const NoData = () => (
  <AdminStage>
    <SegmentBar label="Hero picks for runs (7d)" segments={[]} />
  </AdminStage>
);
