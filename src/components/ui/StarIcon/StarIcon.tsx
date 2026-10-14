interface StarIconProps {
  filled?: boolean;
  className?: string;
}

// Original vector outline from the user-provided xingxing (3).eps artwork.
const roundedStarPath = "M673.848 87.734C677.164 68.277 682.84 47.921 678.676 30.847C671.809 2.706 637.996-7.341 613.465 5.538L427.215 103.359C411.957 111.374 403.52 110.159 388.582 102.234L216.535 10.898C195.586-.223 173.004-2.911 152.891 9.675C139.438 22.784 136.215 39.105 139.41 57.226L178.117 276.749 8.059 447.402C-2.039 457.534-1.48 478.472 3.375 488.409C8.91 499.749 18.992 513.968 34.477 516.374L268.332 552.644 367.617 754.902C376.328 772.644 388.949 782.175 407.641 783.409C426.469 784.655 442.254 773.187 450.875 755.511L515.613 622.902 553.145 551.73 775.871 518.202C795.309 515.273 811.031 505.765 816.227 490.362C822.934 470.464 818.227 451.995 802.961 437.148L773.434 408.429 745.652 380.644 717.898 352.902 690.082 325.081 665.402 300.999 641.844 275.495 673.855 87.726Z";

export function StarIcon({ filled = false, className = "" }: StarIconProps) {
  return <svg className={`rounded-star ${filled ? "is-filled" : ""} ${className}`.trim()} viewBox="0 0 820 785" aria-hidden="true" focusable="false"><g transform="translate(0 784) scale(1 -1)"><path d={roundedStarPath} /></g></svg>;
}

interface StarRatingProps {
  value?: number;
  className?: string;
}

export function StarRating({ value = 0, className = "" }: StarRatingProps) {
  const normalized = Math.max(0, Math.min(5, Math.round(value)));
  return <span className={`rounded-star-rating ${className}`.trim()} aria-hidden="true">{[1, 2, 3, 4, 5].map((star) => <StarIcon key={star} filled={star <= normalized} />)}</span>;
}
