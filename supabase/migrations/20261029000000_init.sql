-- Angelite v1 schema: profiles + quotas, cloned voices, generation history, private storage.
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.

-- ---------------------------------------------------------------------------
-- Profiles and monthly character quota
-- ---------------------------------------------------------------------------

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text check (char_length(display_name) <= 80),
    plan text not null default 'free',
    monthly_character_limit integer not null default 10000,
    characters_used integer not null default 0,
    usage_period_start date not null default date_trunc('month', now())::date,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
    on public.profiles for select to authenticated
    using ((select auth.uid()) = id);

create policy "Users can update their own profile"
    on public.profiles for update to authenticated
    using ((select auth.uid()) = id);

-- Users may only change their display name; plan and usage are server-controlled.
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name)
    values (new.id, new.raw_user_meta_data ->> 'display_name');
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Users who signed up before this migration ran.
insert into public.profiles (id, display_name)
select id, raw_user_meta_data ->> 'display_name' from auth.users
on conflict (id) do nothing;

-- Adds characters to the caller's usage, starting a new period each calendar month.
-- Only increments (n > 0), so calling it directly can only use up your own quota.
create function public.record_character_usage(n integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    used integer;
begin
    if n is null or n <= 0 then
        raise exception 'n must be positive';
    end if;

    update public.profiles
    set characters_used = case
            when usage_period_start < date_trunc('month', now())::date then n
            else characters_used + n
        end,
        usage_period_start = date_trunc('month', now())::date
    where id = auth.uid()
    returning characters_used into used;

    return used;
end;
$$;

revoke execute on function public.record_character_usage(integer) from public, anon;
grant execute on function public.record_character_usage(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Cloned voices
-- ---------------------------------------------------------------------------

create table public.voices (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    name text not null check (char_length(name) between 1 and 60),
    model text not null default 'turbo' check (model in ('turbo', 'multilingual')),
    language text not null default 'en',
    sample_path text not null,
    consent_statement text not null,
    consented_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index voices_user_id_idx on public.voices (user_id, created_at desc);

alter table public.voices enable row level security;

create policy "Users can read their own voices"
    on public.voices for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can create their own voices"
    on public.voices for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Users can rename their own voices"
    on public.voices for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users can delete their own voices"
    on public.voices for delete to authenticated
    using ((select auth.uid()) = user_id);

-- Free plan: at most 3 cloned voices per user.
create function public.enforce_voice_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if (select count(*) from public.voices where user_id = new.user_id) >= 3 then
        raise exception 'Voice limit reached (3 on the free plan)' using errcode = 'P0001';
    end if;
    return new;
end;
$$;

create trigger voices_enforce_limit
    before insert on public.voices
    for each row execute function public.enforce_voice_limit();

-- ---------------------------------------------------------------------------
-- Generation history
-- ---------------------------------------------------------------------------

create table public.generations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    text text not null,
    voice_type text not null check (voice_type in ('preset', 'cloned')),
    voice_id text not null,
    voice_name text not null,
    model text not null,
    format text not null check (format in ('mp3', 'opus', 'wav')),
    audio_path text not null,
    duration_seconds real,
    characters integer not null check (characters > 0),
    created_at timestamptz not null default now()
);

create index generations_user_id_idx on public.generations (user_id, created_at desc);
create index generations_created_at_idx on public.generations (created_at);

alter table public.generations enable row level security;

create policy "Users can read their own generations"
    on public.generations for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can create their own generations"
    on public.generations for insert to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Users can delete their own generations"
    on public.generations for delete to authenticated
    using ((select auth.uid()) = user_id);

-- Explicit Data API grants (RLS above still decides which rows are visible).
grant select on public.profiles to authenticated;
grant select, insert, delete on public.voices, public.generations to authenticated;
grant update (name) on public.voices to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private buckets, files live under <user id>/...
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('voice-samples', 'voice-samples', false, 10485760, array['audio/*', 'video/webm']),
    ('generations', 'generations', false, 10485760, array['audio/*']);

create policy "Users can read their own audio files"
    on storage.objects for select to authenticated
    using (
        bucket_id in ('voice-samples', 'generations')
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Users can upload their own audio files"
    on storage.objects for insert to authenticated
    with check (
        bucket_id in ('voice-samples', 'generations')
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

create policy "Users can delete their own audio files"
    on storage.objects for delete to authenticated
    using (
        bucket_id in ('voice-samples', 'generations')
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );
