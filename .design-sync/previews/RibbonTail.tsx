import { RibbonTail } from 'gearlink-ds';
import '../preview-kit/game.module.css';
import { Stage } from '../preview-kit/frames';

/** The swallowtail ends of a banner ribbon, left and right. */
export const Sides = () => (
  <Stage>
    <div style={{ display: 'flex', gap: 24 }}>
      <RibbonTail side="l" fill="#FF961D" />
      <RibbonTail side="r" fill="#FF961D" />
      <RibbonTail side="l" fill="#6F7C94" />
      <RibbonTail side="r" fill="#6F7C94" />
    </div>
  </Stage>
);
