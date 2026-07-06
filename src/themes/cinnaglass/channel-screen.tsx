// channel-screen.tsx — the covering CHAT HUB: opened from the sidebar (text
// channels AND DMs — the sidebar's only chat trigger), it floats over the
// stage so you can chat with the scene tucked away. The sidebar entries are
// summon buttons; once open, the hub's own left column switches between all
// open conversations (current world's text channels + DMs — same set as the
// dock tabs via convsFor). Threads are shared with the in-scene ChatDock —
// same content, different experience; the dock is triggered only from the
// stage (chat button / Enter), never from the sidebar. See ai/Features/chat.md.
import { useEffect, useRef, useState } from 'react';
import { IClose, IHash, ISend } from './icons';
import { TEXT_CHANNELS, convsFor, type Msg } from './chat-data';
import { CONTACTS } from './contacts';

const ChannelStyles = () => (
    <style>{`
  .chsc-scrim{position:absolute;inset:0;z-index:22;background:rgba(14,20,38,.45);
    -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:chscFade .3s ease both;}
  @keyframes chscFade{from{opacity:0}to{opacity:1}}
  .chsc{position:absolute;inset:3% 4%;z-index:23;display:flex;flex-direction:row;overflow:hidden;
    border-radius:24px;animation:chscIn .34s cubic-bezier(.3,.8,.4,1) both;}
  @keyframes chscIn{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion: reduce){.chsc,.chsc-scrim{animation:none}}

  /* left column: conversation switcher (channels of this world + DMs) */
  .chsc-nav{width:188px;flex:0 0 auto;border-right:1px solid var(--glass-border);
    background:linear-gradient(160deg,var(--glass-hi),transparent);
    overflow-y:auto;overflow-x:hidden;padding:12px 9px;}
  .chsc-nav::-webkit-scrollbar{width:5px;}
  .chsc-nav::-webkit-scrollbar-thumb{background:var(--glass-border);border-radius:9px;}
  .chsc-cat{font-size:10.5px;letter-spacing:.15em;font-weight:700;color:var(--glass-sub);
    padding:10px 8px 5px;text-transform:uppercase;}
  .chsc-nav-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:11px;cursor:pointer;
    color:var(--glass-sub);transition:background .16s,color .16s;}
  .chsc-nav-item:hover{background:var(--glass-bg-2);color:var(--glass-text);}
  .chsc-nav-item.on{background:var(--glass-hi);color:var(--glass-text);box-shadow:inset 0 0 0 1px var(--glass-border);}
  .chsc-nav-item .ic{display:inline-flex;flex:0 0 auto;}
  .chsc-nav-item .nm{flex:1;min-width:0;font-size:13.5px;font-weight:600;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .chsc-nav-item .ava-s{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;
    font-size:10px;font-weight:700;border:1.5px solid rgba(255,255,255,.72);flex:0 0 auto;}

  /* right column: the conversation itself */
  .chsc-main{flex:1;min-width:0;display:flex;flex-direction:column;}

  .chsc-hd{display:flex;align-items:center;gap:11px;padding:16px 18px 13px;border-bottom:1px solid var(--glass-border);}
  .chsc-hd .ic{display:inline-flex;color:var(--accent-deep);}
  .chsc-ava{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:#fff;
    font-size:12px;font-weight:700;border:2px solid rgba(255,255,255,.72);
    box-shadow:0 6px 16px -5px rgba(20,29,51,.55);flex:0 0 auto;}
  .chsc-hd h3{margin:0;font-size:16.5px;font-weight:800;color:var(--glass-text);}
  .chsc-hd .topic{flex:1;min-width:0;font-size:12px;color:var(--glass-sub);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .chsc-x{width:32px;height:32px;border-radius:11px;display:grid;place-items:center;cursor:pointer;flex:0 0 auto;
    color:var(--glass-sub);border:1px solid var(--glass-border);background:var(--glass-bg-2);transition:all .18s;}
  .chsc-x:hover{color:var(--glass-text);background:var(--glass-hi);}

  .chsc-msgs{flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:12px;}
  .chsc-msgs::-webkit-scrollbar{width:6px;}
  .chsc-msgs::-webkit-scrollbar-thumb{background:var(--glass-border);border-radius:9px;}
  .chsc-m{display:flex;flex-direction:column;max-width:68%;}
  .chsc-m.me{align-self:flex-end;align-items:flex-end;}
  .chsc-m .meta{font-size:11px;color:var(--glass-sub);margin:0 6px 3px;}
  .chsc-m .bub{padding:9px 13px;border-radius:15px;font-size:13.5px;line-height:1.6;color:var(--glass-text);
    background:var(--glass-bg-2);border:1px solid var(--glass-border);}
  .chsc-m.me .bub{background:linear-gradient(135deg,#9fd6f4,#5fb0e2);color:#0d2336;border-color:transparent;}

  .chsc-input{display:flex;gap:9px;padding:12px 16px 16px;border-top:1px solid var(--glass-border);}
  .chsc-input input{flex:1;height:42px;border-radius:13px;border:1px solid var(--glass-border);
    background:var(--glass-bg-2);color:var(--glass-text);padding:0 14px;font:inherit;font-size:14px;outline:none;
    transition:border-color .18s,background .18s;}
  .chsc-input input:focus{border-color:var(--accent);background:var(--glass-hi);}
  .chsc-input button{appearance:none;border:0;cursor:pointer;width:42px;height:42px;border-radius:13px;
    display:grid;place-items:center;color:#0d2336;background:linear-gradient(135deg,#9fd6f4,#5fb0e2);
    box-shadow:0 6px 16px -7px rgba(79,169,220,.75);}
  .chsc-input button:active{transform:scale(.94);}
  `}</style>
);

type ChannelScreenProps = {
    convId: string | null; // active conversation: text channel id OR DM contact id
    onSelect: (convId: string) => void; // hub-internal switching (same lifted state)
    inWorld: boolean; // channels are a world concept — lobby shows DMs only
    onClose: () => void;
    threads: Record<string, Msg[]>;
    typingId?: string | null; // conv currently "typing…" (DM fake replies)
    onSend: (convId: string, text: string) => void;
};

export function ChannelScreen({ convId, onSelect, inWorld, onClose, threads, typingId, onSend }: ChannelScreenProps) {
    const [text, setText] = useState('');
    // render-time adjustment: drop the unsent draft when switching conversations
    const [prevConv, setPrevConv] = useState(convId);
    if (convId !== prevConv) {
        setPrevConv(convId);
        setText('');
    }
    const msgsRef = useRef<HTMLDivElement>(null);
    const ch = TEXT_CHANNELS.find((c) => c.id === convId);
    const dm = ch ? undefined : CONTACTS.find((c) => c.id === convId);
    const msgs = (convId && threads[convId]) || [];
    const typing = !!convId && typingId === convId;
    const convs = convsFor(inWorld);
    const channels = convs.filter((c) => c.kind === 'channel');
    const dms = convs.filter((c) => c.kind === 'dm');

    useEffect(() => {
        const el = msgsRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [threads, convId]);

    if (!convId || (!ch && !dm)) return null;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend(convId, text);
        setText('');
    };

    return (
        <>
            <ChannelStyles />
            <div className="chsc-scrim" onClick={onClose} />
            <div className="chsc glass">
                {/* conversation switcher — same set as the dock tabs (convsFor) */}
                <div className="chsc-nav">
                    {channels.length > 0 && (
                        <>
                            <div className="chsc-cat">文字频道</div>
                            {channels.map((c) => (
                                <div key={c.id} className={`chsc-nav-item ${convId === c.id ? 'on' : ''}`} onClick={() => onSelect(c.id)} title={c.hint}>
                                    <span className="ic">
                                        <IHash size={15} />
                                    </span>
                                    <span className="nm">{c.name}</span>
                                </div>
                            ))}
                        </>
                    )}
                    <div className="chsc-cat">私信</div>
                    {dms.map((c) => {
                        const p = CONTACTS.find((x) => x.id === c.id);
                        return (
                            <div key={c.id} className={`chsc-nav-item ${convId === c.id ? 'on' : ''}`} onClick={() => onSelect(c.id)} title={c.hint}>
                                <span className="ava-s" style={{ background: p?.color }}>
                                    {p?.ini}
                                </span>
                                <span className="nm">{c.name}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="chsc-main">
                    <div className="chsc-hd">
                        {ch ? (
                            <span className="ic">
                                <IHash size={18} />
                            </span>
                        ) : (
                            <span className="chsc-ava" style={{ background: dm!.color }}>
                                {dm!.ini}
                            </span>
                        )}
                        <h3>{ch ? ch.name : dm!.name}</h3>
                        <span className="topic">{typing ? '正在输入…' : ch ? ch.topic : dm!.status}</span>
                        <div className="chsc-x" onClick={onClose} title="关闭">
                            <IClose size={16} />
                        </div>
                    </div>
                    <div className="chsc-msgs" ref={msgsRef}>
                        {msgs.map((m) => (
                            <div key={m.id} className={`chsc-m ${m.from === 'me' ? 'me' : ''}`}>
                                <span className="meta">
                                    {m.from === 'me' ? '我' : m.sender || (dm ? dm.name : '对方')} · {m.time}
                                </span>
                                <span className="bub">{m.text}</span>
                            </div>
                        ))}
                    </div>
                    <form className="chsc-input" onSubmit={submit}>
                        <input
                            key={convId}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={ch ? `在 #${ch.name} 说点什么…` : `发给 ${dm!.name}…`}
                            maxLength={500}
                            spellCheck={false}
                            autoFocus
                        />
                        <button type="submit" aria-label="发送">
                            <ISend size={17} />
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
