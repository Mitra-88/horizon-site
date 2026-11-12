import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const Icons = {
  summary: (props: IconProps) => (
    <Icon {...props}>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </Icon>
  ),
  metadata: (props: IconProps) => (
    <Icon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </Icon>
  ),
  gpu: (props: IconProps) => (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </Icon>
  ),
  spans: (props: IconProps) => (
    <Icon {...props}>
      <path d="M10 2h4" />
      <path d="m12 14 3-3" />
      <circle cx="12" cy="14" r="8" />
    </Icon>
  ),
  ticks: (props: IconProps) => (
    <Icon {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Icon>
  ),
  world: (props: IconProps) => (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </Icon>
  ),
  net: (props: IconProps) => (
    <Icon {...props}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" />
    </Icon>
  ),
  memory: (props: IconProps) => (
    <Icon {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </Icon>
  ),
  bench: (props: IconProps) => (
    <Icon {...props}>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </Icon>
  ),
  marks: (props: IconProps) => (
    <Icon {...props}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </Icon>
  ),
  warnings: (props: IconProps) => (
    <Icon {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </Icon>
  ),
  hot: (props: IconProps) => (
    <Icon {...props}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </Icon>
  ),
  tree: (props: IconProps) => (
    <Icon {...props}>
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <rect x="3" y="16" width="6" height="6" rx="1" />
      <rect x="15" y="16" width="6" height="6" rx="1" />
      <path d="M12 8v4M6 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    </Icon>
  ),
  compare: (props: IconProps) => (
    <Icon {...props}>
      <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" />
    </Icon>
  ),
  chart: (props: IconProps) => (
    <Icon {...props}>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-6 4 3 4-7" />
    </Icon>
  ),
  close: (props: IconProps) => (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  ),
  code: (props: IconProps) => (
    <Icon {...props}>
      <polyline points="4 17 10 11 4 5" />
      <path d="M12 19h8" />
    </Icon>
  ),
  chevronRight: (props: IconProps) => (
    <Icon {...props}>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  ),
  chevronDown: (props: IconProps) => (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  ),
  info: (props: IconProps) => (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Icon>
  ),
  copy: (props: IconProps) => (
    <Icon {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </Icon>
  ),
  check: (props: IconProps) => (
    <Icon {...props}>
      <path d="m5 12 5 5 9-10" />
    </Icon>
  ),
};
