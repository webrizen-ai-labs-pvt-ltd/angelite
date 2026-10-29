-- Pro plan: unlimited characters and cloned voices. Assigned by hand (no billing yet):
--   update public.profiles set plan = 'pro'
--   where id = (select id from auth.users where email = 'someone@example.com');

alter table public.profiles
    add constraint profiles_plan_check check (plan in ('free', 'pro'));

create or replace function public.enforce_voice_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if (select plan from public.profiles where id = new.user_id) = 'pro' then
        return new;
    end if;
    if (select count(*) from public.voices where user_id = new.user_id) >= 3 then
        raise exception 'Voice limit reached (3 on the free plan)' using errcode = 'P0001';
    end if;
    return new;
end;
$$;
