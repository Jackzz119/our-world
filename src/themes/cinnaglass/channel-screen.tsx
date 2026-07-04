// channel-screen.tsx — the covering chat surface: opened from a text channel
// in the sidebar, it floats over (almost covers) the stage so you can chat
// with the scene tucked away. Shares threads with the in-scene ChatDock —
// same content, different experience. Base template per ai/Features/chat.md.
import { useEffect, useRef, useState } from 'react';
import { IClose, IHash, ISend } from './icons';
import { TEXT_CHANNELS, type Msg } from './chat-data';

const ChannelStyles = () => (
    <style>{`
  .chsc-scrim{position:absolute;inset:0;z-index:22;background:rgba(14,20,38,.45);
    -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:chscFade .3s ease both;}
  @keyframes chscFade{from{opacity:0}to{opacity:1}}
  .chsc{position:absolute;inset:3% 4%;z-index:23;display:flex;flex-direction:column;overflow:hidden;
    border-radius:24px;animation:chscIn .34s cubic-bezier(.3,.8,.4,1) both;}
  @keyframes chscIn{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion: reduce){.chsc,.chsc-scrim{animation:none}}

  .chsc-hd{display:flex;align-items:center;gap:11px;padding:16px 18px 13px;border-bottom:1px solid var(--glass-border);}
  .chsc-hd .ic{display:inline-flex;color:var(--accent-deep);}
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
    channelId: string | null;
    onClose: () => void;
    threads: Record<string, Msg[]>;
    onSend: (convId: string, text: string) => void;
};

export function ChannelScreen({ channelId, onClose, threads, onSend }: ChannelScreenProps) {
    const [text, setText] = useState('');
    const msgsRef = useRef<HTMLDivElement>(null);
    const ch = TEXT_CHANNELS.find((c) => c.id === channelId);
    const msgs = (channelId && threads[channelId]) || [];

    useEffect(() => {
        const el = msgsRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [threads, channelId]);

    if (!channelId || !ch) return null;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend(channelId, text);
        setText('');
    };

    return (
        <>
            <ChannelStyles />
            <div className="chsc-scrim" onClick={onClose} />
            <div className="chsc glass">
                <div className="chsc-hd">
                    <span className="ic">
                        <IHash size={18} />
                    </span>
                    <h3>{ch.name}</h3>
                    <span className="topic">{ch.topic}</span>
                    <div className="chsc-x" onClick={onClose} title="关闭">
                        <IClose size={16} />
                    </div>
                </div>
                <div className="chsc-msgs" ref={msgsRef}>
                    {msgs.map((m) => (
                        <div key={m.id} className={`chsc-m ${m.from === 'me' ? 'me' : ''}`}>
                            <span className="meta">
                                {m.from === 'me' ? '我' : m.sender || '对方'} · {m.time}
                            </span>
                            <span className="bub">{m.text}</span>
                        </div>
                    ))}
                </div>
                <form className="chsc-input" onSubmit={submit}>
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={`在 #${ch.name} 说点什么…`}
                        maxLength={500}
                        spellCheck={false}
                        autoFocus
                    />
                    <button type="submit" aria-label="发送">
                        <ISend size={17} />
                    </button>
                </form>
            </div>
        </>
    );
}
