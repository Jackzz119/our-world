// icons.jsx — soft rounded line icons. Stroke inherits currentColor.
const Ico = ({ d, size = 20, sw = 1.8, fill = "none", children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {d ? <path d={d} /> : children}
  </svg>
);

const IHeart = (p) => <Ico {...p} d="M12 20s-7-4.5-9.3-9C1.2 8 2.6 4.7 5.8 4.5 8 4.4 9.3 5.6 12 8c2.7-2.4 4-3.6 6.2-3.5 3.2.2 4.6 3.5 3.1 6.5C19 15.5 12 20 12 20z" />;
const IClock = (p) => <Ico {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></Ico>;
const INote = (p) => <Ico {...p}><path d="M7 3.5h7L18.5 8v11.2c0 .7-.6 1.3-1.3 1.3H7c-.7 0-1.3-.6-1.3-1.3V4.8C5.7 4.1 6.3 3.5 7 3.5z" /><path d="M13.5 3.6V8H18M8.5 12.5h7M8.5 16h5" /></Ico>;
const IPhoto = (p) => <Ico {...p}><rect x="3.5" y="5" width="17" height="14" rx="2.6" /><circle cx="9" cy="10" r="1.7" /><path d="M5 17l4.2-4 2.6 2.4L15 12l4 4.5" /></Ico>;
const IPlus = (p) => <Ico {...p} sw={2.2} d="M12 5.5v13M5.5 12h13" />;
const ISun = (p) => <Ico {...p}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" /></Ico>;
const IDusk = (p) => <Ico {...p}><path d="M3.5 16h17" /><path d="M6.5 16a5.5 5.5 0 0111 0" /><path d="M12 4v2M4.6 7.6l1.4 1.4M19.4 7.6L18 9M2.5 19.5h19" /></Ico>;
const IMoon = (p) => <Ico {...p} d="M20 14.2A8 8 0 119.8 4 6.4 6.4 0 0020 14.2z" />;
const ICloud = (p) => <Ico {...p} d="M7 18h9.5a3.5 3.5 0 00.4-7 5 5 0 00-9.6-1.2A3.8 3.8 0 007 18z" />;
const IMapPin = (p) => <Ico {...p}><path d="M12 21s6-5.3 6-10.2A6 6 0 006 10.8C6 15.7 12 21 12 21z" /><circle cx="12" cy="10.5" r="2.2" /></Ico>;
const IChevron = (p) => <Ico {...p} d="M9 6l6 6-6 6" />;
const IClose = (p) => <Ico {...p} sw={2} d="M6 6l12 12M18 6L6 18" />;
const ISparkle = (p) => <Ico {...p} d="M12 4l1.7 4.6L18 10l-4.3 1.4L12 16l-1.7-4.6L6 10l4.3-1.4L12 4z" />;
const ICalendar = (p) => <Ico {...p}><rect x="4" y="5.5" width="16" height="14.5" rx="2.4" /><path d="M4 9.5h16M8.5 3.5v3.5M15.5 3.5v3.5" /></Ico>;
const IThermo = (p) => <Ico {...p}><path d="M10 13.5V5.5a2 2 0 014 0v8a3.5 3.5 0 11-4 0z" /></Ico>;
const IChat = (p) => <Ico {...p} d="M5 5.5h14a1.5 1.5 0 011.5 1.5v8.5a1.5 1.5 0 01-1.5 1.5H10l-4 3.5V17H5a1.5 1.5 0 01-1.5-1.5V7A1.5 1.5 0 015 5.5z" />;
const ISend = (p) => <Ico {...p}><path d="M4.5 12L20 4.5l-4.2 15-3.6-6.2L4.5 12z" /><path d="M12.2 13.3L20 4.5" /></Ico>;
const IExpand = (p) => <Ico {...p}><path d="M9 4.5H4.5V9M15 4.5h4.5V9M9 19.5H4.5V15M15 19.5h4.5V15" /></Ico>;
const IShrink = (p) => <Ico {...p}><path d="M4.5 8.5H9V4M19.5 8.5H15V4M4.5 15.5H9V20M19.5 15.5H15V20" /></Ico>;
const ISmile = (p) => <Ico {...p}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 14.5a4.2 4.2 0 007 0" /><path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.2" /></Ico>;
const IGrid = (p) => <Ico {...p}><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></Ico>;
const IWand = (p) => <Ico {...p}><path d="M15 6l3 3M5 19l9.5-9.5 1.8 1.8L7 21l-2.5.5L5 19z" /><path d="M17 3l.6 1.6L19 5l-1.4.7L17 7l-.6-1.3L15 5l1.4-.4L17 3zM20 9l.4 1.1L21.5 10.5l-1.1.5-.4 1-.4-1-1.1-.5 1.1-.4L20 9z" /></Ico>;
const IBell = (p) => <Ico {...p}><path d="M6.5 16V11a5.5 5.5 0 0111 0v5l1.5 2H5l1.5-2z" /><path d="M10 18.5a2 2 0 004 0" /></Ico>;
const IRain = (p) => <Ico {...p}><path d="M7 14h9.5a3.5 3.5 0 00.4-7 5 5 0 00-9.6-1.2A3.8 3.8 0 007 14z" /><path d="M8.5 17l-1 2.5M12 17l-1 2.5M15.5 17l-1 2.5" /></Ico>;
const ISnow = (p) => <Ico {...p}><path d="M7 13h9.5a3.5 3.5 0 00.4-7 5 5 0 00-9.6-1.2A3.8 3.8 0 007 13z" /><path d="M9 17h.01M12 19h.01M15 17h.01M10.5 20h.01M13.5 20h.01" strokeWidth="2.2" /></Ico>;
const ILock = (p) => <Ico {...p}><rect x="5" y="10.5" width="14" height="9.5" rx="2.4" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /></Ico>;
const IDate = (p) => <Ico {...p}><rect x="4" y="5.5" width="16" height="14.5" rx="2.4" /><path d="M4 9.5h16M8.5 3.5v3.5M15.5 3.5v3.5" /><circle cx="12" cy="14.5" r="1.6" fill="currentColor" sw={0} /></Ico>;
const IMove = (p) => <Ico {...p}><path d="M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5" /></Ico>;
const IUsers = (p) => <Ico {...p}><circle cx="9" cy="8" r="3.1" /><path d="M3.4 19a5.6 5.6 0 0111.2 0" /><path d="M16 5.3a3 3 0 010 5.4M16.8 13.4a5.6 5.6 0 013.8 5.6" /></Ico>;
const ICog = (p) => <Ico {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2.6l1.3 2.2 2.5-.5.4 2.5 2.3 1-.9 2.4 1.7 1.9-1.7 1.9.9 2.4-2.3 1-.4 2.5-2.5-.5L12 21.4l-1.3-2.2-2.5.5-.4-2.5-2.3-1 .9-2.4L4.6 12l1.8-1.9-.9-2.4 2.3-1 .4-2.5 2.5.5L12 2.6z" /></Ico>;
const IKey = (p) => <Ico {...p}><circle cx="8" cy="15" r="3.5" /><path d="M10.5 12.5L20 3M16.5 6.5l2.2 2.2M14 9l2 2" /></Ico>;
const IShield = (p) => <Ico {...p}><path d="M12 3.2l7 2.6v5.3c0 4.4-3 7.7-7 9.7-4-2-7-5.3-7-9.7V5.8l7-2.6z" /><path d="M9 12l2.2 2.2L15.4 10" /></Ico>;
const IUser = (p) => <Ico {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5 20a7 7 0 0114 0" /></Ico>;
const IPaint = (p) => <Ico {...p}><path d="M12 3a9 9 0 00-1 17.94c.9.1 1.5-.6 1.5-1.4 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-.9.7-1.6 1.6-1.6h1.9A4.5 4.5 0 0021 11 8.7 8.7 0 0012 3z" /><circle cx="7.5" cy="11" r="1.1" fill="currentColor" sw={0} /><circle cx="12" cy="7.8" r="1.1" fill="currentColor" sw={0} /><circle cx="16.5" cy="11" r="1.1" fill="currentColor" sw={0} /></Ico>;
const ICheck = (p) => <Ico {...p} sw={2.2} d="M5 12.5l4.5 4.5L19 6.5" />;
const IPencil = (p) => <Ico {...p}><path d="M14.5 5.5l4 4M4 20l1-4L16 5a2 2 0 013 3L8 19l-4 1z" /></Ico>;
const IMail = (p) => <Ico {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2.6" /><path d="M4.5 7l7.5 5.5L19.5 7" /></Ico>;
const IHash = (p) => <Ico {...p}><path d="M9 4L7 20M17 4l-2 16M4.5 9h15M3.5 15h15" /></Ico>;
const ISofa = (p) => <Ico {...p}><path d="M5 12V9.5A2.5 2.5 0 017.5 7h9A2.5 2.5 0 0119 9.5V12" /><path d="M4.5 12A1.5 1.5 0 016 13.5V16h12v-2.5A1.5 1.5 0 0119.5 12 1.5 1.5 0 0121 13.5V18a.8.8 0 01-.8.8H3.8A.8.8 0 013 18v-4.5A1.5 1.5 0 014.5 12z" /><path d="M6.5 20v-1.2M17.5 20v-1.2" /></Ico>;
const IBed = (p) => <Ico {...p}><path d="M3.5 18v-8M20.5 18v-4a3 3 0 00-3-3H3.5M3 14.5h17.5M7 11V9.4A1.4 1.4 0 018.4 8h2.2A1.4 1.4 0 0112 9.4V11" /></Ico>;
const ILeaf = (p) => <Ico {...p}><path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14z" /><path d="M5 19C8 15.5 12 12.5 16 10.5" /></Ico>;
const IBook = (p) => <Ico {...p}><path d="M5 4.6A1.6 1.6 0 016.6 3H19v15H6.6A1.6 1.6 0 005 19.6" /><path d="M5 4.6v15A1.6 1.6 0 006.6 21H19v-3" /></Ico>;
const IMic = (p) => <Ico {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M9 21h6" /></Ico>;
const IMicOff = (p) => <Ico {...p}><path d="M15 6a3 3 0 00-6 0v3M9 12.2A3 3 0 0014 11M5.5 11a6.5 6.5 0 009.8 5.6M12 17.5V21M9 21h6M4 4l16 16" /></Ico>;
const IVolume = (p) => <Ico {...p}><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4z" /><path d="M15.5 9a4 4 0 010 6" /></Ico>;
const IMute = (p) => <Ico {...p}><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4z" /><path d="M16 9.5l4 5M20 9.5l-4 5" /></Ico>;
const IPlay = (p) => <Ico {...p} sw={0} fill="currentColor"><path d="M8 5.2c0-.6.6-.9 1.1-.6l9.4 6.2c.5.3.5 1 0 1.4l-9.4 6.2c-.5.3-1.1 0-1.1-.6V5.2z" /></Ico>;
const IPause = (p) => <Ico {...p} sw={0} fill="currentColor"><rect x="6.5" y="4.5" width="4" height="15" rx="1.4" /><rect x="13.5" y="4.5" width="4" height="15" rx="1.4" /></Ico>;
const ISkipF = (p) => <Ico {...p} sw={0} fill="currentColor"><path d="M5 6c0-.6.6-.9 1.1-.6l7 5c.5.3.5 1 0 1.3l-7 5C5.6 22 5 21.6 5 21V6z" transform="translate(0 -1.5)" /><rect x="15" y="4.5" width="3.2" height="15" rx="1.2" /></Ico>;
const ISkipB = (p) => <Ico {...p} sw={0} fill="currentColor"><path d="M19 6c0-.6-.6-.9-1.1-.6l-7 5c-.5.3-.5 1 0 1.3l7 5c.5.4 1.1 0 1.1-.6V6z" transform="translate(0 -1.5)" /><rect x="5.8" y="4.5" width="3.2" height="15" rx="1.2" /></Ico>;
const IMusic = (p) => <Ico {...p}><path d="M9 17.5V6.2l9-2v9.1" /><circle cx="6.4" cy="17.6" r="2.6" /><circle cx="15.4" cy="15.3" r="2.6" /></Ico>;
const IHeadset = (p) => <Ico {...p}><path d="M5 13v-1a7 7 0 0114 0v1" /><rect x="3.5" y="13" width="3.6" height="6" rx="1.6" /><rect x="16.9" y="13" width="3.6" height="6" rx="1.6" /></Ico>;

Object.assign(window, {
  Ico, IHeart, IClock, INote, IPhoto, IPlus, ISun, IDusk, IMoon,
  ICloud, IMapPin, IChevron, IClose, ISparkle, ICalendar, IThermo,
  IChat, ISend, IExpand, IShrink, ISmile, IGrid, IWand,
  IBell, IRain, ISnow, ILock, IDate, IMove, IUsers,
  ICog, IKey, IShield, IUser, IPaint, ICheck, IPencil, IMail,
  IHash, ISofa, IBed, ILeaf, IBook, IMic, IMicOff, IVolume,
  IMute, IPlay, IPause, ISkipF, ISkipB, IMusic, IHeadset,
});
