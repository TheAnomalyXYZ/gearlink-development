import { useState } from 'react';
import { RangeSelector } from 'gearlink-ds';
import '../preview-kit/admin.module.css';
import { AdminStage } from '../preview-kit/frames';

/** The 7 / 30 / 90 day window picker. Click to switch. */
export const Window = () => {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  return (
    <AdminStage>
      <RangeSelector range={range} onChange={setRange} />
    </AdminStage>
  );
};
