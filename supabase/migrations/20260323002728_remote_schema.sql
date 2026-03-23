drop extension if exists "pg_net";


  create table "public"."boards" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "created_at" timestamp with time zone default now(),
    "user_id" uuid
      );


alter table "public"."boards" enable row level security;


  create table "public"."cards" (
    "id" uuid not null default gen_random_uuid(),
    "board_id" uuid,
    "column_name" text,
    "title" text not null,
    "description" text,
    "position" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."cards" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "full_name" text not null,
    "email" text not null,
    "avatar_url" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."profiles" enable row level security;

CREATE UNIQUE INDEX boards_pkey ON public.boards USING btree (id);

CREATE UNIQUE INDEX cards_pkey ON public.cards USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

alter table "public"."boards" add constraint "boards_pkey" PRIMARY KEY using index "boards_pkey";

alter table "public"."cards" add constraint "cards_pkey" PRIMARY KEY using index "cards_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."boards" add constraint "boards_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."boards" validate constraint "boards_user_id_fkey";

alter table "public"."cards" add constraint "cards_board_id_fkey" FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE not valid;

alter table "public"."cards" validate constraint "cards_board_id_fkey";

alter table "public"."cards" add constraint "cards_column_name_check" CHECK ((column_name = ANY (ARRAY['todo'::text, 'in_progress'::text, 'done'::text]))) not valid;

alter table "public"."cards" validate constraint "cards_column_name_check";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$function$
;

grant delete on table "public"."boards" to "anon";

grant insert on table "public"."boards" to "anon";

grant references on table "public"."boards" to "anon";

grant select on table "public"."boards" to "anon";

grant trigger on table "public"."boards" to "anon";

grant truncate on table "public"."boards" to "anon";

grant update on table "public"."boards" to "anon";

grant delete on table "public"."boards" to "authenticated";

grant insert on table "public"."boards" to "authenticated";

grant references on table "public"."boards" to "authenticated";

grant select on table "public"."boards" to "authenticated";

grant trigger on table "public"."boards" to "authenticated";

grant truncate on table "public"."boards" to "authenticated";

grant update on table "public"."boards" to "authenticated";

grant delete on table "public"."boards" to "service_role";

grant insert on table "public"."boards" to "service_role";

grant references on table "public"."boards" to "service_role";

grant select on table "public"."boards" to "service_role";

grant trigger on table "public"."boards" to "service_role";

grant truncate on table "public"."boards" to "service_role";

grant update on table "public"."boards" to "service_role";

grant delete on table "public"."cards" to "anon";

grant insert on table "public"."cards" to "anon";

grant references on table "public"."cards" to "anon";

grant select on table "public"."cards" to "anon";

grant trigger on table "public"."cards" to "anon";

grant truncate on table "public"."cards" to "anon";

grant update on table "public"."cards" to "anon";

grant delete on table "public"."cards" to "authenticated";

grant insert on table "public"."cards" to "authenticated";

grant references on table "public"."cards" to "authenticated";

grant select on table "public"."cards" to "authenticated";

grant trigger on table "public"."cards" to "authenticated";

grant truncate on table "public"."cards" to "authenticated";

grant update on table "public"."cards" to "authenticated";

grant delete on table "public"."cards" to "service_role";

grant insert on table "public"."cards" to "service_role";

grant references on table "public"."cards" to "service_role";

grant select on table "public"."cards" to "service_role";

grant trigger on table "public"."cards" to "service_role";

grant truncate on table "public"."cards" to "service_role";

grant update on table "public"."cards" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";


  create policy "users own boards"
  on "public"."boards"
  as permissive
  for all
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "users own cards"
  on "public"."cards"
  as permissive
  for all
  to public
using ((board_id IN ( SELECT boards.id
   FROM public.boards
  WHERE (boards.user_id = auth.uid()))))
with check ((board_id IN ( SELECT boards.id
   FROM public.boards
  WHERE (boards.user_id = auth.uid()))));



  create policy "users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "users can read all profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


