CREATE TYPE public.app_role AS ENUM ('user','admin');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.commodities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  name_pt text NOT NULL,
  unit text NOT NULL,
  harvest_start_month int NOT NULL,
  harvest_end_month int NOT NULL,
  accent text NOT NULL DEFAULT 'soy',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.commodities TO anon, authenticated;
GRANT ALL ON public.commodities TO service_role;
ALTER TABLE public.commodities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commodities_public_read" ON public.commodities FOR SELECT USING (true);
CREATE POLICY "commodities_admin_write" ON public.commodities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.commodity_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id uuid NOT NULL REFERENCES public.commodities(id) ON DELETE CASCADE,
  price numeric(12,2) NOT NULL,
  price_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'CEPEA/ESALQ',
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commodity_prices_commodity_date_idx ON public.commodity_prices (commodity_id, price_date DESC);
GRANT SELECT, INSERT ON public.commodity_prices TO authenticated;
GRANT ALL ON public.commodity_prices TO service_role;
ALTER TABLE public.commodity_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prices_read_authenticated" ON public.commodity_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "prices_insert_own" ON public.commodity_prices FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "prices_admin_manage" ON public.commodity_prices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.commodity_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id uuid NOT NULL UNIQUE REFERENCES public.commodities(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  market_notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT ON public.commodity_content TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.commodity_content TO authenticated;
GRANT ALL ON public.commodity_content TO service_role;
ALTER TABLE public.commodity_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_public_read" ON public.commodity_content FOR SELECT USING (true);
CREATE POLICY "content_admin_write" ON public.commodity_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER commodity_content_touch BEFORE UPDATE ON public.commodity_content
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.commodity_prices;

INSERT INTO public.commodities (slug, name, name_pt, unit, harvest_start_month, harvest_end_month, accent) VALUES
  ('soybean','Soybean','Soja','R$/60kg sack',1,4,'soy'),
  ('corn','Corn','Milho','R$/60kg sack',6,9,'corn'),
  ('cotton','Cotton','Algodão','R$/@ (15kg)',6,9,'cotton'),
  ('sugarcane','Sugarcane','Cana-de-açúcar','R$/tonne',4,11,'cane');

INSERT INTO public.commodity_content (commodity_id, title, body, market_notes)
SELECT c.id, v.title, v.body, v.notes FROM public.commodities c
JOIN (VALUES
 ('soybean','How the Brazilian soybean market works',
  'Brazil is the world''s largest soybean producer and exporter, with Mato Grosso alone accounting for roughly a quarter of national output. The crop is planted from September to December and harvested between January and April, when trucks flood the corridors toward Paranaguá, Santos and the Northern Arc ports.

Physical prices are quoted in reais per 60kg sack and are anchored to the CBOT futures curve plus the FOB port premium (the "prêmio"), then discounted for freight from the farm gate to the port. That means a producer in Sorriso and one in Cascavel can see very different net prices on the same day even though both track the same Chicago board.',
  'Watch three levers: the CBOT front month, the port premium, and the USD/BRL rate. A weaker real usually lifts interior prices even when Chicago falls. Crush margins at domestic processors set the floor for meal and oil demand.'),
 ('corn','How the Brazilian corn market works',
  'Corn in Brazil is a two-season story. The first crop ("verão") is planted with the rains, but roughly three quarters of national production now comes from the second crop ("safrinha"), sown right behind the soybean harvest in January and February and gathered from June to September.

Because safrinha planting windows are tight, weather in February decides yields six months later. Domestic demand is dominated by poultry and pork integrators in the South plus the fast-growing corn ethanol plants in Mato Grosso, which have permanently raised the interior price floor.',
  'Safrinha planting pace and the June-July harvest peak drive the yearly low. Ethanol plant buying and export line-ups at Santos/Barcarena set the upside. Basis in Campinas trades far above Rondonópolis due to freight.'),
 ('cotton','How the Brazilian cotton market works',
  'Brazil has become the leading cotton exporter, with Mato Grosso and Bahia producing the bulk of the lint. Cotton is largely a second-crop plant sown after soybeans in the Cerrado, harvested from June through September and then ginned, classed and warehoused for a long export program that stretches into the following year.

Prices are quoted in reais per arroba (15kg) of lint and follow the ICE No. 2 contract adjusted for quality (length, strength, micronaire) and the basis for delivery in Rotterdam or Asian mills.',
  'Track ICE No. 2, Chinese and Vietnamese mill buying, and Brazilian ginning progress. High-quality HVI results earn premiums; rain during boll opening is the main quality risk.'),
 ('sugarcane','How the Brazilian sugarcane market works',
  'Sugarcane in the Center-South is crushed from April to November, and each mill continuously chooses between sugar and ethanol depending on which pays more per tonne of recoverable sugar (ATR). São Paulo state alone crushes more cane than any other country produces.

Growers are paid through the CONSECANA system, which converts the ATR content of delivered cane into a price per tonne using a basket of sugar and ethanol reference prices. This makes cane pricing unusual: it is a formula, published monthly, rather than a spot negotiation.',
  'Follow the CONSECANA ATR value, the sugar/ethanol mix reported by UNICA every fortnight, NY No. 11 raw sugar, and Petrobras gasoline pricing, which caps hydrous ethanol demand at the pump.')
) AS v(slug,title,body,notes) ON v.slug = c.slug;

INSERT INTO public.commodity_prices (commodity_id, price, price_date, source)
SELECT c.id,
  ROUND((b.base * (1 + 0.11 * sin(d.n / 17.0) + 0.05 * sin(d.n / 5.0) + (random() - 0.5) * 0.02))::numeric, 2),
  CURRENT_DATE - d.n,
  'CEPEA/ESALQ'
FROM public.commodities c
JOIN (VALUES ('soybean',132.0),('corn',66.5),('cotton',146.0),('sugarcane',118.0)) AS b(slug, base) ON b.slug = c.slug
CROSS JOIN generate_series(0, 119) AS d(n);