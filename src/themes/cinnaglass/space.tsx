// space.tsx — 空间 switcher opened from the minimap. Visual floor-plan of the
// world's rooms; tap a room to go there (updates meRoom + binds its lighting).
// Reuses the .modal.mini glass shell (ScreenStyles, always mounted).
import { IClose, IHeart, IMapPin, ISun } from './icons';
import { ROOM_ICONS } from './rooms';
import type { Profile, Room } from './model';

const SPACE_TINT: Record<string, string> = {
    living: 'linear-gradient(150deg,#FCE5C0,#F6C98C)',
    bedroom: 'linear-gradient(150deg,#C9D2F2,#9AA6E0)',
    balcony: 'linear-gradient(150deg,#BFE6FA,#86C9E8)',
    studio: 'linear-gradient(150deg,#CFEAC9,#94CDA2)'
};
const SPACE_MOODLBL: Record<string, string> = { golden: '黄昏光', twilight: '暮色光', night: '夜灯' };

const SpaceStyles = () => (
    <style>{`
  .sp-hint{font-size:12px;color:var(--glass-sub);margin:0 2px 14px;display:flex;align-items:center;gap:7px;}
  .sp-hint .ic{display:inline-flex;color:var(--accent-deep);}
  .sp-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;}
  .sp-card{position:relative;border-radius:20px;padding:15px;cursor:pointer;overflow:hidden;
    min-height:144px;display:flex;flex-direction:column;justify-content:space-between;color:#fff;
    border:1px solid rgba(255,255,255,.4);
    box-shadow:0 8px 22px -10px rgba(20,29,51,.5), inset 0 1px 0 rgba(255,255,255,.35);
    transition:transform .2s cubic-bezier(.3,.7,.4,1), box-shadow .2s, filter .2s;}
  .sp-card:hover{transform:translateY(-3px);filter:saturate(1.06) brightness(1.03);
    box-shadow:0 14px 30px -10px rgba(20,29,51,.55), inset 0 1px 0 rgba(255,255,255,.35);}
  .sp-card:active{transform:translateY(-1px) scale(.98);}
  .sp-card.cur{box-shadow:0 0 0 2.5px var(--accent), 0 0 26px 2px var(--glass-glow), 0 8px 22px -10px rgba(20,29,51,.5);}
  .sp-card .glow{position:absolute;inset:0;background:radial-gradient(120% 90% at 80% 0%,rgba(255,255,255,.4),transparent 60%);pointer-events:none;}
  .sp-top{display:flex;align-items:flex-start;justify-content:space-between;position:relative;z-index:1;}
  .sp-ic{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;
    background:rgba(255,255,255,.26);box-shadow:inset 0 0 0 1px rgba(255,255,255,.4);}
  .sp-who{display:flex;}
  .sp-who .m{width:26px;height:26px;border-radius:50%;margin-left:-9px;display:grid;place-items:center;
    color:#fff;font-size:10px;font-weight:700;border:2px solid rgba(255,255,255,.85);
    box-shadow:0 3px 7px -2px rgba(20,29,51,.4);}
  .sp-who .m:first-child{margin-left:0;}
  .sp-b{position:relative;z-index:1;}
  .sp-nm{font-size:18px;font-weight:800;letter-spacing:.02em;text-shadow:0 1px 6px rgba(20,29,51,.28);
    display:flex;align-items:center;gap:7px;}
  .sp-note{font-size:11.5px;font-weight:500;opacity:.92;margin-top:4px;line-height:1.45;
    text-shadow:0 1px 5px rgba(20,29,51,.25);
    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
  .sp-mood{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:600;opacity:.92;
    background:rgba(255,255,255,.2);border-radius:99px;padding:3px 8px;margin-top:8px;}
  .sp-here-tag{position:absolute;top:13px;right:13px;z-index:2;font-size:10px;font-weight:800;letter-spacing:.04em;
    color:var(--accent-deep);background:#fff;border-radius:99px;padding:4px 9px;
    box-shadow:0 3px 9px -3px rgba(20,29,51,.4);display:flex;align-items:center;gap:4px;}
  `}</style>
);

export function SpaceScreen({
    open,
    onClose,
    rooms,
    meRoom,
    enterSpace,
    profile
}: {
    open: boolean;
    onClose: () => void;
    rooms: Room[];
    meRoom: string;
    enterSpace: (r: Room) => void;
    profile: Profile;
}) {
    const herName = profile.her || '她',
        meName = profile.me || '我';
    const herRoom = 'living';
    const peopleIn = (rid: string) => {
        const out: { id: string; ini: string; color: string }[] = [];
        if (herRoom === rid) out.push({ id: 'her', ini: herName.slice(0, 1), color: 'linear-gradient(135deg,#F8C8D6,#EF9DB4)' });
        if (meRoom === rid) out.push({ id: 'me', ini: meName.slice(0, 1), color: 'linear-gradient(135deg,#FCD9A0,#F1B45A)' });
        return out;
    };

    return (
        <>
            <SpaceStyles />
            <div className={`modal-scrim ${open ? 'show' : ''}`} onClick={onClose} />
            <div className={`modal mini glass ${open ? 'show' : ''}`} aria-hidden={!open}>
                <div className="modal-hd">
                    <span className="si" style={{ background: 'var(--accent-grad)' }}>
                        <IMapPin size={18} />
                    </span>
                    <h2>空间</h2>
                    <button className="modal-x" onClick={onClose} aria-label="关闭">
                        <IClose size={17} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="sp-hint">
                        <span className="ic">
                            <IMapPin size={14} />
                        </span>
                        轻点一个房间，就一起过去呀
                    </div>
                    <div className="sp-grid">
                        {rooms.map((r) => {
                            const RI = ROOM_ICONS[r.icon] || IMapPin;
                            const ppl = peopleIn(r.id);
                            const isCur = r.id === meRoom;
                            return (
                                <div
                                    key={r.id}
                                    className={`sp-card ${isCur ? 'cur' : ''}`}
                                    style={{ background: SPACE_TINT[r.id] || 'linear-gradient(150deg,#CDE3F2,#9FC2DC)' }}
                                    onClick={() => enterSpace(r)}
                                >
                                    <span className="glow" />
                                    {isCur && (
                                        <span className="sp-here-tag">
                                            <IHeart size={10} fill="currentColor" sw={0} />
                                            你在这里
                                        </span>
                                    )}
                                    <div className="sp-top">
                                        <span className="sp-ic">
                                            <RI size={22} />
                                        </span>
                                        {ppl.length > 0 && (
                                            <span className="sp-who">
                                                {ppl.map((pp) => (
                                                    <span key={pp.id} className="m" style={{ background: pp.color }}>
                                                        {pp.ini}
                                                    </span>
                                                ))}
                                            </span>
                                        )}
                                    </div>
                                    <div className="sp-b">
                                        <div className="sp-nm">{r.name}</div>
                                        <div className="sp-note">{r.note}</div>
                                        <span className="sp-mood">
                                            <ISun size={11} />
                                            {SPACE_MOODLBL[r.mood] || '光线'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}