import { Table } from 'gearlink-ds';
import '../preview-kit/admin.module.css';
import { AdminStage } from '../preview-kit/frames';

/** Plain data table; numbers right-aligned and formatted. */
export const Rows = () => (
  <AdminStage>
    <Table
      head={['Location', 'Runs', 'Wins', 'Win %']}
      rows={[
        ['Forest', 2410, 1688, '70%'],
        ['Bridge', 1802, 991, '55%'],
        ['Caves', 1255, 502, '40%'],
        ['Ghost Town', 830, 249, '30%'],
      ]}
    />
  </AdminStage>
);

/** No rows in the window. */
export const Empty = () => (
  <AdminStage>
    <Table head={['SKU', 'Orders', 'Gold']} rows={[]} />
  </AdminStage>
);
