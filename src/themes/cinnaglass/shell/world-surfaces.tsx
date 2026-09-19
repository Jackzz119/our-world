// world-surfaces.tsx — every modal surface the shell can put over the scene,
// mounted in one place and switched by the router's `screen` key. Split out of
// WorldPage (shell-structure-review.md §2.2 S6): the surfaces all stay mounted
// and animate themselves in and out, so this is a mounting point, not a switch.
// The chat hub (channel-screen) is not here — it belongs to the chat domain.
import type { Dispatch, SetStateAction } from 'react';
import { SubScreen, type SurfaceOrigin, type TabKey } from '@/themes/cinnaglass/screens';
import { CalendarScreen, ClockScreen } from '@/themes/cinnaglass/calendar';
import { SettingsScreen } from '@/themes/cinnaglass/settings';
import { WorldSettingsScreen } from '@/themes/cinnaglass/world-settings';
import type { Alarm, CalEvent, Profile, Weather } from '@/themes/cinnaglass/model';
import type { SetTweak, Tweaks } from '@/themes/cinnaglass/tweaks';
import type { World } from '@/types/feed';

type WorldSurfacesProps = {
    /** the open surface's key, or null for none */
    screen: string | null;
    /** `screen` when it names one of SubScreen's own tabs */
    tab: TabKey | null;
    /** where the SubScreen modal should grow from */
    origin: SurfaceOrigin | null;
    onClose: () => void;
    /** the couple's anniversary, as WorldPage composes it (DB row first) */
    anniv: string | null;
    events: CalEvent[];
    setEvents: Dispatch<SetStateAction<CalEvent[]>>;
    alarms: Alarm[];
    setAlarms: Dispatch<SetStateAction<Alarm[]>>;
    nowTs: number;
    weather: Weather;
    t: Tweaks;
    setTweak: SetTweak;
    profile: Profile;
    setProfile: Dispatch<SetStateAction<Profile>>;
    world: World | null;
    worldIconUrl: string | null;
    onWorldSaved: (w: World) => void;
};

export function WorldSurfaces({
    screen,
    tab,
    origin,
    onClose,
    anniv,
    events,
    setEvents,
    alarms,
    setAlarms,
    nowTs,
    weather,
    t,
    setTweak,
    profile,
    setProfile,
    world,
    worldIconUrl,
    onWorldSaved
}: WorldSurfacesProps) {
    return (
        <>
            <SubScreen screen={tab} origin={origin} onClose={onClose} />
            <CalendarScreen
                open={screen === 'calendar'}
                onClose={onClose}
                anniv={anniv}
                events={events}
                setEvents={setEvents}
            />
            <ClockScreen
                open={screen === 'clock'}
                onClose={onClose}
                nowTs={nowTs}
                weather={weather}
                alarms={alarms}
                setAlarms={setAlarms}
            />
            <SettingsScreen
                open={screen === 'settings'}
                onClose={onClose}
                t={t}
                setTweak={setTweak}
                profile={profile}
                setP={setProfile}
            />
            <WorldSettingsScreen
                open={screen === 'world-settings'}
                onClose={onClose}
                world={world}
                iconUrl={worldIconUrl}
                onSaved={onWorldSaved}
            />
        </>
    );
}
