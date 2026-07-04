-- dev-create-world.sql
-- One-off dev setup for a TWO-person world (owner + member). Replace the two
-- emails below with yours. Both users must have registered AND confirmed their
-- email first (project has email confirmation on).
--
-- NOTE: Solo worlds are created by the app ("创建世界" in the lobby:
-- createWorld — owner = current user, member null, status 'pending'). You only
-- need this script to manually pair a second person into a world until the
-- Discord-style "invite a member" UI lands. See ai/Features/room.md R-6.
--
-- Run in Supabase SQL Editor (or via MCP execute_sql once authenticated).

-- 1) Confirm both users exist & are confirmed (should return 2 rows).
select id, email, email_confirmed_at
from auth.users
where email in ('YOU@example.com', 'PARTNER@example.com');

-- 2) Create the world. owner_id / member_id are role-ordered (no uuid
--    ordering); setting member_id makes it a two-person world, so status must
--    be 'active' (constraint: a non-pending world requires a member).
--    check_world_uniqueness blocks a user who already belongs to another world.
with u as (
    select id, email from auth.users
    where email in ('YOU@example.com', 'PARTNER@example.com')
)
insert into public.worlds (owner_id, member_id, status)
select
    (select id from u where email = 'YOU@example.com'),
    (select id from u where email = 'PARTNER@example.com'),
    'active';

-- 3) Verify (should return 1 row).
select * from public.worlds;
