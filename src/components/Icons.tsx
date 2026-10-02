import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const s = (size = 18, r: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...r,
});

export const IHeart = ({ size, ...r }: P) => (
  <svg {...s(size, r)}><path d="M12 20.3s-7.8-4.6-7.8-10.4A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.8 2.5c0 5.8-7.8 10.4-7.8 10.4z" /></svg>
);
export const IHeartFill = ({ size, ...r }: P) => (
  <svg {...s(size, r)}><path fill="currentColor" d="M12 20.3s-7.8-4.6-7.8-10.4A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.8 2.5c0 5.8-7.8 10.4-7.8 10.4z" /></svg>
);
export const IPlus = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M12 5v14M5 12h14" /></svg>);
export const IClose = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M6 6l12 12M18 6L6 18" /></svg>);
export const ISearch = ({ size, ...r }: P) => (<svg {...s(size, r)}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>);
export const IMusic = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></svg>);
export const IImage = ({ size, ...r }: P) => (<svg {...s(size, r)}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M20.5 16l-5-5-8.5 8.5" /></svg>);
export const IPin = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.2" /></svg>);
export const IArrowL = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>);
export const IArrowR = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const IArrowDown = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M12 5v14M6 13l6 6 6-6" /></svg>);
export const ITrash = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.5h9.4L17.5 7" /></svg>);
export const ISettings = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>);
export const IUpload = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M12 16V4M7 9l5-5 5 5M4 16v3.5h16V16" /></svg>);
export const IPlay = ({ size, ...r }: P) => (<svg {...s(size, r)}><path fill="currentColor" d="M8 5.5v13l10.5-6.5z" /></svg>);
export const ILink = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>);
export const ISpark = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M12 3c.5 5 2.5 8 9 9-6.5 1-8.5 4-9 9-.5-5-2.5-8-9-9 6.5-1 8.5-4 9-9z" /></svg>);
export const IExternal = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M14 4h6v6M20 4l-9 9M18 14v5.5H4.5V6H10" /></svg>);
export const ILock = ({ size, ...r }: P) => (<svg {...s(size, r)}><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /></svg>);
export const IEdit = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" /></svg>);
export const IEye = ({ size, ...r }: P) => (<svg {...s(size, r)}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></svg>);
