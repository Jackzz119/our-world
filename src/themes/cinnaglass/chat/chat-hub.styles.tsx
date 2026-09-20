// channel-screen.styles.tsx — every rule the chat hub draws itself with, kept as one injected
// <style> rather than a .css file: cinnaglass.css is imported globally, so moving these rules into
// a stylesheet would change the cascade order and let the shared tokens win over `.chsc-*`.
// Split out of channel-screen.tsx so the hub file reads as behaviour only.
// Block comments inside cite D-7 clause numbers from the historical register named in the hub's
// file header (ai/design_system/uiux/research/cinnaglass-history/ux-decisions.md:53).
export const ChannelStyles = () => (
    <style>{`
  .chat-task {
    --glass-text:var(--ui-text);--glass-sub:var(--ui-muted);--glass-line:var(--ui-line);
    --glass-paper:var(--ui-liner-base);--glass-bg-2:#ffffff08;--glass-hi:#ffffff10;
    --glass-hover:#ffffff10;--glass-active:#ffffff16;
    --accent:var(--ui-accent);--accent-deep:var(--ui-accent);--accent-grad:linear-gradient(var(--ui-accent),var(--ui-accent));
    height:min(780px,calc(100dvh - 24px));
  }
  .chat-task .ui-dialog-content { flex:1;display:flex;min-height:0;overflow:hidden;padding:0; }
  .chsc { display:flex;flex:1;min-width:0;min-height:0;overflow:hidden; }
  .chsc-social summary { min-height:44px;padding:12px 8px;color:var(--ui-muted);font-size:13px;cursor:pointer; }
  .chsc-social summary:focus-visible { outline:2px solid var(--ui-accent);outline-offset:2px; }
  .chsc-social summary .chsc-nav-bdg { margin-left:8px; }
  /* left column: conversation switcher (channels of this world + DMs) */
  .chsc-nav{width:188px;flex:0 0 auto;border-right:1px solid var(--glass-line);
    background:linear-gradient(160deg,var(--glass-hi),transparent);
    overflow-y:auto;overflow-x:hidden;padding:12px 9px;}
  .chsc-nav::-webkit-scrollbar{width:5px;}
  .chsc-nav::-webkit-scrollbar-thumb{background:var(--glass-line);border-radius:9px;}
  .chsc-cat{font-size:10.5px;letter-spacing:.15em;font-weight:700;color:var(--glass-sub);
    padding:10px 8px 5px;text-transform:uppercase;}
  .chsc-nav-item{appearance:none;width:100%;text-align:left;font:inherit;border:0;background:transparent;min-height:44px;display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:11px;cursor:pointer;
    color:var(--glass-sub);transition:background .16s,color .16s;}
  .chsc-nav-item:hover{background:var(--glass-hover);color:var(--glass-text);}
  .chsc-nav-item.on{background:var(--glass-active);color:var(--glass-text);box-shadow:inset 0 0 0 1px var(--glass-line);}
  .chsc-nav-item .ic{display:inline-flex;flex:0 0 auto;}
  .chsc-nav-item .nm{flex:1;min-width:0;font-size:13.5px;font-weight:600;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .chsc-nav-item .ava-s{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;
    font-size:10px;font-weight:700;border:1.5px solid rgba(255,255,255,.72);flex:0 0 auto;}
  .chsc-empty{font-size:12px;color:var(--glass-sub);padding:6px 10px;}
  .chsc-nav-item.friends{font-weight:700;color:var(--glass-text);margin-bottom:2px;}
  .chsc-nav-bdg{display:inline-grid;place-items:center;min-width:16px;height:16px;border-radius:8px;padding:0 4px;
    font-size:9.5px;font-weight:800;color:#fff;background:linear-gradient(135deg,#ef9db4,#e0718f);flex:0 0 auto;}

  /* right column: the conversation itself */
  .chsc-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;position:relative;}
  canvas.chsc-dust{position:absolute;inset:0;z-index:5;pointer-events:none;}

  .chsc-hd{display:flex;align-items:center;gap:11px;padding:16px 18px 13px;border-bottom:1px solid var(--glass-line);}
  .chsc-hd .ic{display:inline-flex;color:var(--accent-deep);}
  .chsc-ava{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:#fff;
    font-size:12px;font-weight:700;border:2px solid rgba(255,255,255,.72);
    box-shadow:0 6px 16px -5px rgba(20,29,51,.55);flex:0 0 auto;}
  .chsc-hd h3{margin:0;font-size:16.5px;font-weight:800;color:var(--glass-text);}
  .chsc-hd .topic{flex:1;min-width:0;font-size:12px;color:var(--glass-sub);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .chsc-x{width:32px;height:32px;border-radius:11px;display:grid;place-items:center;cursor:pointer;flex:0 0 auto;
    color:var(--glass-sub);border:1px solid var(--glass-line);background:var(--glass-bg-2);transition:all .18s;}
  .chsc-x:hover{color:var(--glass-text);background:var(--glass-hover);}

  .chsc-msgs{flex:1;min-height:0;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:12px;}
  /* chatAlign='left' (default, Discord-style): own messages join the left
     flow too — identity stays readable via the blue bubble + 「我」 meta */
  .chsc-msgs.left .chsc-m.me{align-self:flex-start;align-items:flex-start;}
  .chsc-msgs.left .chsc-m.me .abar{right:auto;left:0;}
  .chsc-msgs.left .chsc-m.me .chsc-pop{right:auto;left:0;}
  .chsc-msgs.left .chsc-m.me .chsc-rx{justify-content:flex-start;}
  .chsc-msgs.left .chsc-read{align-self:flex-start;margin:-6px 0 0 4px;}
  .chsc-top-hint{text-align:center;font-size:11px;color:var(--glass-sub);padding:0 0 4px;flex:0 0 auto;}
  .chsc-notice{text-align:center;font-size:11.5px;color:var(--glass-sub);padding:2px 12px 6px;flex:0 0 auto;}
  .chsc-msgs::-webkit-scrollbar{width:6px;}
  .chsc-msgs::-webkit-scrollbar-thumb{background:var(--glass-line);border-radius:9px;}
  .chsc-m{display:flex;flex-direction:column;max-width:68%;position:relative;}
  .chsc-m.me{align-self:flex-end;align-items:flex-end;}
  .chsc-m .meta{font-size:11px;color:var(--glass-sub);margin:0 6px 3px;}
  .chsc-m .bub{position:relative;padding:9px 13px;border-radius:15px;font-size:13.5px;line-height:1.6;color:var(--glass-text);
    background:var(--glass-paper);border:1px solid var(--glass-line);overflow-wrap:anywhere;}
  .chsc-m.me .bub{background:var(--accent-grad);color:#0d2336;border-color:transparent;}
  .chsc-m .edited{font-size:10px;color:var(--glass-sub);margin-left:5px;}
  .chsc-m.me .edited{color:rgba(13,35,54,.55);}

  /* sending: optimistic bubble, translucent shimmer + bobbing cloud (D-7 ①) */
  .chsc-m.sending .bub{opacity:.58;animation:chscSend 1.4s ease-in-out infinite;}
  @keyframes chscSend{0%,100%{opacity:.58}50%{opacity:.78}}
  .chsc-m .send-cloud{position:absolute;right:-22px;bottom:2px;font-size:13px;opacity:.75;
    animation:chscCloud 1.4s ease-in-out infinite;}
  @keyframes chscCloud{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}

  /* failed: blush warning bubble + retry/discard row (D-7 ②) */
  .chsc-m.failed .bub{background:linear-gradient(135deg,rgba(248,215,223,.92),rgba(239,157,180,.82));
    border:1.5px solid #e0718f;color:#5e2a3a;}
  .chsc-fail{display:flex;align-items:center;gap:9px;font-size:11.5px;color:#e0718f;margin:4px 6px 0;font-weight:600;}
  .chsc-fail .lnk{font:inherit;background:transparent;border:0;color:inherit;min-height:44px;cursor:pointer;text-decoration:underline;text-underline-offset:2px;}
  .chsc-fail .lnk.mute{color:var(--glass-sub);font-weight:500;}

  /* vanishing: bubble fades under the particles (D-7 ⑦) */
  .chsc-m.vanish{pointer-events:none;}
  .chsc-m.vanish .bub{opacity:0;transition:opacity .35s;}
  .chsc-m.vanish .abar,.chsc-m.vanish .chsc-rx{display:none;}

  /* hover action bar — the single entry for message ops (D-7 ④) */
  .abar{position:absolute;top:-48px;right:0;z-index:6;display:none;gap:2px;padding:3px 5px;max-width:min(360px,calc(100vw - 72px));flex-wrap:wrap;border-radius:12px;
    background:var(--glass-paper);border:1px solid var(--glass-line);
    box-shadow:0 10px 24px -10px rgba(20,29,51,.4);}
  .chsc-m:not(.me) .abar{right:auto;left:0;}
  .chsc-m:hover .abar,.chsc-m:focus-within .abar{display:flex;}
  .chsc-m.sending .abar,.chsc-m.failed .abar{display:none!important;}
  .abar button{appearance:none;border:0;background:transparent;cursor:pointer;font-size:14px;line-height:1;
    width:44px;height:44px;border-radius:8px;display:grid;place-items:center;color:var(--glass-sub);padding:0;}
  .abar button:hover{background:var(--glass-hover);color:var(--glass-text);}
  .abar button:disabled{opacity:.35;cursor:default;}

  /* EmotePicker positioning wrapper (panel styles live in emote-picker.tsx) */
  .chsc-pop{position:absolute;top:26px;z-index:8;}
  .chsc-m.me .chsc-pop{right:0;} .chsc-m:not(.me) .chsc-pop{left:0;}

  /* sticker messages: naked render, no bubble (B-1/B-3, LINE-style) */
  .chsc-stkm{position:relative;width:110px;height:110px;}
  .chsc-stkm img{width:100%;height:100%;object-fit:contain;transition:transform .18s cubic-bezier(.34,1.5,.5,1);
    filter:drop-shadow(0 8px 16px rgba(20,29,51,.25));}
  .chsc-m:hover .chsc-stkm img{transform:translateY(-3px) scale(1.04);}
  .chsc-stk-ghost{width:110px;height:110px;border-radius:16px;display:grid;place-items:center;text-align:center;
    font-size:10.5px;color:var(--glass-sub);background:rgba(34,51,90,.06);border:1.5px dashed rgba(34,51,90,.2);padding:8px;}

  /* reaction chips (D-7 ⑤) */
  .chsc-rx{display:flex;gap:5px;margin:4px 4px 0;flex-wrap:wrap;}
  .chsc-m.me .chsc-rx{justify-content:flex-end;}
  .chsc-rx .rx{font:inherit;display:inline-flex;align-items:center;gap:4px;font-size:11.5px;padding:2px 8px;border-radius:999px;
    cursor:pointer;background:var(--glass-paper);border:1px solid var(--glass-line);color:var(--glass-sub);}
  .chsc-rx .rx.on{background:var(--glass-active);border-color:var(--accent);color:var(--glass-text);font-weight:700;}

  /* inline edit (D-7 ⑥) */
  .chsc-edit{width:min(420px,100%);}
  .chsc-edit textarea{width:100%;resize:none;border-radius:13px;border:1.5px solid var(--accent);outline:none;
    background:var(--glass-paper);font:inherit;font-size:13.5px;line-height:1.6;padding:9px 13px;color:var(--glass-text);}
  .chsc-edit .hint{font-size:10.5px;color:var(--glass-sub);margin:3px 6px 0;}

  /* read cursor avatar — DMs ONLY (D-7-3 修订) */
  .chsc-read{align-self:flex-end;display:flex;gap:4px;margin:-6px 4px 0;}
  .chsc-read .ava{width:16px;height:16px;border-radius:50%;display:grid;place-items:center;color:#fff;
    font-size:8.5px;font-weight:700;border:1.5px solid rgba(255,255,255,.85);
    box-shadow:0 3px 8px -3px rgba(224,113,143,.6);animation:readPop .38s cubic-bezier(.34,1.6,.5,1) both;}
  @keyframes readPop{from{transform:translateY(-8px) scale(.5);opacity:0}to{transform:none;opacity:1}}

  .chsc-input{display:flex;gap:9px;padding:12px 16px 16px;border-top:1px solid var(--glass-line);position:relative;}
  .chsc-emo{appearance:none;cursor:pointer;width:44px;height:44px;border-radius:13px;flex:0 0 auto;
    border:1px solid var(--glass-line);background:var(--glass-bg-2);font-size:18px;line-height:1;
    display:grid;place-items:center;padding:0;transition:background .18s;}
  .chsc-emo:hover{background:var(--glass-hover);}
  /* anchored above its trigger (the 😊 button sits at the row's LEFT edge) */
  .chsc-pop.for-input{position:absolute;bottom:64px;left:14px;top:auto;right:auto;}
  .chsc-input input{flex:1;min-width:0;height:44px;border-radius:13px;border:1px solid var(--glass-line);
    background:var(--glass-paper);color:var(--glass-text);padding:0 14px;font:inherit;font-size:14px;outline:none;
    transition:border-color .18s,background .18s;}
  .chsc-input input:focus{border-color:var(--accent);background:var(--glass-hi);}
  .chsc-input button[type=submit]{appearance:none;border:0;cursor:pointer;width:44px;height:44px;border-radius:13px;
    display:grid;place-items:center;color:#0d2336;background:var(--accent-grad);
    box-shadow:0 6px 16px -7px rgba(47,154,211,.75);}
  .chsc-input button[type=submit]:active{transform:scale(.94);}
  .chat-task .chsc-pop.for-input,.chat-task .chsc-pop.for-reaction {
    width:min(318px,calc(100% - 20px));max-height:min(420px,calc(100dvh - 220px));overflow:auto;
    left:10px;right:auto;top:auto;bottom:72px;
  }
  .chat-task .chsc-pop.for-reaction { bottom:76px; }
  .chat-task .chsc-pop .epk { width:100%;max-width:100%; }
  .chat-task :is(.bub,.rx,.abar,.epk,input,textarea,select) {
    --glass-text:var(--ui-text);--glass-sub:var(--ui-muted);--glass-line:var(--ui-line);
    --glass-hover:#ffffff10;--glass-active:#ffffff16;--glass-hi:#ffffff10;--glass-border:var(--ui-line);
  }
  .chat-task .chsc-m.me .bub { color:#302719; }
  .chat-task .chsc-input input::placeholder { color:var(--ui-muted);opacity:1; }
  .chat-task .chsc-fail { color:#ffd0cc; }
  .chat-task .chsc-rx .rx { min-height:44px; }
  .chat-task .fpg-hd { flex-wrap:wrap; }
  .chat-task .fpg-x { display:none; }
  .chat-task .fpg-tab,.chat-task .fpg-row .acts button,.chat-task .fpg-add input,.chat-task .fpg-add .go { min-height:44px; }
  .chat-task .fpg-row .acts button { min-width:44px; }
  .chat-task .fpg-tab.add,.chat-task .fpg-add .go { background:var(--ui-accent);color:#302719; }
  .chat-task .fpg-add .msg.err { color:#ffd0cc; }
  .chat-task .fpg-bd { min-height:0; }
  @media(max-width:640px) {
    .chsc { flex-direction:column; }
    .chsc-nav { width:100%;max-height:30%;border-right:0;border-bottom:1px solid var(--ui-line);padding:6px 10px; }
    .chsc-hd { padding:12px;flex-wrap:wrap;gap:8px; }
    .chsc-hd .topic { flex-basis:100%;white-space:normal; }
    .chsc-msgs { padding:16px 12px; }
    .chsc-m { max-width:90%; }
    .chsc-input { padding:10px;gap:6px; }
    .chat-task .fpg-hd,.chat-task .fpg-bd { padding:12px; }
    .chat-task .fpg-add .line { flex-wrap:wrap; }
    .chat-task .fpg-add .go { padding:8px 12px; }
    .chat-task .fpg-row { flex-wrap:wrap; }
  }
  `}</style>
);
