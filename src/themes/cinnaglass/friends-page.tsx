// friends-page.tsx — the FRIENDS PAGE inside the chat hub (Discord-style,
// mockup ai/design_system/cinnaglass/friends-page.html 方案 A): the hub's
// left nav pins a 好友 entry above the DM list; selecting it swaps the right
// pane to this page. Top tabs filter views — 全部 / 待处理 / ＋添加好友;
// an 在线 tab is reserved until presence lands (no fake online states).
// Friend management lives ONLY here; the sidebar home panel just links in.
// See ai/Features/chat.md DM 阶段.
import { useState } from 'react';
import type { FriendEntry, FriendRequest } from './chat-data';

const FriendsStyles = () => (
    <style>{`
  .fpg{flex:1;min-width:0;display:flex;flex-direction:column;}
  .fpg-hd{display:flex;align-items:center;gap:8px;padding:14px 18px;border-bottom:1px solid var(--glass-line);}
  .fpg-hd .ttl{font-weight:800;font-size:15px;color:var(--glass-text);display:flex;align-items:center;gap:7px;}
  .fpg-hd .sep{width:1px;height:18px;background:var(--glass-line);margin:0 4px;}
  .fpg-tab{appearance:none;border:0;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;color:var(--glass-sub);
    padding:5px 13px;border-radius:999px;background:transparent;transition:all .16s;}
  .fpg-tab:hover{color:var(--glass-text);}
  .fpg-tab.on{background:var(--glass-active);color:var(--glass-text);box-shadow:inset 0 0 0 1px var(--glass-line);}
  .fpg-tab:disabled{opacity:.4;cursor:default;}
  .fpg-tab.add{color:#fff;background:linear-gradient(135deg,#86c99a,#5fa878);}
  .fpg-tab.add.on{box-shadow:inset 0 0 0 2px rgba(255,255,255,.65);}
  .fpg-bdg{display:inline-grid;place-items:center;min-width:15px;height:15px;border-radius:8px;padding:0 4px;
    font-size:9px;font-weight:800;color:#fff;background:linear-gradient(135deg,#ef9db4,#e0718f);margin-left:5px;vertical-align:1px;}
  .fpg-x{width:32px;height:32px;border-radius:11px;display:grid;place-items:center;cursor:pointer;flex:0 0 auto;
    margin-left:auto;color:var(--glass-sub);border:1px solid var(--glass-line);background:var(--glass-bg-2);transition:all .18s;}
  .fpg-x:hover{color:var(--glass-text);background:var(--glass-hover);}

  .fpg-bd{flex:1;overflow-y:auto;padding:14px 18px;}
  .fpg-bd::-webkit-scrollbar{width:6px;}
  .fpg-bd::-webkit-scrollbar-thumb{background:var(--glass-line);border-radius:9px;}
  .fpg-sec{font-size:10.5px;letter-spacing:.12em;font-weight:700;color:var(--glass-sub);margin:6px 2px 7px;text-transform:uppercase;}
  .fpg-row{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:13px;transition:background .15s;}
  .fpg-row:hover{background:var(--glass-hover);}
  .fpg-row .ava{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:13px;
    font-weight:700;border:2px solid rgba(255,255,255,.75);flex:0 0 auto;}
  .fpg-row .b{flex:1;min-width:0;}
  .fpg-row .nm{font-size:13.5px;font-weight:700;color:var(--glass-text);line-height:1.3;}
  .fpg-row .st{font-size:11px;color:var(--glass-sub);}
  .fpg-row .acts{display:flex;gap:6px;}
  .fpg-row .acts button{width:30px;height:30px;border-radius:10px;border:1px solid var(--glass-line);cursor:pointer;
    background:var(--glass-bg-2);display:grid;place-items:center;font-size:13px;padding:0;color:var(--glass-sub);}
  .fpg-row .acts button:hover{background:var(--glass-hover);color:var(--glass-text);}
  .fpg-empty{font-size:12.5px;color:var(--glass-sub);padding:20px 6px;text-align:center;}

  .fpg-add{padding:16px 6px;}
  .fpg-add h4{font-size:14.5px;color:var(--glass-text);margin-bottom:3px;}
  .fpg-add .d{font-size:12px;color:var(--glass-sub);margin-bottom:13px;}
  .fpg-add .line{display:flex;gap:8px;max-width:440px;}
  .fpg-add input{flex:1;min-width:0;height:38px;border-radius:12px;border:1px solid var(--glass-line);
    background:var(--glass-paper);color:var(--glass-text);padding:0 12px;font:inherit;font-size:13px;outline:none;}
  .fpg-add input:focus{border-color:var(--accent);background:var(--glass-hi);}
  .fpg-add .go{appearance:none;border:0;cursor:pointer;font:inherit;font-size:13px;font-weight:700;padding:0 18px;
    border-radius:12px;color:#fff;background:linear-gradient(135deg,#86c99a,#5fa878);}
  .fpg-add .go:disabled{opacity:.5;cursor:default;}
  .fpg-add .msg{font-size:12px;color:var(--glass-sub);margin-top:9px;}
  .fpg-add .msg.err{color:#e0718f;}
  `}</style>
);

type Tab = 'all' | 'pending' | 'add';

type FriendsPageProps = {
    friends: FriendEntry[];
    requestsIn: FriendRequest[]; // waiting for MY answer
    requestsOut: FriendRequest[]; // waiting for THEIR answer
    onAddFriend: (email: string) => Promise<string>; // resolves to the friend's name
    onAccept: (otherId: string) => void;
    onRemove: (otherId: string) => void; // decline / cancel / unfriend
    onOpenDm: (convId: string) => void; // jump to the DM conversation
    onClose: () => void;
};

export function FriendsPage({ friends, requestsIn, requestsOut, onAddFriend, onAccept, onRemove, onOpenDm, onClose }: FriendsPageProps) {
    const [tab, setTab] = useState<Tab>('all');
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
    const pendingCount = requestsIn.length;

    const submitAdd = async () => {
        const v = email.trim();
        if (!v || busy) return;
        setBusy(true);
        setMsg(null);
        try {
            const name = await onAddFriend(v);
            setEmail('');
            setMsg({ text: `已向 ${name} 发出申请 ✨`, err: false });
        } catch (e) {
            setMsg({ text: e instanceof Error ? e.message : String(e), err: true });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fpg">
            <FriendsStyles />
            <div className="fpg-hd">
                <span className="ttl">💗 好友</span>
                <span className="sep" />
                <button type="button" className={`fpg-tab ${tab === 'all' ? 'on' : ''}`} onClick={() => setTab('all')}>
                    全部
                </button>
                <button type="button" className={`fpg-tab ${tab === 'pending' ? 'on' : ''}`} onClick={() => setTab('pending')}>
                    待处理
                    {pendingCount > 0 && <span className="fpg-bdg">{pendingCount}</span>}
                </button>
                <button type="button" className="fpg-tab" disabled title="在场系统上线后开放">
                    在线
                </button>
                <button type="button" className={`fpg-tab add ${tab === 'add' ? 'on' : ''}`} onClick={() => setTab('add')}>
                    ＋ 添加好友
                </button>
                <div className="fpg-x" onClick={onClose} title="关闭">
                    ✕
                </div>
            </div>
            <div className="fpg-bd">
                {tab === 'all' && (
                    <>
                        <div className="fpg-sec">全部好友 — {friends.length}</div>
                        {friends.length === 0 && <div className="fpg-empty">还没有好友，去「＋ 添加好友」把 ta 加进来吧</div>}
                        {friends.map((f) => (
                            <div key={f.otherId} className="fpg-row">
                                <span className="ava" style={{ background: f.color }}>
                                    {f.name.slice(0, 1)}
                                </span>
                                <div className="b">
                                    <div className="nm">{f.name}</div>
                                    <div className="st">你们已是好友</div>
                                </div>
                                <div className="acts">
                                    {f.dmChannelId && (
                                        <button type="button" title="发私信" onClick={() => onOpenDm(f.dmChannelId!)}>
                                            💬
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        title="解除好友"
                                        onClick={() => {
                                            if (window.confirm(`确定要解除和 ${f.name} 的好友关系吗？聊天记录会保留。`)) onRemove(f.otherId);
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </>
                )}
                {tab === 'pending' && (
                    <>
                        <div className="fpg-sec">收到的申请 — {requestsIn.length}</div>
                        {requestsIn.length === 0 && <div className="fpg-empty">暂时没有新申请</div>}
                        {requestsIn.map((r) => (
                            <div key={r.otherId} className="fpg-row">
                                <span className="ava" style={{ background: r.color }}>
                                    {r.name.slice(0, 1)}
                                </span>
                                <div className="b">
                                    <div className="nm">{r.name}</div>
                                    <div className="st">想加你为好友</div>
                                </div>
                                <div className="acts">
                                    <button type="button" title="接受" onClick={() => onAccept(r.otherId)}>
                                        ✓
                                    </button>
                                    <button type="button" title="拒绝" onClick={() => onRemove(r.otherId)}>
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                        {requestsOut.length > 0 && (
                            <>
                                <div className="fpg-sec" style={{ marginTop: 14 }}>
                                    发出的申请 — {requestsOut.length}
                                </div>
                                {requestsOut.map((r) => (
                                    <div key={r.otherId} className="fpg-row">
                                        <span className="ava" style={{ background: r.color }}>
                                            {r.name.slice(0, 1)}
                                        </span>
                                        <div className="b">
                                            <div className="nm">{r.name}</div>
                                            <div className="st">等待对方接受…</div>
                                        </div>
                                        <div className="acts">
                                            <button type="button" title="取消申请" onClick={() => onRemove(r.otherId)}>
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}
                {tab === 'add' && (
                    <div className="fpg-add">
                        <h4>添加好友</h4>
                        <div className="d">输入对方的注册邮箱，向 ta 发送好友申请</div>
                        <div className="line">
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="somebody@email.com"
                                spellCheck={false}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void submitAdd();
                                }}
                            />
                            <button type="button" className="go" disabled={busy || !email.trim()} onClick={() => void submitAdd()}>
                                {busy ? '发送中…' : '发送申请 ✨'}
                            </button>
                        </div>
                        {msg && <div className={`msg ${msg.err ? 'err' : ''}`}>{msg.text}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}
