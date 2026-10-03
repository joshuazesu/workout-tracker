-- Whether to show BMI on Profile (Settings → Details).
alter table public.profiles add column show_bmi boolean not null default true;
