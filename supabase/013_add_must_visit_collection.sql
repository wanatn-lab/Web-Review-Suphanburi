-- A review retains its original category and can additionally be pinned to
-- the editorial "must visit" collection. These RPCs are server-only and make
-- pinning and a full reorder transactional.
alter table public.reviews
  add column if not exists is_must_visit boolean not null default false,
  add column if not exists must_visit_order integer;

create index if not exists reviews_must_visit_order_idx
  on public.reviews (must_visit_order asc nulls last, created_at desc)
  where is_must_visit = true and deleted_at is null;

create or replace function public.set_must_visit(target_review_id uuid, should_pin boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('reviews_must_visit_order'));

  if should_pin then
    update public.reviews
    set is_must_visit = true,
        must_visit_order = (select coalesce(max(must_visit_order), 0) + 10 from public.reviews where is_must_visit = true and deleted_at is null)
    where id = target_review_id and deleted_at is null;
  else
    update public.reviews
    set is_must_visit = false, must_visit_order = null
    where id = target_review_id and deleted_at is null;
  end if;

  if not found then raise exception 'review not found'; end if;
end;
$$;

create or replace function public.reorder_must_visit(review_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('reviews_must_visit_order'));
  if coalesce(array_length(review_ids, 1), 0) > 100 then raise exception 'too many reviews'; end if;
  if (select count(distinct input.id) from unnest(review_ids) as input(id)) <> coalesce(array_length(review_ids, 1), 0) then raise exception 'duplicate review id'; end if;

  if (select count(*) from public.reviews where id = any(review_ids) and is_must_visit = true and deleted_at is null) <> coalesce(array_length(review_ids, 1), 0) then raise exception 'review list changed'; end if;

  update public.reviews as review
  set must_visit_order = (ranked.position * 10)::integer
  from unnest(review_ids) with ordinality as ranked(id, position)
  where review.id = ranked.id;
end;
$$;

revoke all on function public.set_must_visit(uuid, boolean) from public, anon, authenticated;
revoke all on function public.reorder_must_visit(uuid[]) from public, anon, authenticated;
grant execute on function public.set_must_visit(uuid, boolean) to service_role;
grant execute on function public.reorder_must_visit(uuid[]) to service_role;