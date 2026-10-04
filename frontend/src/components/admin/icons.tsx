import type { SVGProps } from "react";

/**
 * Bộ icon nét mảnh dùng trong khu quản trị. Vẽ tay bằng SVG để không phải thêm
 * thư viện icon cho vài hình.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19" />
      <circle cx="9" cy="7" r="3.25" />
      <path d="M22 19v-1.5a4 4 0 0 0-3-3.87" />
      <path d="M16.5 4.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2.75 4.75 5.5v6c0 4.37 3 7.86 7.25 9.75 4.25-1.89 7.25-5.38 7.25-9.75v-6L12 2.75Z" />
      <path d="m9.25 11.75 1.9 1.9 3.6-3.6" />
    </Icon>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 12.3V5.2a1.7 1.7 0 0 1 1.7-1.7h7.1c.45 0 .88.18 1.2.5l6 6a1.7 1.7 0 0 1 0 2.4l-7.1 7.1a1.7 1.7 0 0 1-2.4 0l-6-6a1.7 1.7 0 0 1-.5-1.2Z" />
      <circle cx="8.25" cy="8.25" r="1.25" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="10" width="16" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 1 1 8 0V10" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m14.5 5-7 7 7 7" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9.5 5 7 7-7 7" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.25" />
      <path d="m16 16 4 4" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.75" />
    </Icon>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18.5 14.5V18a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 18V8A2.5 2.5 0 0 1 6 5.5h3.5" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 9 7 7 7-7" />
    </Icon>
  );
}

/** Icon bật/tắt sidebar: khung trang với cột trái được tô đậm. */
export function PanelLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 14.5a1.5 1.5 0 0 0 .3 1.65l.05.05a1.8 1.8 0 1 1-2.55 2.55l-.05-.05a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37V20a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-1-1.37 1.5 1.5 0 0 0-1.65.3l-.05.05a1.8 1.8 0 1 1-2.55-2.55l.05-.05a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9H4a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1.37-1 1.5 1.5 0 0 0-.3-1.65l-.05-.05a1.8 1.8 0 1 1 2.55-2.55l.05.05a1.5 1.5 0 0 0 1.65.3h.07a1.5 1.5 0 0 0 .9-1.37V4a1.8 1.8 0 1 1 3.6 0v.1a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.05-.05a1.8 1.8 0 1 1 2.55 2.55l-.05.05a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.9H20a1.8 1.8 0 1 1 0 3.6h-.1a1.5 1.5 0 0 0-1.37.9Z" />
    </Icon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5" />
      <path d="M10 8.5 13.5 12 10 15.5" />
      <path d="M13.5 12H4" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 2.5 20h19L12 3.5Z" />
      <path d="M12 10v4" />
      <path d="M12 17.25h.01" />
    </Icon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 6.5h11.5M8.5 12h11.5M8.5 17.5h11.5" />
      <path d="M4 6.5h.01M4 12h.01M4 17.5h.01" />
    </Icon>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20h4L19.5 8.5a2.12 2.12 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 6.5 3 3" />
    </Icon>
  );
}

export function LoginIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3.5" />
      <path d="M14 8.5 17.5 12 14 15.5" />
      <path d="M17.5 12H8" />
    </Icon>
  );
}

export function UserPlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M18.5 7.5v5M21 10h-5" />
    </Icon>
  );
}

export function NewspaperIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 5.5h12.5v13H5.5a1.5 1.5 0 0 1-1.5-1.5V5.5Z" />
      <path d="M16.5 9H19a1 1 0 0 1 1 1v7a1.5 1.5 0 0 1-3 0V9Z" />
      <path d="M7 9h6.5M7 12.5h6.5M7 16h4" />
    </Icon>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m3.5 7 7.4 5.3a2 2 0 0 0 2.2 0L20.5 7" />
    </Icon>
  );
}

export function PaperclipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.5 3.5 0 0 1 5 5L10.2 17.3a2 2 0 0 1-2.8-2.8l7.8-7.8" />
    </Icon>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </Icon>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.3h8.6a1.5 1.5 0 0 0 1.5-1.2L20 8H6" />
      <circle cx="9.5" cy="19.5" r="1.25" />
      <circle cx="17" cy="19.5" r="1.25" />
    </Icon>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </Icon>
  );
}

export function PlayCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.75v6.5a.6.6 0 0 0 .9.52l5.4-3.25a.6.6 0 0 0 0-1.04l-5.4-3.25a.6.6 0 0 0-.9.52Z" />
    </Icon>
  );
}

export function ImagesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="15" height="13" rx="2" />
      <circle cx="8" cy="9.5" r="1.5" />
      <path d="m3 15.5 4-3.5 3.5 3 3-2.5 4.5 4" />
      <path d="M21 8v10a3 3 0 0 1-3 3H7" />
    </Icon>
  );
}

export function DocumentTextIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Icon>
  );
}

export function SlidersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h10M18 6h2M4 12h3M11 12h9M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </Icon>
  );
}
