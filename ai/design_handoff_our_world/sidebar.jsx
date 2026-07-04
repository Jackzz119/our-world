// sidebar.jsx — Discord-style left pop-out: world identity · room channels ·
// room config · voice channels · in-room presence detail · user panel (设置 entry).
// Closed = a minimal no-panel avatar dock on the left edge (best scene experience).
// Shares ow-profile-v1 with SettingsScreen; room state persists to ow-rooms-v1.
const { useState: useSb, useEffect: useSbE, useRef: useSbR } = React;

const ROOMS_DEFAULT = [
  { id: "living", name: "客厅", icon: "sofa", mood: "twilight", note: "窝在沙发上，谁也不想动" },
  { id: "bedroom", name: "卧室", icon: "bed", mood: "night", note: "灯关了，说点悄悄话" },
  { id: "balcony", name: "阳台", icon: "leaf", mood: "golden", note: "看日落，吹吹风" },
  { id: "studio", name: "书房", icon: "book", mood: "twilight", note: "各做各的，但在一起" },
];
const ROOM_ICONS = { sofa: ISofa, bed: IBed, leaf: ILeaf, book: IBook };
const VOICE_DEFAULT = [
  { id: "music", name: "一起听歌" },
  { id: "call", name: "煲电话粥" },
];
const MOODS_SB = [
  { k: "golden", label: "黄昏", Icon: ISun },
  { k: "twilight", label: "暮色", Icon: IDusk },
  { k: "night", label: "夜晚", Icon: IMoon },
];
const sbLoad = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const daysSince = (iso) => { const d = new Date(iso + "T00:00:00"); if (isNaN(d)) return 0; return Math.max(1, Math.floor((Date.now() - d) / 864e5) + 1); };

const SidebarStyles = () => (
  <style>{`
  /* ── closed dock: no panel, just the two of us on the left edge ── */
  .sb-dock{position:fixed;left:14px;top:50%;transform:translateY(-50%);z-index:13;
    display:flex;flex-direction:column;align-items:center;gap:9px;pointer-events:auto;
    transition:opacity .3s ease, transform .3s ease;}
  .sb-dock.hide{opacity:0;transform:translateY(-50%) translateX(-26px);pointer-events:none;}
  .sb-dock-avas{display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;}
  .sb-pull{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;cursor:pointer;
    color:var(--accent-deep);border:1px solid var(--glass-border);
    background:linear-gradient(160deg,var(--glass-bg),var(--glass-bg-2));
    -webkit-backdrop-filter:blur(var(--glass-blur)) saturate(var(--glass-sat));backdrop-filter:blur(var(--glass-blur)) saturate(var(--glass-sat));
    box-shadow:var(--glass-shadow);transition:transform .25s;}
  .sb-pull:hover{transform:translateX(3px) scale(1.06);}

  /* shared avatar */
  .ava{position:relative;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;
    border:2px solid rgba(255,255,255,.72);box-shadow:0 6px 16px -5px rgba(20,29,51,.55), inset 0 1px 0 rgba(255,255,255,.45);
    flex:0 0 auto;}
  .ava.couple{border-color:var(--butter);box-shadow:0 0 0 2px rgba(252,231,176,.55),0 6px 16px -5px rgba(20,29,51,.55);}
  .ava .odot{position:absolute;right:-1px;bottom:-1px;width:12px;height:12px;border-radius:50%;
    background:#5fcf8e;border:2.5px solid var(--glass-card,#fff);box-shadow:0 0 7px #5fcf8e;}
  .ava.off{filter:grayscale(.6) brightness(.93);}
  .ava.off .odot{background:#c6cdd8;box-shadow:none;}
  .ava.speaking{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent),0 0 22px 5px var(--glass-glow);animation:spkbob 1.1s ease-in-out infinite;}
  .ava.speaking::before,.ava.speaking::after{content:"";position:absolute;inset:-2px;border-radius:50%;
    border:2px solid var(--accent);animation:voicePulse 1.4s ease-out infinite;pointer-events:none;}
  .ava.speaking::after{animation-delay:.7s;}
  @keyframes voicePulse{0%{transform:scale(1);opacity:.75}100%{transform:scale(1.7);opacity:0}}
  @keyframes spkbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
  @media (prefers-reduced-motion: reduce){.ava.speaking{animation:none}.ava.speaking::before,.ava.speaking::after{animation:none;opacity:0}}

  /* ── scrim + panel ── */
  .sb-scrim{position:fixed;inset:0;z-index:15;background:rgba(20,29,51,.32);
    -webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);
    opacity:0;pointer-events:none;transition:opacity .34s ease;}
  .sb-scrim.show{opacity:1;pointer-events:auto;}
  .owsb{position:absolute;left:0;top:0;bottom:0;width:min(312px,88vw);z-index:16;display:flex;}
  .owsb-card{flex:1;min-height:0;display:flex;flex-direction:column;
    border-radius:0 26px 26px 0;overflow:hidden;box-shadow:18px 0 50px -18px rgba(20,29,51,.5);
    animation:owsbCardIn .34s cubic-bezier(.3,.8,.4,1) both;}
  @keyframes owsbCardIn{from{opacity:0}to{opacity:1}}
  @media (prefers-reduced-motion: reduce){.owsb-card{animation:none}}

  .sb-hd{padding:18px 16px 14px;position:relative;
    background:linear-gradient(160deg,var(--glass-hi),transparent);}
  .sb-hd-top{display:flex;align-items:center;gap:12px;}
  .sb-avas{display:flex;}
  .sb-avas .ava{width:42px;height:42px;font-size:16px;margin-left:-13px;}
  .sb-avas .ava:first-child{margin-left:0;}
  .sb-id{flex:1;min-width:0;}
  .sb-id h3{margin:0;font-size:16px;font-weight:800;color:var(--glass-text);letter-spacing:.01em;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sb-id .meta{font-size:11.5px;color:var(--glass-sub);margin-top:2px;display:flex;align-items:center;gap:6px;}
  .sb-id .meta .num{font-family:"Baloo 2",sans-serif;color:var(--accent-deep);font-weight:700;}
  .sb-id .meta .dot{width:6px;height:6px;border-radius:50%;background:#5fcf8e;box-shadow:0 0 6px #5fcf8e;}
  .sb-close{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;cursor:pointer;flex:0 0 auto;
    color:var(--glass-sub);border:1px solid var(--glass-border);background:var(--glass-bg-2);transition:background .18s,color .18s;}
  .sb-close:hover{background:var(--glass-hi);color:var(--glass-text);}
  .sb-here{margin-top:13px;display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;
    color:var(--glass-text);background:var(--glass-bg-2);border:1px solid var(--glass-border);
    border-radius:var(--r-pill);padding:6px 13px;}
  .sb-here .ic{display:inline-flex;color:var(--accent-deep);}

  .sb-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:6px 10px 12px;}
  .sb-scroll::-webkit-scrollbar{width:6px;}
  .sb-scroll::-webkit-scrollbar-thumb{background:var(--glass-border);border-radius:9px;}

  .sb-cat{display:flex;align-items:center;justify-content:space-between;
    font-size:10.5px;letter-spacing:.15em;font-weight:700;color:var(--glass-sub);
    padding:14px 8px 6px;text-transform:uppercase;}
  .sb-cat .cog{display:inline-flex;cursor:pointer;color:var(--glass-sub);transition:color .18s,transform .2s;}
  .sb-cat .cog:hover{color:var(--accent-deep);}
  .sb-cat .cog.on{color:var(--accent-deep);transform:rotate(60deg);}

  .sb-room{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;cursor:pointer;
    color:var(--glass-sub);transition:background .16s,color .16s;position:relative;}
  .sb-room:hover{background:var(--glass-bg-2);color:var(--glass-text);}
  .sb-room.on{background:var(--glass-hi);color:var(--glass-text);box-shadow:inset 0 0 0 1px var(--glass-border);}
  .sb-room.on::before{content:"";position:absolute;left:-10px;top:50%;transform:translateY(-50%);
    width:4px;height:20px;border-radius:0 4px 4px 0;background:var(--accent);}
  .sb-room .ic{display:inline-flex;flex:0 0 auto;}
  .sb-room .nm{flex:1;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sb-room .who{display:flex;}
  .sb-room .who .mini{width:20px;height:20px;border-radius:50%;margin-left:-7px;border:1.5px solid var(--glass-card,var(--glass-bg));
    display:grid;place-items:center;color:#fff;font-size:9px;font-weight:700;flex:0 0 auto;}
  .sb-room .who .mini:first-child{margin-left:0;}

  /* room config inline */
  .sb-cfg{overflow:hidden;transition:height .3s cubic-bezier(.3,.8,.35,1);}
  .sb-cfg-in{padding:10px 10px 6px;display:flex;flex-direction:column;gap:11px;}
  .sb-field label{font-size:10.5px;letter-spacing:.1em;font-weight:700;color:var(--glass-sub);display:block;margin:0 2px 5px;}
  .sb-cfg-in input{height:38px;width:100%;border-radius:11px;border:1px solid var(--glass-border);background:var(--glass-bg-2);
    color:var(--glass-text);padding:0 12px;font:inherit;font-size:13.5px;font-weight:600;outline:none;transition:border-color .18s,background .18s;}
  .sb-cfg-in input:focus{border-color:var(--accent);background:var(--glass-hi);}
  .sb-seg{display:flex;gap:4px;}
  .sb-seg button{flex:1;appearance:none;border:1px solid var(--glass-border);background:var(--glass-bg-2);cursor:pointer;
    font:inherit;font-size:12px;font-weight:600;color:var(--glass-sub);padding:8px 0;border-radius:11px;
    display:flex;align-items:center;justify-content:center;gap:5px;transition:all .18s;}
  .sb-seg button.on{background:var(--glass-hi);color:var(--glass-text);border-color:var(--accent);}
  .sb-seg button .ic{display:inline-flex;}

  /* voice channel */
  .sb-vc-head{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;cursor:pointer;
    color:var(--glass-sub);transition:background .16s,color .16s;}
  .sb-vc-head:hover{background:var(--glass-bg-2);color:var(--glass-text);}
  .sb-vc-head.live{color:var(--glass-text);}
  .sb-vc-head .ic{display:inline-flex;flex:0 0 auto;}
  .sb-vc-head .nm{flex:1;font-size:14px;font-weight:600;}
  .sb-vc-head .join{font-size:11px;font-weight:700;color:var(--accent-deep);}
  .sb-vc-members{padding:2px 10px 4px 30px;display:flex;flex-direction:column;gap:6px;}
  .sb-vc-m{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--glass-text);font-weight:600;}
  .sb-vc-m .ava{width:26px;height:26px;font-size:11px;}
  .sb-vc-m .mc{margin-left:auto;display:inline-flex;color:#5fcf8e;}
  .sb-vc-m .mc.muted{color:#e08aa0;}

  /* presence detail card */
  .sb-pcard{display:flex;align-items:center;gap:12px;padding:10px;border-radius:14px;background:var(--glass-bg-2);
    border:1px solid var(--glass-border);margin-bottom:8px;cursor:pointer;transition:background .16s;}
  .sb-pcard:hover{background:var(--glass-hi);}
  .sb-pcard .ava{width:42px;height:42px;font-size:15px;}
  .sb-pcard .pc-b{flex:1;min-width:0;}
  .sb-pcard .pc-nm{font-size:14px;font-weight:700;color:var(--glass-text);display:flex;align-items:center;gap:6px;}
  .sb-pcard .pc-tag{font-size:9px;font-weight:700;letter-spacing:.05em;color:var(--accent-deep);
    background:var(--glass-hi);border:1px solid var(--glass-border);border-radius:99px;padding:2px 7px;}
  .sb-pcard .pc-st{font-size:11.5px;color:var(--glass-sub);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .sb-empty{text-align:center;font-size:12.5px;color:var(--glass-sub);padding:20px 10px;line-height:1.7;}
  .sb-empty .ic{display:block;margin:0 auto 8px;color:var(--glass-border);}

  /* footer user panel (Discord-style) */
  .sb-user{display:flex;align-items:center;gap:10px;padding:11px 12px;
    border-top:1px solid var(--glass-border);background:var(--glass-bg-2);}
  .sb-user .ava{width:38px;height:38px;font-size:14px;}
  .sb-user .u-b{flex:1;min-width:0;}
  .sb-user .u-nm{font-size:13.5px;font-weight:700;color:var(--glass-text);line-height:1.2;}
  .sb-user .u-st{font:inherit;font-size:11px;color:var(--glass-sub);border:0;background:transparent;outline:none;
    width:100%;padding:2px 4px;margin-left:-4px;border-radius:7px;transition:background .16s;}
  .sb-user .u-st:hover{background:var(--glass-hi);}
  .sb-user .u-st:focus{background:var(--glass-card,var(--glass-bg));box-shadow:0 0 0 1.5px var(--accent);}
  .sb-ubtn{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;cursor:pointer;flex:0 0 auto;
    color:var(--glass-sub);border:1px solid var(--glass-border);background:var(--glass-bg);transition:all .18s;}
  .sb-ubtn:hover{color:var(--glass-text);background:var(--glass-hi);}
  .sb-ubtn.muted{color:#e08aa0;border-color:rgba(224,138,160,.5);}
  `}</style>
);

function MiniAva({ person, cls = "", size, speaking, onClick }) {
  const s = size ? { width: size, height: size, fontSize: Math.round(size * 0.38), background: person.color } : { background: person.color };
  return (
    <span className={`ava ${person.couple ? "couple" : ""} ${person.online ? "" : "off"} ${speaking ? "speaking" : ""} ${cls}`}
      style={s} onClick={onClick}>
      {person.ini}<span className="odot" />
    </span>
  );
}

function Sidebar({ open, setOpen, profile, setProfile, onOpenSettings, mood, setTweak, rooms, setRooms, meRoom, enterSpace }) {
  const [cfgOpen, setCfgOpen] = useSb(false);
  const [voice, setVoice] = useSb(null);     // joined voice channel id
  const [muted, setMuted] = useSb(false);
  const [spk, setSpk] = useSb({});            // speaking preview flags
  const cfgRef = useSbR(null);

  const her = { id: "her", name: (profile.her || "她"), ini: (profile.her || "她").slice(0, 1), color: "linear-gradient(135deg,#F8C8D6,#EF9DB4)", couple: true, online: true };
  const me = { id: "me", name: (profile.me || "我"), ini: (profile.me || "我").slice(0, 1), color: "linear-gradient(135deg,#FCD9A0,#F1B45A)", couple: true, online: true };
  const herRoom = "living";  // partner's sample location

  const cur = rooms.find((r) => r.id === meRoom) || rooms[0];
  const peopleIn = (rid) => [her.id === "her" && herRoom === rid ? her : null, meRoom === rid ? me : null].filter(Boolean);
  const here = peopleIn(cur.id);

  const enterRoom = (r) => enterSpace(r);
  const setCur = (patch) => setRooms((rs) => rs.map((r) => (r.id === cur.id ? { ...r, ...patch } : r)));
  const cfgH = cfgRef.current ? cfgRef.current.scrollHeight : 0;
  const days = daysSince(profile.anniv);

  return (
    <>
      <SidebarStyles />

      {/* closed dock */}
      <div className={`sb-dock ${open ? "hide" : ""}`}>
        <div className="sb-dock-avas" onClick={() => setOpen(true)} title="打开侧边栏">
          <MiniAva person={her} size={46} />
          <MiniAva person={me} size={46} />
        </div>
        <div className="sb-pull" onClick={() => setOpen(true)} title="打开侧边栏"><IChevron size={16} /></div>
      </div>

      {/* scrim */}
      <div className={`sb-scrim ${open ? "show" : ""}`} onClick={() => setOpen(false)} />

      {/* panel — absolute, toggled via display (position animation is unreliable in
          this render context); glass surface is a static child, fades in on open */}
      <aside className="owsb" aria-hidden={!open} style={{ display: open ? "flex" : "none" }}>
        <div className="owsb-card glass">
        <div className="sb-hd">
          <div className="sb-hd-top">
            <div className="sb-avas">
              <MiniAva person={her} /><MiniAva person={me} />
            </div>
            <div className="sb-id">
              <h3>{profile.world || "我们的小世界"}</h3>
              <div className="meta"><span className="dot" />在一起 <span className="num">{days}</span> 天 · 都在线</div>
            </div>
            <div className="sb-close" onClick={() => setOpen(false)} title="收起"><IChevron size={16} style={{ transform: "rotate(180deg)" }} /></div>
          </div>
          <div className="sb-here"><span className="ic">{React.createElement(ROOM_ICONS[cur.icon] || IHash, { size: 14 })}</span>你在 · {cur.name}</div>
        </div>

        <div className="sb-scroll">
          {/* rooms */}
          <div className="sb-cat">房间
            <span className={`cog ${cfgOpen ? "on" : ""}`} onClick={() => setCfgOpen((o) => !o)} title="房间设置"><ICog size={14} /></span>
          </div>
          {rooms.map((r) => {
            const RI = ROOM_ICONS[r.icon] || IHash;
            const ppl = peopleIn(r.id);
            return (
              <div key={r.id} className={`sb-room ${r.id === meRoom ? "on" : ""}`} onClick={() => enterRoom(r)}>
                <span className="ic"><RI size={17} /></span>
                <span className="nm">{r.name}</span>
                <span className="who">{ppl.map((p) => (<span key={p.id} className="mini" style={{ background: p.color }}>{p.ini}</span>))}</span>
              </div>
            );
          })}

          {/* room config (current room) */}
          <div className="sb-cfg" style={{ height: cfgOpen ? cfgH : 0 }}>
            <div className="sb-cfg-in" ref={cfgRef}>
              <div className="sb-field">
                <label>房间名称 · {cur.name}</label>
                <input value={cur.name} maxLength={8} onChange={(e) => setCur({ name: e.target.value })} spellCheck={false} />
              </div>
              <div className="sb-field">
                <label>此刻</label>
                <input value={cur.note} maxLength={20} onChange={(e) => setCur({ note: e.target.value })} spellCheck={false} placeholder="这个房间现在的氛围…" />
              </div>
              <div className="sb-field">
                <label>这个房间的光线</label>
                <div className="sb-seg">
                  {MOODS_SB.map((m) => (
                    <button key={m.k} className={cur.mood === m.k ? "on" : ""} onClick={() => { setCur({ mood: m.k }); setTweak("mood", m.k); }}>
                      <span className="ic"><m.Icon size={13} /></span>{m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* voice channels */}
          <div className="sb-cat">语音频道</div>
          {VOICE_DEFAULT.map((vc) => {
            const joined = voice === vc.id;
            return (
              <div key={vc.id}>
                <div className={`sb-vc-head ${joined ? "live" : ""}`} onClick={() => setVoice(joined ? null : vc.id)}>
                  <span className="ic"><IVolume size={17} /></span>
                  <span className="nm">{vc.name}</span>
                  <span className="join">{joined ? "离开" : "加入"}</span>
                </div>
                {joined && (
                  <div className="sb-vc-members">
                    <div className="sb-vc-m">
                      <MiniAva person={me} size={26} speaking={!muted} />
                      {me.name}
                      <span className={`mc ${muted ? "muted" : ""}`}>{muted ? <IMicOff size={15} /> : <IMic size={15} />}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* who's in this room */}
          <div className="sb-cat">在「{cur.name}」的人 — {here.length}</div>
          {here.length ? here.map((p) => (
            <div key={p.id} className="sb-pcard" onClick={() => setSpk((s) => ({ ...s, [p.id]: !s[p.id] }))} title="轻点预览说话光晕">
              <MiniAva person={p} speaking={!!spk[p.id]} />
              <div className="pc-b">
                <div className="pc-nm">{p.name}<span className="pc-tag">{p.id === "me" ? "你" : "她"}</span></div>
                <div className="pc-st">{p.id === "me" ? (profile.status || "在你身边") : "在看窗外发呆"}</div>
              </div>
            </div>
          )) : (
            <div className="sb-empty"><span className="ic">{React.createElement(ROOM_ICONS[cur.icon] || IHash, { size: 30 })}</span>这里还没有人<br />去陪陪 {her.name} 吧</div>
          )}
        </div>

        {/* footer user panel */}
        <div className="sb-user">
          <MiniAva person={me} />
          <div className="u-b">
            <div className="u-nm">{me.name}</div>
            <input className="u-st" value={profile.status || ""} placeholder="设置状态…" maxLength={20}
              onChange={(e) => setProfile((o) => ({ ...o, status: e.target.value }))} spellCheck={false} />
          </div>
          <div className={`sb-ubtn ${muted ? "muted" : ""}`} onClick={() => setMuted((m) => !m)} title={muted ? "取消静音" : "静音"}>
            {muted ? <IMicOff size={16} /> : <IMic size={16} />}
          </div>
          <div className="sb-ubtn" onClick={onOpenSettings} title="设置"><ICog size={16} /></div>
        </div>
        </div>
      </aside>
    </>
  );
}

Object.assign(window, { Sidebar, ROOMS_DEFAULT, ROOM_ICONS, sbLoad });
