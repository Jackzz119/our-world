// calendar.tsx — real Calendar (约会 / 纪念日) + Clock·Alarm screens.
// Reuse the .modal shell from screens.tsx (ScreenStyles is always mounted).
import { useState, type Dispatch, type SetStateAction } from 'react';
import { ICalendar, IChevron, IClock, IClose, ICloud, IHeart, IPlus, IRain, ISnow, ISun } from './icons';
import type { Alarm, CalEvent, Weather } from './model';

const ANNIV = { m: 5, d: 4, year: 2025 }; // 在一起：2025.6.4
const WK = ['日', '一', '二', '三', '四', '五', '六'];
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const CalClockStyles = () => (
    <style>{`
  /* shared modal sizing for calendar/clock (a touch narrower than the book) */
  .modal.mini{width:min(520px,calc(100vw - 32px));height:min(660px,calc(100vh - 56px));}

  /* ── calendar ── */
  .cal-anniv{display:flex;align-items:center;gap:14px;border-radius:18px;padding:15px 17px;margin-bottom:16px;}
  .cal-anniv .ring{width:54px;height:54px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;
    color:#fff;background:radial-gradient(120% 120% at 30% 25%,#F8C8D6,#EF9DB4);box-shadow:0 6px 14px -5px rgba(239,157,180,.7);}
  .cal-anniv .ct{flex:1;}
  .cal-anniv .ct .l{font-size:11px;letter-spacing:.14em;color:var(--glass-sub);font-weight:600;}
  .cal-anniv .ct .n{font-size:15px;font-weight:700;margin-top:3px;}
  .cal-anniv .big{font-family:"Baloo 2",sans-serif;font-size:34px;font-weight:700;line-height:1;color:var(--accent-deep);}
  .cal-anniv .big small{font-size:13px;color:var(--glass-sub);font-weight:600;margin-left:3px;}

  .cal-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
  .cal-nav .mlabel{font-size:16px;font-weight:700;}
  .cal-nav button{appearance:none;border:1px solid var(--glass-border);background:var(--glass-bg-2);color:var(--glass-text);
    width:32px;height:32px;border-radius:50%;display:grid;place-items:center;cursor:pointer;transition:background .2s,transform .15s;}
  .cal-nav button:hover{background:var(--glass-hi);}
  .cal-nav button:active{transform:scale(.9);}
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
  .cal-wk{text-align:center;font-size:11px;color:var(--glass-sub);font-weight:600;padding:4px 0 6px;}
  .cal-cell{aspect-ratio:1;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-size:13.5px;font-weight:500;color:var(--glass-text);position:relative;cursor:pointer;border:1.5px solid transparent;
    transition:background .16s,border-color .16s,transform .14s;}
  .cal-cell.blank{cursor:default;}
  .cal-cell:not(.blank):hover{background:var(--glass-bg-2);}
  .cal-cell.today{background:linear-gradient(135deg,#9FD6F4,#5FB0E2);color:#0d2336;font-weight:700;}
  .cal-cell.sel{border-color:var(--accent-deep);}
  .cal-cell.anniv{color:#E76A8A;font-weight:700;}
  .cal-cell .dots{display:flex;gap:3px;margin-top:3px;height:5px;}
  .cal-cell .dots i{width:5px;height:5px;border-radius:50%;}
  .cal-cell .dots .ev{background:#7CC6EC;}
  .cal-cell .dots .an{background:#EF9DB4;}
  .cal-cell.today .dots i{background:#0d2336;}

  .cal-add{display:flex;gap:9px;margin:16px 0 6px;}
  .cal-add input{flex:1;height:44px;border-radius:var(--r-pill);border:1px solid var(--glass-border);
    background:var(--glass-bg-2);color:var(--glass-text);padding:0 16px;font:inherit;font-size:14px;outline:none;}
  .cal-add input:focus{border-color:var(--accent);background:var(--glass-hi);}
  .cal-add input::placeholder{color:var(--glass-sub);}
  .cal-add .day{display:flex;align-items:center;padding:0 14px;height:44px;border-radius:var(--r-pill);
    background:var(--glass-hi);font-size:13px;font-weight:600;color:var(--accent-deep);white-space:nowrap;flex:0 0 auto;}
  .cal-add button{width:44px;height:44px;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;color:#fff;
    background:radial-gradient(120% 120% at 30% 25%,#BFE6FA,#7CC6EC 46%,#4FA9DC);flex:0 0 auto;
    box-shadow:0 5px 14px -5px rgba(79,169,220,.6);transition:transform .18s;}
  .cal-add button:hover{transform:scale(1.06);}
  .cal-add button:disabled{opacity:.45;}

  .cal-sec{font-size:11px;letter-spacing:.12em;color:var(--glass-sub);font-weight:600;margin:18px 0 9px;}
  .ev-row{display:flex;align-items:center;gap:12px;border-radius:14px;padding:11px 14px;margin-bottom:9px;}
  .ev-row .dt{width:46px;flex:0 0 auto;text-align:center;}
  .ev-row .dt .d{font-family:"Baloo 2",sans-serif;font-size:20px;font-weight:700;line-height:1;color:var(--accent-deep);}
  .ev-row .dt .mo{font-size:10px;color:var(--glass-sub);font-weight:600;margin-top:2px;}
  .ev-row .et{flex:1;font-size:14px;font-weight:600;}
  .ev-row .cd{font-size:11px;color:var(--glass-sub);font-weight:600;white-space:nowrap;}
  .ev-row .del{appearance:none;border:0;background:transparent;color:var(--glass-sub);cursor:pointer;padding:4px;border-radius:8px;opacity:.6;}
  .ev-row .del:hover{opacity:1;color:#E76A8A;}

  /* ── clock ── */
  .clock-face{text-align:center;padding:14px 0 22px;}
  .clock-face .big{font-family:"Baloo 2",sans-serif;font-size:74px;font-weight:700;line-height:1;letter-spacing:.01em;
    color:var(--glass-text);}
  .clock-face .big .s{font-size:32px;color:var(--glass-sub);margin-left:4px;}
  .clock-face .sub{font-size:13.5px;color:var(--glass-sub);font-weight:600;margin-top:10px;display:flex;
    align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;}
  .clock-face .wx{display:inline-flex;align-items:center;gap:6px;color:var(--accent-deep);}
  .alarm-sec{font-size:11px;letter-spacing:.12em;color:var(--glass-sub);font-weight:600;margin:6px 0 10px;}
  .alarm{display:flex;align-items:center;gap:13px;border-radius:15px;padding:13px 15px;margin-bottom:10px;}
  .alarm .at{font-family:"Baloo 2",sans-serif;font-size:26px;font-weight:700;line-height:1;color:var(--glass-text);}
  .alarm.off .at{opacity:.4;}
  .alarm .body{flex:1;}
  .alarm .lab{font-size:13px;font-weight:600;margin-top:3px;color:var(--glass-sub);}
  .alarm .del{appearance:none;border:0;background:transparent;color:var(--glass-sub);cursor:pointer;padding:4px;border-radius:8px;opacity:.55;}
  .alarm .del:hover{opacity:1;color:#E76A8A;}
  .alarm-add{display:flex;gap:9px;margin-top:6px;align-items:center;}
  .alarm-add input[type=time]{height:44px;border-radius:14px;border:1px solid var(--glass-border);background:var(--glass-bg-2);
    color:var(--glass-text);padding:0 12px;font:inherit;font-size:15px;font-family:"Baloo 2",sans-serif;outline:none;}
  .alarm-add input[type=text]{flex:1;height:44px;border-radius:var(--r-pill);border:1px solid var(--glass-border);
    background:var(--glass-bg-2);color:var(--glass-text);padding:0 16px;font:inherit;font-size:14px;outline:none;}
  .alarm-add input:focus{border-color:var(--accent);background:var(--glass-hi);}
  .alarm-add button{width:44px;height:44px;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;color:#fff;
    background:radial-gradient(120% 120% at 30% 25%,#BFE6FA,#7CC6EC 46%,#4FA9DC);flex:0 0 auto;
    box-shadow:0 5px 14px -5px rgba(79,169,220,.6);transition:transform .18s;}
  .alarm-add button:hover{transform:scale(1.06);}
  `}</style>
);

/* ════════ CALENDAR ════════ */
export function CalendarScreen({
    open,
    onClose,
    events,
    setEvents
}: {
    open: boolean;
    onClose: () => void;
    events: CalEvent[];
    setEvents: Dispatch<SetStateAction<CalEvent[]>>;
}) {
    const today = new Date();
    const tY = today.getFullYear(),
        tM = today.getMonth(),
        tD = today.getDate();
    const [cur, setCur] = useState({ y: tY, m: tM });
    const [sel, setSel] = useState<string | null>(null);
    const [title, setTitle] = useState('');

    const first = new Date(cur.y, cur.m, 1).getDay();
    const days = new Date(cur.y, cur.m + 1, 0).getDate();
    const monthLabel = `${cur.y} 年 ${cur.m + 1} 月`;

    const evByDate: Record<string, CalEvent[]> = {};
    events.forEach((e) => {
        (evByDate[e.date] = evByDate[e.date] || []).push(e);
    });

    const nextAnniv = () => {
        let y = tY;
        let dn = new Date(y, ANNIV.m, ANNIV.d);
        if (dn < new Date(tY, tM, tD)) dn = new Date(++y, ANNIV.m, ANNIV.d);
        const diff = Math.round((dn.getTime() - new Date(tY, tM, tD).getTime()) / 864e5);
        return { diff, y };
    };
    const { diff: annivDiff, y: annivYear } = nextAnniv();
    const yearsTogether = annivYear - ANNIV.year;

    const move = (d: number) =>
        setCur((c) => {
            let m = c.m + d,
                y = c.y;
            if (m < 0) {
                m = 11;
                y--;
            }
            if (m > 11) {
                m = 0;
                y++;
            }
            return { y, m };
        });

    const addEvent = () => {
        if (!sel || !title.trim()) return;
        const next = [...events, { id: 'e' + Date.now(), date: sel, title: title.trim() }];
        setEvents(next);
        setTitle('');
    };
    const delEvent = (id: string) => setEvents(events.filter((e) => e.id !== id));

    const upcoming = [...events].filter((e) => e.date >= ymd(tY, tM, tD)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
    const cntdown = (dstr: string) => {
        const [y, m, d] = dstr.split('-').map(Number);
        const diff = Math.round((new Date(y, m - 1, d).getTime() - new Date(tY, tM, tD).getTime()) / 864e5);
        return diff === 0 ? '今天' : diff === 1 ? '明天' : `${diff} 天后`;
    };

    const cells = [];
    for (let i = 0; i < first; i++) cells.push(<div key={'b' + i} className="cal-cell blank" />);
    for (let d = 1; d <= days; d++) {
        const ds = ymd(cur.y, cur.m, d);
        const isToday = cur.y === tY && cur.m === tM && d === tD;
        const isAnniv = cur.m === ANNIV.m && d === ANNIV.d;
        const evs = evByDate[ds];
        cells.push(
            <div
                key={ds}
                className={`cal-cell ${isToday ? 'today' : ''} ${isAnniv ? 'anniv' : ''} ${sel === ds ? 'sel' : ''}`}
                onClick={() => setSel(ds)}
            >
                {d}
                <div className="dots">
                    {isAnniv && <i className="an" />}
                    {evs && <i className="ev" />}
                </div>
            </div>
        );
    }

    return (
        <>
            <CalClockStyles />
            <div className={`modal-scrim ${open ? 'show' : ''}`} onClick={onClose} />
            <div className={`modal mini glass ${open ? 'show' : ''}`} aria-hidden={!open}>
                <div className="modal-hd">
                    <span className="si" style={{ background: 'linear-gradient(135deg,#D8C2F0,#A98FD6)' }}>
                        <ICalendar size={19} />
                    </span>
                    <h2>日历 · 约会</h2>
                    <button className="modal-x" onClick={onClose} aria-label="关闭">
                        <IClose size={17} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="cal-anniv glass">
                        <span className="ring">
                            <IHeart size={24} fill="#fff" sw={0} />
                        </span>
                        <div className="ct">
                            <div className="l">距下一个纪念日</div>
                            <div className="n">
                                在一起满 {yearsTogether} 周年 · {annivYear}.6.4
                            </div>
                        </div>
                        <div className="big">
                            {annivDiff}
                            <small>天</small>
                        </div>
                    </div>

                    <div className="cal-nav">
                        <button onClick={() => move(-1)} aria-label="上个月">
                            <IChevron size={18} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <span className="mlabel">{monthLabel}</span>
                        <button onClick={() => move(1)} aria-label="下个月">
                            <IChevron size={18} />
                        </button>
                    </div>
                    <div className="cal-grid">
                        {WK.map((w) => (
                            <div key={w} className="cal-wk">
                                {w}
                            </div>
                        ))}
                        {cells}
                    </div>

                    <div className="cal-add">
                        <span className="day">{sel ? sel.slice(5).replace('-', '/') : '选日期'}</span>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addEvent()}
                            placeholder="添加一个约会…"
                        />
                        <button onClick={addEvent} disabled={!sel || !title.trim()} aria-label="添加">
                            <IPlus size={20} />
                        </button>
                    </div>

                    <div className="cal-sec">即将到来的约会</div>
                    {upcoming.length === 0 && (
                        <div style={{ color: 'var(--glass-sub)', fontSize: 12.5, textAlign: 'center', padding: '10px 0' }}>
                            还没有计划，点日期添加一个吧 ·
                        </div>
                    )}
                    {upcoming.map((e) => {
                        const [, m, d] = e.date.split('-');
                        return (
                            <div className="ev-row glass" key={e.id}>
                                <div className="dt">
                                    <div className="d">{Number(d)}</div>
                                    <div className="mo">{Number(m)} 月</div>
                                </div>
                                <div className="et">{e.title}</div>
                                <div className="cd">{cntdown(e.date)}</div>
                                <button className="del" onClick={() => delEvent(e.id)} aria-label="删除">
                                    <IClose size={15} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

/* ════════ CLOCK · ALARM ════════ */
export function ClockScreen({
    open,
    onClose,
    nowTs,
    weather,
    alarms,
    setAlarms
}: {
    open: boolean;
    onClose: () => void;
    nowTs: number;
    weather: Weather;
    alarms: Alarm[];
    setAlarms: Dispatch<SetStateAction<Alarm[]>>;
}) {
    const d = new Date(nowTs);
    const hh = pad(d.getHours()),
        mm = pad(d.getMinutes()),
        ss = pad(d.getSeconds());
    const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    const dateStr = `${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${wd}`;
    const [atime, setAtime] = useState('07:30');
    const [alabel, setAlabel] = useState('');

    const WIcon = weather.kind === 'sun' ? ISun : weather.kind === 'rain' ? IRain : weather.kind === 'snow' ? ISnow : ICloud;

    const toggle = (id: string) => setAlarms(alarms.map((a) => (a.id === id ? { ...a, on: !a.on } : a)));
    const del = (id: string) => setAlarms(alarms.filter((a) => a.id !== id));
    const add = () => {
        if (!atime) return;
        setAlarms(
            [...alarms, { id: 'a' + Date.now(), time: atime, label: alabel.trim() || '提醒', on: true }].sort((a, b) =>
                a.time.localeCompare(b.time)
            )
        );
        setAlabel('');
    };

    return (
        <>
            <CalClockStyles />
            <div className={`modal-scrim ${open ? 'show' : ''}`} onClick={onClose} />
            <div className={`modal mini glass ${open ? 'show' : ''}`} aria-hidden={!open}>
                <div className="modal-hd">
                    <span className="si" style={{ background: 'linear-gradient(135deg,#BFE6FA,#6FBCE8)' }}>
                        <IClock size={19} />
                    </span>
                    <h2>时间 · 闹钟</h2>
                    <button className="modal-x" onClick={onClose} aria-label="关闭">
                        <IClose size={17} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="clock-face">
                        <div className="big num">
                            {hh}:{mm}
                            <span className="s">{ss}</span>
                        </div>
                        <div className="sub">
                            <span>{dateStr}</span>
                            <span className="wx">
                                <WIcon size={16} />
                                {weather.label} {weather.temp}°{weather.place ? ` · ${weather.place}` : ''}
                            </span>
                        </div>
                    </div>

                    <div className="alarm-sec">闹钟与提醒</div>
                    {alarms.map((a) => (
                        <div className={`alarm glass ${a.on ? '' : 'off'}`} key={a.id}>
                            <span className="at num">{a.time}</span>
                            <div className="body">
                                <div className="lab">{a.label}</div>
                            </div>
                            <span className={`sw ${a.on ? 'on' : ''}`} onClick={() => toggle(a.id)}>
                                <i />
                            </span>
                            <button className="del" onClick={() => del(a.id)} aria-label="删除">
                                <IClose size={16} />
                            </button>
                        </div>
                    ))}
                    <div className="alarm-add">
                        <input type="time" value={atime} onChange={(e) => setAtime(e.target.value)} />
                        <input
                            type="text"
                            value={alabel}
                            onChange={(e) => setAlabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && add()}
                            placeholder="提醒内容…"
                        />
                        <button onClick={add} aria-label="添加闹钟">
                            <IPlus size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}