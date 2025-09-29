-- Enable necessary extensions
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Organizations table
create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint name_length check (char_length(name) >= 3)
);

alter table public.organizations enable row level security;

-- Hosts table
create table if not exists public.hosts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations on delete cascade not null,
  hostname text not null,
  os_type text,
  os_version text,
  ip_address inet,
  mac_address macaddr,
  agent_version text,
  last_seen timestamp with time zone,
  status text not null default 'offline'::text,
  agent_config jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.hosts enable row level security;

-- Processes table
create table if not exists public.processes (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid references public.hosts on delete cascade not null,
  pid integer not null,
  name text not null,
  path text,
  command_line text,
  user_name text,
  cpu_percent double precision not null default 0,
  memory_mb double precision not null default 0,
  started_at timestamp with time zone,
  status text not null default 'running'::text,
  hash_sha256 text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(host_id, pid, name)
);

alter table public.processes enable row level security;

-- Connections table
create table if not exists public.connections (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid references public.hosts on delete cascade not null,
  process_id uuid references public.processes on delete set null,
  local_ip inet,
  local_port integer,
  remote_ip inet,
  remote_port integer,
  protocol text not null,
  state text not null,
  bytes_sent bigint not null default 0,
  bytes_received bigint not null default 0,
  packets_sent bigint not null default 0,
  packets_received bigint not null default 0,
  connection_start timestamp with time zone not null,
  connection_end timestamp with time zone,
  country_code char(2),
  asn integer,
  domain_name text,
  is_blocked boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.connections enable row level security;

-- Alerts table
create table if not exists public.alerts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references public.organizations on delete cascade not null,
  host_id uuid references public.hosts on delete cascade,
  process_id uuid references public.processes on delete set null,
  connection_id uuid references public.connections on delete set null,
  type text not null,
  severity text not null,
  title text not null,
  description text,
  status text not null default 'active'::text,
  metadata jsonb,
  resolved_by uuid references auth.users on delete set null,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.alerts enable row level security;

-- Network stats table
create table if not exists public.network_stats (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid references public.hosts on delete cascade not null,
  process_id uuid references public.processes on delete set null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  bytes_in bigint not null default 0,
  bytes_out bigint not null default 0,
  packets_in bigint not null default 0,
  packets_out bigint not null default 0,
  connections_count integer not null default 0,
  period text not null
);

alter table public.network_stats enable row level security;

-- Create indexes
create index if not exists idx_hosts_organization_id on public.hosts(organization_id);
create index if not exists idx_processes_host_id on public.processes(host_id);
create index if not exists idx_connections_host_id on public.connections(host_id);
create index if not exists idx_connections_process_id on public.connections(process_id);
create index if not exists idx_alerts_organization_id on public.alerts(organization_id);
create index if not exists idx_alerts_host_id on public.alerts(host_id);
create index if not exists idx_network_stats_host_id on public.network_stats(host_id);
create index if not exists idx_network_stats_timestamp on public.network_stats(timestamp);

-- Set up Row Level Security (RLS)
-- Drop existing policies first to avoid conflicts
DO $$
BEGIN
  -- Organizations RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own organizations') THEN
    CREATE POLICY "Users can view their own organizations"
    ON public.organizations
    FOR SELECT
    USING (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own organizations') THEN
    CREATE POLICY "Users can insert their own organizations"
    ON public.organizations
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);
  END IF;

  -- Hosts RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view hosts in their organizations') THEN
    CREATE POLICY "Users can view hosts in their organizations"
    ON public.hosts
    FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.organizations
      WHERE organizations.id = hosts.organization_id
      AND organizations.owner_id = auth.uid()
    ));
  END IF;

  -- Add similar checks for other policies...
END $$;

-- Create a function to handle new user signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.organizations (name, owner_id)
  values ('My Home Network', new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a function to get the current user's organization ID
create or replace function public.current_user_org_id()
returns uuid as $$
  select id from public.organizations where owner_id = auth.uid();
$$ language sql security definer;
