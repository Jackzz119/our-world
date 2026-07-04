// app.jsx — orchestrates scene + HUD + screens + chat; weather + live clock.
const { useState: useS, useEffect: useE, useRef: useR } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mood": "twilight",
  "hudLayout": "scatter",
  "glassStyle": "sky",
  "density": "rich",
  "weather": "auto"
}/*EDITMODE-END*/;

const L = {
  mood:    { golden: "黄昏", twilight: "暮色", night: "夜晚" },
  layout:  { scatter: "环绕", cluster: "聚拢", topbar: "顶栏" },
  glass:   { cloud: "云朵", sky: "天空", twilight: "暮光" },
  density: { minimal: "极简", rich: "丰富" },
  weather: { auto: "实时", sun: "晴", cloud: "多云", rain: "雨", snow: "雪" },
};
const inv = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]));

// addon widgets are removable; required stay on always
const REQUIRED = ["days", "minimap"];
const ADDON = ["presence", "memory", "anniv", "ambient", "music", "lighting"];
const loadWidgets = () => {
  const base = {};
  REQUIRED.forEach((k) => (base[k] = true));
  ADDON.forEach((k) => (base[k] = true));
  try { return { ...base, ...JSON.parse(localStorage.getItem("ow-widgets-v1") || "{}") }; }
  catch { return base; }
};

// WMO weather code → kind + label
const mapWmo = (code) => {
  if (code === 0) return { kind: "sun", label: "晴" };
  if (code <= 3) return { kind: "cloud", label: "多云" };
  if (code <= 48) return { kind: "cloud", label: "雾" };
  if (code <= 67) return { kind: "rain", label: "小雨" };
  if (code <= 77) return { kind: "snow", label: "雪" };
  if (code <= 82) return { kind: "rain", label: "阵雨" };
  if (code <= 86) return { kind: "snow", label: "阵雪" };
  return { kind: "rain", label: "雷雨" };
};
const MANUAL_WX = {
  sun: { kind: "sun", label: "晴", temp: 26 },
  cloud: { kind: "cloud", label: "多云", temp: 22 },
  rain: { kind: "rain", label: "小雨", temp: 18 },
  snow: { kind: "snow", label: "雪", temp: 1 },
};

const SEED_EVENTS = [
  { id: "ev-seed1", date: (() => { const d = new Date(); d.setDate(d.getDate() + 3); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })(), title: "看那部期待很久的电影 🎬" },
  { id: "ev-seed2", date: (() => { const d = new Date(); d.setDate(d.getDate() + 9); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })(), title: "去新开的那家面包店 🥐" },
];
const SEED_ALARMS = [
  { id: "al1", time: "07:30", label: "早安，一起醒来", on: true },
  { id: "al2", time: "22:30", label: "晚安，说句悄悄话", on: true },
];
const kload = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };

const MODAL_TABS = ["timeline", "photos", "notes", "wishlist"];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tbOpen, setTbOpen] = useS(false);
  const [sbOpen, setSbOpen] = useS(false);
  const [screen, setScreen] = useS(null);
  const [profile, setProfile] = useS(() => gload("ow-profile-v1", PROFILE_DEFAULT));
  const [rooms, setRooms] = useS(() => sbLoad("ow-rooms-v1", ROOMS_DEFAULT));
  const [meRoom, setMeRoom] = useS(() => sbLoad("ow-meroom-v1", "living"));
  const [widgets, setWidgets] = useS(loadWidgets);
  const [nowTs, setNowTs] = useS(Date.now());
  const [weather, setWeather] = useS({ kind: "cloud", label: "多云", temp: 22, place: "" });
  const [events, setEvents] = useS(() => kload("ow-dates-v1", SEED_EVENTS));
  const [alarms, setAlarms] = useS(() => kload("ow-alarms-v1", SEED_ALARMS));

  // live clock
  useE(() => { const id = setInterval(() => setNowTs(Date.now()), 1000); return () => clearInterval(id); }, []);
  useE(() => { try { localStorage.setItem("ow-dates-v1", JSON.stringify(events)); } catch {} }, [events]);
  useE(() => { try { localStorage.setItem("ow-alarms-v1", JSON.stringify(alarms)); } catch {} }, [alarms]);
  useE(() => { try { localStorage.setItem("ow-profile-v1", JSON.stringify(profile)); } catch {} }, [profile]);
  useE(() => { try { localStorage.setItem("ow-rooms-v1", JSON.stringify(rooms)); } catch {} }, [rooms]);
  useE(() => { try { localStorage.setItem("ow-meroom-v1", JSON.stringify(meRoom)); } catch {} }, [meRoom]);

  // weather: manual override OR real-time (geolocation → open-meteo)
  useE(() => {
    if (t.weather !== "auto") { setWeather({ ...MANUAL_WX[t.weather], place: "" }); return; }
    let cancel = false;
    const fallback = () => !cancel && setWeather({ kind: "cloud", label: "多云", temp: 22, place: "" });
    if (!navigator.geolocation) { fallback(); return; }
    const to = setTimeout(fallback, 7000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: la, longitude: lo } = pos.coords;
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code`)
          .then((r) => r.json())
          .then((d) => {
            if (cancel) return; clearTimeout(to);
            const c = d.current;
            setWeather({ ...mapWmo(c.weather_code), temp: Math.round(c.temperature_2m), place: "当前位置" });
          })
          .catch(() => { clearTimeout(to); fallback(); });
      },
      () => { clearTimeout(to); fallback(); },
      { timeout: 6500, maximumAge: 6e5 }
    );
    return () => { cancel = true; clearTimeout(to); };
  }, [t.weather]);

  const setWidget = (k, v) => {
    if (REQUIRED.includes(k)) return; // required widgets can't be removed
    setWidgets((w) => {
      const next = { ...w, [k]: v };
      try { localStorage.setItem("ow-widgets-v1", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const navigate = (k) => { setScreen(k); setTbOpen(false); };
  const enterSpace = (r) => { setMeRoom(r.id); if (r.mood) setTweak("mood", r.mood); };
  const curRoom = rooms.find((r) => r.id === meRoom) || rooms[0];

  return (
    <div className="app" data-glass={t.glassStyle} data-mood={t.mood}
      style={{ position: "absolute", inset: 0 }}>
      <RoomScene weather={weather.kind} />
      <HUD
        layout={t.hudLayout} mood={t.mood} density={t.density}
        weather={weather} nowTs={nowTs}
        widgets={widgets} setWidget={setWidget}
        tbOpen={tbOpen} setTbOpen={setTbOpen}
        setMood={(k) => setTweak("mood", k)}
        onNavigate={navigate}
        spaceName={curRoom ? curRoom.name : ""}
      />
      {widgets.presence && <Sidebar open={sbOpen} setOpen={setSbOpen} profile={profile} setProfile={setProfile}
        onOpenSettings={() => { setSbOpen(false); navigate("settings"); }} mood={t.mood} setTweak={setTweak}
        rooms={rooms} setRooms={setRooms} meRoom={meRoom} enterSpace={enterSpace} />}
      <SpaceScreen open={screen === "space"} onClose={() => setScreen(null)} rooms={rooms} meRoom={meRoom} enterSpace={enterSpace} profile={profile} />
      <SubScreen screen={MODAL_TABS.includes(screen) ? screen : null} onClose={() => setScreen(null)} />
      <CalendarScreen open={screen === "calendar"} onClose={() => setScreen(null)} events={events} setEvents={setEvents} />
      <ClockScreen open={screen === "clock"} onClose={() => setScreen(null)} nowTs={nowTs} weather={weather} alarms={alarms} setAlarms={setAlarms} />
      <SettingsScreen open={screen === "settings"} onClose={() => setScreen(null)} t={t} setTweak={setTweak} profile={profile} setP={setProfile} />
      <Chat />

      <TweaksPanel>
        <TweakSection label="光线 · 一天的时光" />
        <TweakRadio label="时段" value={L.mood[t.mood]} options={["黄昏", "暮色", "夜晚"]}
          onChange={(v) => setTweak("mood", inv(L.mood)[v])} />
        <TweakSection label="天气 · 影响场景" />
        <TweakRadio label="天气" value={L.weather[t.weather]} options={["实时", "晴", "多云", "雨", "雪"]}
          onChange={(v) => setTweak("weather", inv(L.weather)[v])} />
        <TweakSection label="悬浮界面" />
        <TweakRadio label="HUD 布局" value={L.layout[t.hudLayout]} options={["环绕", "聚拢", "顶栏"]}
          onChange={(v) => setTweak("hudLayout", inv(L.layout)[v])} />
        <TweakRadio label="信息密度" value={L.density[t.density]} options={["极简", "丰富"]}
          onChange={(v) => setTweak("density", inv(L.density)[v])} />
        <TweakSection label="玻璃质感" />
        <TweakRadio label="材质" value={L.glass[t.glassStyle]} options={["云朵", "天空", "暮光"]}
          onChange={(v) => setTweak("glassStyle", inv(L.glass)[v])} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
