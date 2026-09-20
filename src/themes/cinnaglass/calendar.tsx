// calendar.tsx — real Calendar (约会 / 纪念日) + Clock·Alarm screens.
// Both screens use the shared task dialog and keep their existing local data.
import { TaskDialog } from '@/themes/cinnaglass/ui/task-dialog';
import '@/themes/cinnaglass/task-surfaces.css';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { IChevron, IClose, ICloud, IHeart, IPlus, IRain, ISnow, ISun } from '@/themes/cinnaglass/icons';
import type { Alarm, CalEvent, Weather } from '@/themes/cinnaglass/model';
import { daysUntilAnniversary, parseAnniv } from '@/themes/cinnaglass/profile';

const WK = ['日', '一', '二', '三', '四', '五', '六'];
// Local-calendar date key, 'yyyy-mm-dd' — the shape CalEvent.date and
// worlds.anniversary both use.
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/* ════════ CALENDAR ════════ */
// Calendar modal: month grid, add-a-date row, and the next six upcoming events.
// Events live in the caller's state and are persisted there, not here.
export function CalendarScreen({
    open,
    onClose,
    anniv,
    events,
    setEvents
}: {
    open: boolean;
    onClose: () => void;
    /** anniversary date, yyyy-mm-dd — worlds.anniversary as WorldPage composes
     *  it (DB row first, local profile as the offline fallback); null when
     *  neither has one, and then the card degrades to a prompt */
    anniv: string | null;
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

    // The anniversary, straight off the world row. Countdown comes from the
    // shared date math; the year the next recurrence lands in is that countdown
    // walked forward from today, which is also how many years it will make.
    const annivDate = parseAnniv(anniv);
    const annivDiff = daysUntilAnniversary(anniv);
    const annivYear = new Date(tY, tM, tD + annivDiff).getFullYear();
    const yearsTogether = annivDate ? annivYear - annivDate.getFullYear() : 0;

    // Step one month, rolling the year.
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

    const upcoming = [...events]
        .filter((e) => e.date >= ymd(tY, tM, tD))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6);
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
        const isAnniv = !!annivDate && cur.m === annivDate.getMonth() && d === annivDate.getDate();
        const evs = evByDate[ds];
        cells.push(
            <button
                type="button"
                aria-label={`${ds}${isAnniv ? '，纪念日' : ''}${evs ? `，${evs.length} 个约会` : ''}`}
                aria-pressed={sel === ds}
                aria-current={isToday ? 'date' : undefined}
                key={ds}
                className={`cal-cell ${isToday ? 'today' : ''} ${isAnniv ? 'anniv' : ''} ${sel === ds ? 'sel' : ''}`}
                onClick={() => setSel(ds)}
            >
                {d}
                <div className="dots">
                    {isAnniv && <i className="an" />}
                    {evs && <i className="ev" />}
                </div>
            </button>
        );
    }

    return (
        <TaskDialog
            open={open}
            onClose={onClose}
            title="日历 · 约会"
            className="calendar-task"
            description="选择日期，留下一起期待的事。约会仅保存在当前浏览器。"
        >
            <div className="task-content">
                <div className="cal-anniv">
                    <span className="ring">
                        <IHeart size={24} fill="#fff" sw={0} />
                    </span>
                    {annivDate ? (
                        <>
                            <div className="ct">
                                <div className="l">距下一个纪念日</div>
                                <div className="n">
                                    在一起满 {yearsTogether} 周年 · {annivYear}.{annivDate.getMonth() + 1}.
                                    {annivDate.getDate()}
                                </div>
                            </div>
                            <div className="big">
                                {annivDiff}
                                <small>天</small>
                            </div>
                        </>
                    ) : (
                        <div className="ct">
                            <div className="l">纪念日</div>
                            <div className="n">还没有设置纪念日</div>
                        </div>
                    )}
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
                        aria-label="约会内容"
                        placeholder="添加一个约会…"
                    />
                    <button onClick={addEvent} disabled={!sel || !title.trim()} aria-label="添加">
                        <IPlus size={20} />
                    </button>
                </div>

                <div className="cal-sec">即将到来的约会</div>
                {upcoming.length === 0 && (
                    <div
                        style={{
                            color: 'var(--ui-muted)',
                            fontSize: 12.5,
                            textAlign: 'center',
                            padding: '10px 0'
                        }}
                    >
                        还没有计划，点日期添加一个吧 ·
                    </div>
                )}
                {upcoming.map((e) => {
                    const [, m, d] = e.date.split('-');
                    return (
                        <div className="ev-row" key={e.id}>
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
        </TaskDialog>
    );
}

/* ════════ CLOCK · ALARM ════════ */
// Clock and alarm modal. nowTs is ticked by the caller so this stays a pure
// render; alarms are display-only today — nothing fires them yet.
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

    const WIcon =
        weather.kind === 'sun' ? ISun : weather.kind === 'rain' ? IRain : weather.kind === 'snow' ? ISnow : ICloud;

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
        <TaskDialog
            open={open}
            onClose={onClose}
            title="时间 · 提醒"
            className="clock-task"
            description="提醒仅保存为本机列表，目前不会响铃或发送通知。"
        >
            <div className="task-content">
                <div className="clock-face">
                    <div className="big num">
                        {hh}:{mm}
                        <span className="s">{ss}</span>
                    </div>
                    <div className="sub">
                        <span>{dateStr}</span>
                        <span className="wx">
                            <WIcon size={16} />
                            {weather.label} {weather.temp == null ? '—' : `${weather.temp}°`}
                            {weather.place ? ` · ${weather.place}` : ''}
                        </span>
                    </div>
                </div>

                <div className="alarm-sec">提醒列表 · 不会通知</div>
                {alarms.map((a) => (
                    <div className={`alarm ${a.on ? '' : 'off'}`} key={a.id}>
                        <span className="at num">{a.time}</span>
                        <div className="body">
                            <div className="lab">{a.label}</div>
                        </div>
                        <button
                            type="button"
                            className="alarm-toggle"
                            aria-pressed={a.on}
                            aria-label={`${a.label}：${a.on ? '已标记' : '未标记'}`}
                            onClick={() => toggle(a.id)}
                        >
                            {a.on ? '已标记' : '未标记'}
                        </button>
                        <button className="del" onClick={() => del(a.id)} aria-label="删除">
                            <IClose size={16} />
                        </button>
                    </div>
                ))}
                <div className="alarm-add">
                    <input aria-label="提醒时间" type="time" value={atime} onChange={(e) => setAtime(e.target.value)} />
                    <input
                        type="text"
                        value={alabel}
                        onChange={(e) => setAlabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && add()}
                        aria-label="提醒内容"
                        placeholder="提醒内容…"
                    />
                    <button onClick={add} aria-label="添加提醒">
                        <IPlus size={20} />
                    </button>
                </div>
            </div>
        </TaskDialog>
    );
}
