-- Lets a signed-in user delete their own account from the app (required by the App Store).
-- Deleting the auth user cascades to every row in profiles, workouts, routines and weights.
-- Runs as the function owner, since `authenticated` can't touch auth.users directly.
create function public.delete_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
