/** The ascension crown, shared with Neura Knights so the tier reads the same
 *  in both games. Filled with `color`, scaled to `size` px tall. */
export const AscensionIcon = ({
  size,
  color,
}: {
  size: number;
  color: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={(size * 56) / 57}
    height={size}
    viewBox="0 0 56 57"
    fill="none"
    style={{ display: 'block', filter: 'drop-shadow(0 1px 0 #000)' }}
  >
    <path
      d="M45.1608 25.91L28.5208 0.27C28.2808 -0.09 27.7208 -0.09 27.4808 0.27L10.8408 25.91L0.920822 20.27C0.440822 19.99 -0.119178 20.43 0.00082236 20.95L5.96082 45.07C5.96082 45.07 6.12082 45.39 6.28082 45.47L27.9608 56.31L49.6408 45.47C49.8008 45.39 49.9208 45.23 49.9608 45.07L55.9208 20.95C56.0408 20.43 55.4808 19.99 55.0008 20.27L45.0808 25.91H45.1608Z"
      fill={color}
      stroke="#000"
      strokeWidth="4"
      paintOrder="stroke fill"
    />
  </svg>
);
