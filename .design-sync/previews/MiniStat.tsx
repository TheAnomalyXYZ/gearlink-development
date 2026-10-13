import { MiniStat } from 'gearlink-ds';
import '../preview-kit/admin.module.css';
import { AdminStage } from '../preview-kit/frames';

/** Small label + value tiles. */
export const Grid = () => (
  <AdminStage>
    <div className="grid grid-cols-4 gap-2">
      <MiniStat label="Runs" value="7,325" />
      <MiniStat label="Wins" value="3,216 · 44%" />
      <MiniStat label="Duels" value="992" />
      <MiniStat label="Packs opened" value="1,408" />
    </div>
  </AdminStage>
);
