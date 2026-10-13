import { KpiCard } from 'gearlink-ds';
import '../preview-kit/admin.module.css';
import { AdminStage } from '../preview-kit/frames';

/** Headline numbers with the change since the previous window. */
export const Row = () => (
  <AdminStage>
    <div className="grid grid-cols-3 gap-2">
      <KpiCard label="Daily active users" value={702} prev={588} />
      <KpiCard label="Run win rate" value={45} prev={49} suffix="%" />
      <KpiCard label="Gold orders" value={11} />
    </div>
  </AdminStage>
);
