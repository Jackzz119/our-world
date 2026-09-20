// useWorldSession.ts — the world the two of you share (DB `worlds` row; schema
// in ai/PROJECT.md, 数据库 section) and the lobby flow around it: fetch, create,
// enter, leave, plus the members' display names and the world icon's signed
// URL. Split out of WorldPage (shell-structure-review.md §2.2 S3). Not to be
// confused with the in-scene room, which is local-only.
import { useEffect, useState } from 'react';
import type { LobbyStatus } from '@/themes/cinnaglass/lobby';
import { getMyWorld, createWorld } from '@/lib/worlds';
import { signImageUrls } from '@/lib/storage';
import { getProfilesByIds } from '@/lib/profiles';
import type { FeedProfile, World } from '@/types/feed';

// The world icon lives in the private memories bucket, so display needs a
// signed URL whose TTL is 1h. Re-sign on this margin so a long-lived tab never
// shows a broken icon (same margin the timeline uses for its images).
const ICON_RESIGN_MS = 40 * 60 * 1000;

// `autoEnter` walks straight past the lobby once a world is known — a dev
// convenience (VITE_AUTO_ENTER / ?enter=1); players always enter by hand.
export function useWorldSession(autoEnter: boolean) {
    const [world, setWorld] = useState<World | null>(null);
    const [uid, setUid] = useState<string | null>(null);
    // DB profiles of the world's members, by id — display names for the
    // chrome and for chat message authorship; the caller falls back to the
    // localStorage profile until these arrive (or on failure)
    const [profiles, setProfiles] = useState<Record<string, FeedProfile>>({});
    const [memberNames, setMemberNames] = useState<{ me?: string; her?: string }>({});
    const [lobbyStatus, setLobbyStatus] = useState<LobbyStatus>('loading');
    const [lobbyError, setLobbyError] = useState<string | null>(null);
    const [lobbyBusy, setLobbyBusy] = useState(false);
    // Entering the world is explicit (portal click) unless autoEnter is on.
    const [entered, setEntered] = useState(false);
    const [lobbyTick, setLobbyTick] = useState(0);

    useEffect(() => {
        let cancelled = false;
        getMyWorld()
            .then(({ world, userId }) => {
                if (cancelled) return;
                setWorld(world);
                setUid(userId);
                setLobbyStatus('ready');
                if (autoEnter && world) setEntered(true);
            })
            .catch((e: unknown) => {
                if (cancelled) return;
                setLobbyError(e instanceof Error ? e.message : String(e));
                setLobbyStatus('error');
            });
        return () => {
            cancelled = true;
        };
        // autoEnter is a module constant at the call site, so in practice only
        // lobbyTick ever re-runs this.
    }, [lobbyTick, autoEnter]);

    // Signed display URL for world.icon_path. Kept keyed off the path so a
    // world without an icon reads as null without clearing state in an effect.
    const iconPath = world?.icon_path ?? null;
    const [signedIcon, setSignedIcon] = useState<string | null>(null);
    const worldIconUrl = iconPath ? signedIcon : null;
    useEffect(() => {
        if (!iconPath) return;
        let cancelled = false;
        const sign = () =>
            signImageUrls([iconPath])
                .then((m) => {
                    if (!cancelled) setSignedIcon(m[iconPath] ?? null);
                })
                .catch(() => {
                    /* keep the last URL; emoji/letter fallback covers first load */
                });
        sign();
        const id = setInterval(sign, ICON_RESIGN_MS);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [iconPath]);

    // Identity lives in the DB (ai/features/supabase.md). Fetch the two members'
    // display names once the world is known; render keeps working off the
    // caller's localStorage fallback if this fails.
    useEffect(() => {
        if (!world) return;
        let cancelled = false;
        getProfilesByIds([world.owner_id, world.member_id])
            .then((m) => {
                if (cancelled) return;
                setProfiles(m);
                const otherId = [world.owner_id, world.member_id].find((i) => i && i !== uid);
                setMemberNames({
                    me: (uid && m[uid]?.display_name) || undefined,
                    her: (otherId && m[otherId]?.display_name) || undefined
                });
            })
            .catch(() => {
                /* keep localStorage names */
            });
        return () => {
            cancelled = true;
        };
    }, [world, uid]);

    // Lobby → world flow. retryLobby resets in the event handler (not the
    // effect body) and bumps the tick so the effect refetches.
    const retryLobby = () => {
        setLobbyStatus('loading');
        setLobbyError(null);
        setLobbyTick((n) => n + 1);
    };
    // Explicit entry. With no known world we re-fetch instead of failing — the
    // partner may have created one since the last check.
    const enterWorld = () => {
        if (world) setEntered(true);
        else retryLobby(); // a world may have appeared elsewhere — re-check
    };
    // Create the world and walk straight in. Errors surface on the lobby card;
    // lobbyBusy blocks a double-create (the DB also rejects a second world per user).
    const createAndEnter = async () => {
        setLobbyBusy(true);
        setLobbyError(null);
        try {
            const created = await createWorld();
            setWorld(created);
            setEntered(true);
        } catch (e) {
            setLobbyError(e instanceof Error ? e.message : String(e));
        } finally {
            setLobbyBusy(false);
        }
    };
    // Back to the lobby. Only the session's own state is touched here — closing
    // the surfaces and the chat card is the caller's business (they belong to
    // other domains). Voice + shared music will auto-disconnect here once they
    // exist.
    const leaveWorld = () => setEntered(false);
    // World settings saved: swap in the fresh DB row so the chrome updates at
    // once. Syncing the localStorage profile buffer is again the caller's.
    const applySavedWorld = (w: World) => setWorld(w);
    // My display name was written to profiles: update the member names and the
    // profiles map (chat authorship reads it) without a refetch.
    const applyMyName = (name: string) => {
        setMemberNames((m) => ({ ...m, me: name }));
        if (uid) setProfiles((p) => ({ ...p, [uid]: { ...p[uid], id: uid, display_name: name } }));
    };

    return {
        world,
        uid,
        profiles,
        memberNames,
        worldIconUrl,
        lobbyStatus,
        lobbyError,
        lobbyBusy,
        entered,
        enterWorld,
        createAndEnter,
        retryLobby,
        leaveWorld,
        applySavedWorld,
        applyMyName
    };
}
