// chat-dock.tsx — WoW-style in-scene ambient chat, pinned to the stage's
// bottom-left. Two visual states:
//   ghost — translucent, read-only, always shows the tail of the active
//           conversation while you interact with the scene
//   solid — opaque glass, tabs + input, entered via the chat button or Enter;
//           any pointer-down on the scene outside the dock ghosts it again
//           (that part is wired in WorldPage's stage handler).
// Base template per ai/Features/chat.md — content is shared with the covering
// ChannelScreen through useChatThreads.
import { useEffect, useRef, useState } from 'react';
import { IChat, IHash, ISend } from './icons';
import { CONTACTS } from './contacts';
import { TEXT_CHANNELS, convsFor, isChannel, type Msg } from './chat-data';

const DockStyles = () => (
    <style>{`
  .cdk{position:absolute;left:14px;bottom:14px;z-index:14;display:flex;flex-direction:column;
    align-items:flex-start;gap:8px;width:min(336px,calc(100% - 28px));}

  /* message box */
  .cdk-box{width:100%;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;
    transition:opacity .3s ease,background .3s ease,box-shadow .3s ease;}
  .cdk-box.ghost{opacity:.62;pointer-events:none;background:linear-gradient(180deg,rgba(16,24,44,.02),rgba(16,24,44,.38));}
  .cdk-box.ghost .cdk-msgs{mask-image:linear-gradient(180deg,transparent 0,#000 26%);
    -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 26%);}
  .cdk-box.solid{opacity:1;}

  /* conversation tabs (solid only) */
  .cdk-tabs{display:flex;gap:5px;padding:9px 10px 4px;flex-wrap:wrap;}
  .cdk-tab{appearance:none;border:1px solid var(--glass-border);background:var(--glass-bg-2);cursor:pointer;
    font:inherit;font-size:11.5px;font-weight:700;color:var(--glass-sub);padding:4px 11px;border-radius:99px;
    display:inline-flex;align-items:center;gap:4px;transition:all .16s;}
  .cdk-tab:hover{color:var(--glass-text);}
  .cdk-tab.on{background:var(--glass-hi);color:var(--glass-text);border-color:var(--accent);}
  .cdk-tab .ic{display:inline-flex;}

  .cdk-msgs{max-height:168px;overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:3px;}
  .cdk-msgs::-webkit-scrollbar{width:5px;}
  .cdk-msgs::-webkit-scrollbar-thumb{background:var(--glass-border);border-radius:9px;}
  .cdk-line{font-size:12.5px;line-height:1.55;color:var(--glass-text);word-break:break-word;}
  .cdk-box.ghost .cdk-line{color:#fff;text-shadow:0 1px 3px rgba(10,16,32,.85);}
  .cdk-line .who{font-weight:800;margin-right:5px;}
  .cdk-line .who.me{color:var(--accent-deep);}
  .cdk-box.ghost .cdk-line .who{color:#ffd9a0;}
  .cdk-box.ghost .cdk-line .who.me{color:#9fd6f4;}
  .cdk-typing{font-size:11.5px;color:var(--glass-sub);padding:0 12px 6px;}
  .cdk-box.ghost .cdk-typing{color:rgba(255,255,255,.75);text-shadow:0 1px 3px rgba(10,16,32,.85);}

  /* input row (solid only) */
  .cdk-input{display:flex;gap:7px;padding:7px 9px 9px;}
  .cdk-input input{flex:1;height:36px;border-radius:11px;border:1px solid var(--glass-border);
    background:var(--glass-bg-2);color:var(--glass-text);padding:0 12px;font:inherit;font-size:13px;outline:none;
    transition:border-color .18s,background .18s;}
  .cdk-input input:focus{border-color:var(--accent);background:var(--glass-hi);}
  .cdk-input button{appearance:none;border:0;cursor:pointer;width:36px;height:36px;border-radius:11px;
    display:grid;place-items:center;color:#0d2336;background:linear-gradient(135deg,#9fd6f4,#5fb0e2);
    box-shadow:0 5px 14px -6px rgba(79,169,220,.7);}
  .cdk-input button:active{transform:scale(.94);}

  /* chat button — the only always-interactive part in ghost state */
  .cdk-btn{appearance:none;cursor:pointer;width:46px;height:46px;border-radius:50%;
    display:grid;place-items:center;color:var(--accent-deep);border:1px solid var(--glass-border);
    transition:transform .28s cubic-bezier(.34,1.5,.5,1),box-shadow .2s;}
  .cdk-btn:hover{transform:scale(1.07) translateY(-1px);}
  .cdk-btn:active{transform:scale(.92);}
  .cdk-btn.live{color:#0d2336;background:linear-gradient(135deg,#9fd6f4,#5fb0e2);border-color:transparent;}
  `}</style>
);

type ChatDockProps = {
    solid: boolean;
    setSolid: (v: boolean) => void;
    active: string; // conversation id: DM contact or 'ch-*' channel
    setActive: (id: string) => void;
    inWorld: boolean; // channel tabs are a world concept — lobby shows DMs only
    threads: Record<string, Msg[]>;
    typingId: string | null;
    onSend: (convId: string, text: string) => void;
};

const nameOf = (convId: string, m: Msg): string => {
    if (m.from === 'me') return '我';
    if (m.sender) return m.sender;
    return CONTACTS.find((c) => c.id === convId)?.name ?? '对方';
};

export function ChatDock({ solid, setSolid, active, setActive, inWorld, threads, typingId, onSend }: ChatDockProps) {
    const [text, setText] = useState('');
    const msgsRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // same conversation set as the chat hub (convsFor keeps them in sync);
    // if the active conv left the set (e.g. a channel while in the lobby),
    // fall back to the first available one
    const convs = convsFor(inWorld);
    const cur = convs.some((c) => c.id === active) ? active : (convs[0]?.id ?? active);

    const msgs = threads[cur] || [];
    const tail = solid ? msgs : msgs.slice(-5); // ghost only shows the tail

    // stick to bottom; refocus input whenever the dock solidifies
    useEffect(() => {
        const el = msgsRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [threads, typingId, cur, solid]);
    useEffect(() => {
        if (solid) inputRef.current?.focus();
    }, [solid]);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend(cur, text);
        setText('');
    };

    const typingName = typingId === cur && !isChannel(cur) ? CONTACTS.find((c) => c.id === cur)?.name : null;

    return (
        <div className="cdk">
            <DockStyles />
            <div className={`cdk-box ${solid ? 'solid glass' : 'ghost'}`}>
                {solid && (
                    <div className="cdk-tabs">
                        {convs.map((c) => (
                            <button key={c.id} type="button" className={`cdk-tab ${cur === c.id ? 'on' : ''}`} onClick={() => setActive(c.id)}>
                                {c.kind === 'channel' && (
                                    <span className="ic">
                                        <IHash size={11} />
                                    </span>
                                )}
                                {c.name}
                            </button>
                        ))}
                    </div>
                )}
                <div className="cdk-msgs" ref={msgsRef}>
                    {tail.map((m) => (
                        <div key={m.id} className="cdk-line">
                            <span className={`who ${m.from === 'me' ? 'me' : ''}`}>[{nameOf(cur, m)}]</span>
                            {m.text}
                        </div>
                    ))}
                </div>
                {typingName && <div className="cdk-typing">{typingName} 正在输入…</div>}
                {solid && (
                    <form className="cdk-input" onSubmit={submit}>
                        <input
                            ref={inputRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={isChannel(cur) ? `在 #${TEXT_CHANNELS.find((c) => c.id === cur)?.name} 说话…` : '说句悄悄话…'}
                            maxLength={200}
                            spellCheck={false}
                        />
                        <button type="submit" aria-label="发送">
                            <ISend size={16} />
                        </button>
                    </form>
                )}
            </div>
            <button
                type="button"
                className={`cdk-btn ${solid ? 'live' : 'glass'}`}
                title={solid ? '收起聊天（或点击场景）' : '打开聊天（回车）'}
                onClick={() => setSolid(!solid)}
            >
                <IChat size={20} />
            </button>
        </div>
    );
}
