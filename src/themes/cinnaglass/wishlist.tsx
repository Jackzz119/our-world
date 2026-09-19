// wishlist.tsx — the 心愿单 surface body. Still a local-only mock, so the row
// list, its seed and its localStorage slice all live here; nothing about it is
// shared with the other surfaces. Bodies moved out of screens.tsx verbatim.
import { useEffect, useState } from 'react';
import { loadJson as load, saveJson as save } from '@/lib/local-store';
import { IHeart, IPlus } from '@/themes/cinnaglass/icons';

type Wish = { id: string; text: string; done: boolean };

// Seed list for a first-time visitor. The wishlist is still local-only.
const SEED_WISHES: Wish[] = [
    { id: 'w1', text: '一起去看一次海上日出', done: true },
    { id: 'w2', text: '学会做对方家乡的一道菜', done: true },
    { id: 'w3', text: '看一场流星雨', done: false },
    { id: 'w4', text: '养一盆能活过一年的植物', done: false },
    { id: 'w5', text: '去一次没去过的城市，不做攻略', done: false }
];

// Wishlist — still a local-only mock (localStorage 'ow-wishes-v1'); it has no
// backend table yet, so nothing here is shared between the two members.
export function Wishlist() {
    // Own the mock's state and its localStorage write: this surface stays
    // mounted for the whole session, exactly as it did inside SubScreen.
    const [wishes, setWishes] = useState<Wish[]>(() => load('ow-wishes-v1', SEED_WISHES));
    useEffect(() => save('ow-wishes-v1', wishes), [wishes]);
    const [val, setVal] = useState('');
    const done = wishes.filter((w) => w.done).length;
    const pct = wishes.length ? Math.round((done / wishes.length) * 100) : 0;
    const toggle = (id: string) => setWishes((ws) => ws.map((w) => (w.id === id ? { ...w, done: !w.done } : w)));
    const add = () => {
        const v = val.trim();
        if (!v) return;
        setWishes((ws) => [...ws, { id: 'w' + Date.now(), text: v, done: false }]);
        setVal('');
    };
    return (
        <div>
            <div className="wl-bar">
                <div className="wl-prog">
                    <i style={{ width: pct + '%' }} />
                </div>
                <div className="wl-count">
                    已实现 <b>{done}</b>/{wishes.length}
                </div>
            </div>
            {wishes.map((w) => (
                <div className={`wish paper ${w.done ? 'done' : ''}`} key={w.id} onClick={() => toggle(w.id)}>
                    <span className="box">{w.done && <IHeart size={13} fill="currentColor" sw={0} />}</span>
                    <span className="wt">{w.text}</span>
                </div>
            ))}
            <div className="wl-add">
                <input
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && add()}
                    placeholder="再许一个一起完成的愿望…"
                />
                <button className="chip-accent" onClick={add} aria-label="添加">
                    <IPlus size={20} />
                </button>
            </div>
            <div className="empty-hint">慢慢来，我们有的是时间 ·</div>
        </div>
    );
}
