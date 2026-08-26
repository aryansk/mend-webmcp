import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LogoMark(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 5.5h5.5L13 8l-2.5 2.5L8 8H5v3.5l2.5 2.5L5 16.5V19" />
      <path d="M19 5.5h-5.5L11 8l2.5 2.5L16 8h3v3.5l-2.5 2.5 2.5 2.5V19" />
      <path d="M9.5 12h5" />
    </IconBase>
  );
}

export function ArrowUpRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </IconBase>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

export function Check(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12 4.5 4.5L19 7" />
    </IconBase>
  );
}

export function CheckCircle(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12 2.25 2.25L15.75 9" />
    </IconBase>
  );
}

export function AlertTriangle(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 4 8 15H4L12 4Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </IconBase>
  );
}

export function Gauge(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 15a7.5 7.5 0 1 1 15 0" />
      <path d="m12 12 3.5-3.5" />
      <path d="M7.5 18h9" />
    </IconBase>
  );
}

export function ShieldCheck(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 19 6v5.25c0 4.2-2.75 7.45-7 9.25-4.25-1.8-7-5.05-7-9.25V6l7-2.5Z" />
      <path d="m8.75 12 2.1 2.1 4.4-4.4" />
    </IconBase>
  );
}

export function Search(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="10.75" cy="10.75" r="5.75" />
      <path d="m15 15 4.5 4.5" />
    </IconBase>
  );
}

export function GitBranch(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="6" cy="5" r="2" />
      <circle cx="18" cy="19" r="2" />
      <circle cx="6" cy="19" r="2" />
      <path d="M6 7v10" />
      <path d="M8 5h2a4 4 0 0 1 4 4v4a4 4 0 0 0 4 4" />
    </IconBase>
  );
}

export function Sparkle(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.25 4.75L18 9l-4.75 1.25L12 15l-1.25-4.75L6 9l4.75-1.25L12 3Z" />
      <path d="m19 14 .6 2.4L22 17l-2.4.6L19 20l-.6-2.4L16 17l2.4-.6L19 14Z" />
    </IconBase>
  );
}

export function Activity(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </IconBase>
  );
}

export function Clock(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.25 2" />
    </IconBase>
  );
}

export function ExternalLink(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 5h5v5" />
      <path d="m19 5-8 8" />
      <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    </IconBase>
  );
}

export function Link2(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10 13.5a4 4 0 0 0 5.75.25l2-2a4 4 0 0 0-5.65-5.65l-1.15 1.15" />
      <path d="M14 10.5a4 4 0 0 0-5.75-.25l-2 2a4 4 0 0 0 5.65 5.65l1.15-1.15" />
    </IconBase>
  );
}

export function Code2(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m8 8-4 4 4 4" />
      <path d="m16 8 4 4-4 4" />
      <path d="m14 5-4 14" />
    </IconBase>
  );
}

export function Menu(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </IconBase>
  );
}

export function X(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </IconBase>
  );
}
