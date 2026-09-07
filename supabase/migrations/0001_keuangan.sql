-- Keuangan minimal: profiles + transaksi + laporan_log + RLS
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text default 'user'
);

create table if not exists public.transaksi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  jenis text not null check (jenis in ('pemasukan','pengeluaran')),
  kategori text,
  nominal numeric not null check (nominal >= 0),
  tanggal date not null default current_date,
  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_transaksi_created on public.transaksi(created_at desc);

create table if not exists public.laporan_log (
  id uuid primary key default gen_random_uuid(),
  periode timestamptz not null default now(),
  tipe text not null,
  penerima text not null,
  status text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.transaksi enable row level security;
alter table public.laporan_log enable row level security;

drop policy if exists "own transaksi" on public.transaksi;
create policy "own transaksi" on public.transaksi
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- laporan_log hanya via service_role (cron), tidak ada policy user = no access
