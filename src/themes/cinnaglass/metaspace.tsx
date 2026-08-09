// metaspace.tsx — R3F 3D scene: the cloud-castle cottage with two pup avatars.
// Mounts inside WorldPage's .stage (replaces the 2D RoomScene placeholder).
// - WASD/arrows move the player pup, space jumps; rapier physics gives real
//   collision against the house trimesh (walls / furniture).
// - FIXED PER-ROOM CAMERAS (2026-07-13 decision, replaces the follow camera):
//   this is a background presence surface, not an immersive game, so each zone
//   gets one hand-framed shot and the camera slides between them. See
//   ai/Features/metaspace-controls/controls.md.
// - Hotspot meshes ("HS_" names) click through onHotspot → WorldPage popups.
// - drei <Html> chat bubble above the head; Enter types, 1 waves.
// - `active` gates all scene shortcuts (UI-layer-open ⇒ scene keys disabled,
//   per the layering rule in ai/PROJECT.md 2026-07-04).
// Pup animations are procedural (GLB carries static named nodes only).
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, type ThreeEvent } from '@react-three/fiber';
// deep import keeps the vite pre-bundle small (full drei bundle trips the AV
// file-write block on this machine — see vite.config.ts)
import { Html } from '@react-three/drei/web/Html';
import { Physics, RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as THREE from 'three';

const SCENE_URL = '/models/metaspace.glb';
const PUP_URL = '/models/avatar-cloudpup.glb';

const draco = new DRACOLoader();
draco.setDecoderPath('/draco/');
const withDraco = (loader: GLTFLoader) => loader.setDRACOLoader(draco);

// the pup GLB faces -Z after Blender's Y-up export; +PI turns it to the
// direction of travel (it walked backwards before this offset)
const FACING_OFFSET = Math.PI;

// lerp between angles along the SHORTEST arc — plain lerp spins the long way
// around when the delta crosses ±180° (forward→left used to go clockwise 270°)
const lerpAngle = (a: number, b: number, t: number) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
};

// ── camera zones ────────────────────────────────────────────────────────────
// World axes after the Blender Y-up export: +X east, +Z south, +Y up.
// Interior spans x ∈ [-8, 8], z ∈ [-5.5, 5.5]; loft floor sits at y ≈ 2.9.
// Every camera sits SOUTH of its zone looking north, so a single cutaway list
// (south shell + roof) frames all of them like a dollhouse.
type Zone = {
    id: string;
    label: string;
    rect: [number, number, number, number]; // minX, minZ, maxX, maxZ
    upstairs: boolean;
    target: [number, number, number];
    height: number; // absolute camera Y
    depth: number; // camera distance south of the target
    hide: string[]; // extra hide prefixes for this framing
};

const BASE_HIDE = [
    'House_Wall_S', 'House_Roof', 'House_Door_S', 'House_Porch_Roof',
    'House_Win_S_', 'House_Round_S_', 'House_Smoke', 'House_FlowerBox',
    'House_Flower_', 'House_FlowerLeaf_', 'House_Tower', 'House_Band_S',
    'House_Plinth_S', 'House_ShutN_'
];

const ZONES: Zone[] = [
    {
        id: 'living', label: '起居区', rect: [-8, 0, 2, 5.6], upstairs: false,
        target: [-4.6, 0.7, 1.8], height: 6.4, depth: 4.7, hide: ['Loft_']
    },
    {
        id: 'kitchen', label: '厨房', rect: [-8, -5.6, 2, 0], upstairs: false,
        target: [-5.2, 0.7, -2.6], height: 6.4, depth: 4.7, hide: ['Loft_']
    },
    {
        id: 'game', label: '游戏室', rect: [2, -2.2, 8, 5.6], upstairs: false,
        target: [5.0, 0.7, 1.2], height: 6.2, depth: 4.8, hide: ['Loft_']
    },
    {
        id: 'gallery', label: '照片长廊', rect: [2, -5.6, 8, -2.2], upstairs: false,
        target: [5.0, 1.1, -3.9], height: 5.4, depth: 4.2, hide: ['Loft_', 'House_Part_G']
    },
    {
        id: 'loft', label: '阁楼', rect: [-8, -5.6, 0, 5.6], upstairs: true,
        target: [-4.2, 3.5, -0.5], height: 11.0, depth: 5.8, hide: []
    }
];

const LOFT_Y = 2.4; // above this the player is upstairs
const PARALLAX = 0.12; // how much the shot drifts toward the player (never follows)

const zoneAt = (x: number, y: number, z: number, fallback: Zone) => {
    const up = y > LOFT_Y;
    return (
        ZONES.find(
            (zn) =>
                zn.upstairs === up &&
                x >= zn.rect[0] && x <= zn.rect[2] && z >= zn.rect[1] && z <= zn.rect[3]
        ) ?? fallback
    );
};

// flat / thin decorations must not cast shadows — they are the worst offenders
// for shadow acne and contribute nothing to the lighting
const NO_CAST = [
    'House_Plank_', 'Loft_Plank_', 'House_Roof_Shingle_', 'Shell_Rug', 'Living_Rug',
    'Game_Rug', 'Loft_Rug', 'Gallery_Runner', 'Gallery_PhotoInner_', 'Loft_PhotoInner_',
    'Garden_Sprout_', 'Yard_Path', 'Garden_Path'
];

type PupHandle = {
    group: THREE.Group | null;
    speed: number; // current planar speed, drives the walk animation
    waveT: number; // >0 while the wave emote is playing
};

const Pup = ({
    who,
    handle,
    position,
    bubble
}: {
    who: 'me' | 'partner';
    handle: PupHandle;
    position: [number, number, number];
    bubble: string | null;
}) => {
    const { scene } = useLoader(GLTFLoader, PUP_URL);
    const cloned = useMemo(() => {
        const c = scene.clone(true);
        // partner recolor: the accent material (ears/tail) goes blush pink
        if (who === 'partner') {
            const pink = new THREE.Color('#f0a8bc');
            c.traverse((o) => {
                const mesh = o as THREE.Mesh;
                if (!mesh.isMesh) return;
                const m = mesh.material as THREE.MeshStandardMaterial;
                if (m?.name === 'AV_accent') {
                    const clonedMat = m.clone();
                    clonedMat.color = pink;
                    mesh.material = clonedMat;
                }
            });
        }
        c.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        });
        return c;
    }, [scene, who]);

    const group = useRef<THREE.Group>(null);
    const t0 = useMemo(() => Math.random() * 10, []);

    useEffect(() => {
        handle.group = group.current;
    });

    useFrame(({ clock }) => {
        const root = group.current;
        if (!root) return;
        const find = (n: string) => root.getObjectByName(n);
        const t = clock.elapsedTime + t0;
        const moving = handle.speed > 0.05;
        const bob = Math.sin(t * (moving ? 9 : 2)) * (moving ? 0.05 : 0.025);
        const body = find('Pup_Body');
        const head = find('Pup_Head');
        const earL = find('Pup_Ear_L');
        const earR = find('Pup_Ear_R');
        const tail = find('Pup_Tail');
        if (body) body.position.y = 0.38 + bob;
        if (head) head.position.y = 0.78 + bob * 1.25;
        const earSway = Math.sin(t * (moving ? 9 : 2.2)) * (moving ? 0.3 : 0.1);
        if (earL) earL.rotation.x = earSway;
        if (earR && handle.waveT <= 0) {
            earR.rotation.x = earSway;
            earR.rotation.z = 0;
        }
        // wave emote: big friendly ear swing, overrides the right ear
        if (handle.waveT > 0 && earR) {
            handle.waveT -= 1 / 60;
            earR.rotation.z = Math.sin(handle.waveT * 14) * 1.1;
        }
        if (tail) tail.rotation.y = Math.sin(t * 4) * 0.35;
    });

    return (
        <group ref={group} position={position}>
            <primitive object={cloned} />
            {bubble && (
                <Html position={[0, 1.5, 0]} center distanceFactor={9} zIndexRange={[30, 0]}>
                    <div className="ms-bubble">{bubble}</div>
                </Html>
            )}
        </group>
    );
};

const SceneModel = ({
    onHotspot,
    hide
}: {
    onHotspot?: (id: MetaspaceHotspot) => void;
    hide: string[];
}) => {
    const { scene } = useLoader(GLTFLoader, SCENE_URL, withDraco);

    useEffect(() => {
        scene.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.receiveShadow = true;
            mesh.castShadow = !NO_CAST.some((p) => o.name.startsWith(p));
        });
    }, [scene]);

    // the active zone decides which shell pieces are cut away
    useEffect(() => {
        scene.traverse((o) => {
            o.visible = !hide.some((p) => o.name.startsWith(p));
        });
    }, [scene, hide]);

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        const m = e.object.name.match(/HS_(Composer|PhotoWall|Wishlist)/);
        if (m && onHotspot) {
            e.stopPropagation();
            onHotspot(m[1] as MetaspaceHotspot);
        }
    };
    return <primitive object={scene} onClick={handleClick} />;
};

export type MetaspaceHotspot = 'Composer' | 'PhotoWall' | 'Wishlist';

// keyboard state shared with the frame loop; inert while `active` is false
const useKeys = (active: boolean) => {
    const keys = useRef<Record<string, boolean>>({});
    useEffect(() => {
        if (!active) {
            keys.current = {};
            return;
        }
        const down = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
            keys.current[e.key.toLowerCase()] = true;
        };
        const up = (e: KeyboardEvent) => {
            keys.current[e.key.toLowerCase()] = false;
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, [active]);
    return keys;
};

const CAPSULE = { halfHeight: 0.25, radius: 0.3 }; // → centre sits at y 0.55

const Player = ({
    handle,
    active,
    bubble,
    posRef,
    onZone
}: {
    handle: PupHandle;
    active: boolean;
    bubble: string | null;
    posRef: React.RefObject<THREE.Vector3>;
    onZone: (id: string) => void;
}) => {
    const keys = useKeys(active);
    const body = useRef<RapierRigidBody>(null);
    const yaw = useRef(FACING_OFFSET); // face the camera on spawn
    const jumpHeld = useRef(false); // edge-trigger so holding space doesn't bounce
    const lastZone = useRef('living');

    const JUMP_SPEED = 4.6;

    useFrame((_, dt) => {
        const rb = body.current;
        if (!rb) return;
        const k = keys.current;
        const dir = new THREE.Vector3(
            (k['d'] || k['arrowright'] ? 1 : 0) - (k['a'] || k['arrowleft'] ? 1 : 0),
            0,
            (k['s'] || k['arrowdown'] ? 1 : 0) - (k['w'] || k['arrowup'] ? 1 : 0)
        );
        const speed = 2.6;
        if (dir.lengthSq() > 0) {
            dir.normalize();
            yaw.current = Math.atan2(dir.x, dir.z) + FACING_OFFSET;
            handle.speed = speed;
        } else {
            handle.speed = 0;
        }
        // physics drives position: keep vertical velocity (gravity), set planar;
        // jump = vertical impulse when grounded (vy ≈ 0), edge-triggered
        const vy = rb.linvel().y;
        const grounded = Math.abs(vy) < 0.08;
        if (k[' '] && grounded && !jumpHeld.current) {
            jumpHeld.current = true;
            rb.setLinvel({ x: dir.x * speed, y: JUMP_SPEED, z: dir.z * speed }, true);
        } else {
            rb.setLinvel({ x: dir.x * speed, y: vy, z: dir.z * speed }, true);
        }
        if (!k[' ']) jumpHeld.current = false;

        const t = rb.translation();
        posRef.current.set(t.x, t.y, t.z);
        if (handle.group) {
            handle.group.position.set(t.x, t.y - (CAPSULE.halfHeight + CAPSULE.radius), t.z);
            handle.group.rotation.y = lerpAngle(
                handle.group.rotation.y,
                yaw.current,
                Math.min(1, dt * 10)
            );
        }
        // room change → the parent swaps the camera framing and cutaway
        const zn = zoneAt(t.x, t.y, t.z, ZONES[0]);
        if (zn.id !== lastZone.current) {
            lastZone.current = zn.id;
            onZone(zn.id);
        }
    });

    return (
        <>
            <RigidBody
                ref={body}
                position={[0, 0.7, 2.5]}
                colliders={false}
                enabledRotations={[false, false, false]}
                linearDamping={2}
            >
                <CapsuleCollider args={[CAPSULE.halfHeight, CAPSULE.radius]} friction={0} />
            </RigidBody>
            <Pup who="me" handle={handle} position={[0, 0, 2.5]} bubble={bubble} />
        </>
    );
};

// fixed framing per zone; slides (never follows) when the player changes room
const CameraRig = ({ zone, posRef }: { zone: Zone; posRef: React.RefObject<THREE.Vector3> }) => {
    const look = useRef(new THREE.Vector3(...zone.target));
    const want = useMemo(() => new THREE.Vector3(), []);
    useFrame(({ camera }, dt) => {
        const p = posRef.current;
        // gentle parallax keeps the shot alive without turning into a follow cam
        const tx = zone.target[0] + THREE.MathUtils.clamp((p.x - zone.target[0]) * PARALLAX, -1.2, 1.2);
        const tz = zone.target[2] + THREE.MathUtils.clamp((p.z - zone.target[2]) * PARALLAX, -1.0, 1.0);
        want.set(tx, zone.height, tz + zone.depth);
        const k = Math.min(1, dt * 2.4); // slow slide between rooms
        camera.position.lerp(want, k);
        look.current.lerp(new THREE.Vector3(tx, zone.target[1], tz), k);
        camera.lookAt(look.current);
    });
    return null;
};

export const MetaspaceScene = ({
    onHotspot,
    active = true
}: {
    onHotspot?: (id: MetaspaceHotspot) => void;
    active?: boolean;
}) => {
    const me = useRef<PupHandle>({ group: null, speed: 0, waveT: 0 }).current;
    const partner = useRef<PupHandle>({ group: null, speed: 0, waveT: 0 }).current;
    const posRef = useRef(new THREE.Vector3(0, 0.7, 2.5));
    const [zoneId, setZoneId] = useState('living');
    const [bubble, setBubble] = useState<string | null>(null);
    const [typing, setTyping] = useState(false);
    const [draft, setDraft] = useState('');
    const bubbleTimer = useRef<number>(0);

    const zone = useMemo(() => ZONES.find((z) => z.id === zoneId) ?? ZONES[0], [zoneId]);
    const hide = useMemo(() => [...BASE_HIDE, ...zone.hide], [zone]);

    useEffect(() => {
        if (!active) return;
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
            if (e.key === 'Enter') setTyping(true);
            if (e.key === '1') me.waveT = 1.6; // wave emote
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active, me]);

    const send = () => {
        const text = draft.trim();
        setTyping(false);
        setDraft('');
        if (!text) return;
        setBubble(text);
        window.clearTimeout(bubbleTimer.current);
        bubbleTimer.current = window.setTimeout(() => setBubble(null), 5000);
    };

    return (
        <div className="ms-stage">
            <Canvas shadows camera={{ fov: 42, position: [-4, 8, 8.4], near: 0.5, far: 120 }}>
                <color attach="background" args={['#bfe3f5']} />
                <fog attach="fog" args={['#bfe3f5', 30, 70]} />
                <ambientLight intensity={0.55} color="#dceefb" />
                <directionalLight
                    position={[6, 12, -8]}
                    intensity={1.6}
                    color="#fff3dd"
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-camera-left={-16}
                    shadow-camera-right={16}
                    shadow-camera-top={16}
                    shadow-camera-bottom={-16}
                    // depth precision must cover the house, not three.js's default
                    // 500-unit range — that spread is what caused the shadow-acne
                    // ripples across the floor
                    shadow-camera-near={1}
                    shadow-camera-far={44}
                    shadow-normalBias={0.05}
                    shadow-bias={-0.0004}
                />
                {/* fireplace glow — west wall, SOUTH half (+Z); the old -2 put it
                    in the kitchen by mistake */}
                <pointLight position={[-7.3, 0.7, 2.0]} intensity={14} color="#f7b27a" distance={9} />
                <Suspense fallback={null}>
                    <Physics gravity={[0, -9.81, 0]}>
                        <RigidBody type="fixed" colliders="trimesh">
                            <SceneModel onHotspot={onHotspot} hide={hide} />
                        </RigidBody>
                        <Player
                            handle={me}
                            active={active}
                            bubble={bubble}
                            posRef={posRef}
                            onZone={setZoneId}
                        />
                        {/* partner: static capsule so you can't walk through her */}
                        <RigidBody type="fixed" colliders={false} position={[-2.2, 0.7, -1.2]}>
                            <CapsuleCollider args={[CAPSULE.halfHeight, CAPSULE.radius]} />
                        </RigidBody>
                        <Pup who="partner" handle={partner} position={[-2.2, 0, -1.2]} bubble={null} />
                    </Physics>
                    <CameraRig zone={zone} posRef={posRef} />
                </Suspense>
            </Canvas>
            {typing && active && (
                <div className="ms-say glass">
                    <input
                        autoFocus
                        value={draft}
                        placeholder="说点什么…（Enter 发送 / Esc 取消）"
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') send();
                            if (e.key === 'Escape') {
                                setTyping(false);
                                setDraft('');
                            }
                        }}
                    />
                </div>
            )}
            <div className="ms-help glass">
                <b>{zone.label}</b> · WASD 移动 · 空格跳跃 · Enter 说话 · 1 挥手 · 点击书桌/相框/许愿罐
            </div>
            <MetaspaceStyles />
        </div>
    );
};

const MetaspaceStyles = () => (
    <style>{`
    .ms-stage { position: absolute; inset: 0; }
    .ms-bubble {
        max-width: 220px; padding: 8px 14px; border-radius: 16px 16px 16px 4px;
        background: rgba(255,255,255,.92); border: 1px solid rgba(255,255,255,.9);
        color: var(--navy-1, #2a3a5e); font-size: 14px; line-height: 1.45;
        box-shadow: 0 6px 18px -6px rgba(30,42,71,.35); white-space: pre-wrap;
    }
    .ms-say {
        position: absolute; left: 50%; bottom: 46px; transform: translateX(-50%);
        border-radius: 999px; padding: 8px 10px; width: min(420px, 80%); z-index: 5;
    }
    .ms-say input {
        width: 100%; border: 0; outline: 0; background: transparent;
        font: inherit; color: var(--glass-text); padding: 4px 10px;
    }
    .ms-help {
        position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%);
        border-radius: 999px; padding: 4px 16px; font-size: 12px;
        color: var(--glass-sub); pointer-events: none; white-space: nowrap;
    }
    .ms-help b { color: var(--glass-text); font-weight: 700; }
    `}</style>
);
