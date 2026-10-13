import { useState } from 'react';
import { Toggle } from 'gearlink-ds';
import '../preview-kit/admin.module.css';
import { AdminStage } from '../preview-kit/frames';

/** A generic segmented toggle. Click to switch. */
export const Currency = () => {
  const [v, setV] = useState<'gold' | 'gems'>('gold');
  return (
    <AdminStage>
      <Toggle
        value={v}
        options={[
          ['gold', 'Reddit Gold'],
          ['gems', 'Gems'],
        ]}
        onChange={setV}
      />
    </AdminStage>
  );
};
