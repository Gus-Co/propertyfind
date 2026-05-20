create table if not exists public.search_areas (
  id bigint generated always as identity primary key,
  area text not null unique,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.rental_listings (
  id bigint generated always as identity primary key,
  source text not null,
  area text,
  suburb text,
  property_type text,
  title text,
  price numeric,
  bedrooms int,
  bathrooms numeric,
  parking int,
  address text,
  agency text,
  listing_url text not null unique,
  image_url text,
  description text,
  status text default 'active',
  found_at timestamptz default now(),
  last_seen_at timestamptz default now()
);

create index if not exists idx_rental_listings_area on public.rental_listings(area);
create index if not exists idx_rental_listings_price on public.rental_listings(price);
create index if not exists idx_rental_listings_bedrooms on public.rental_listings(bedrooms);
create index if not exists idx_rental_listings_status on public.rental_listings(status);

insert into public.search_areas (area) values
('Pomona AH'),
('Boksburg'),
('Farrarmere'),
('Glen Marais'),
('Witpoortjie AH'),
('Aston Manor'),
('Rynfield'),
('Kempton Park AH'),
('Witfontein')
on conflict (area) do nothing;
