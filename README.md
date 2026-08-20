# AgroForesight

Build a SaaS web app called "AgroTicker" for near real-time tracking of four commodities: soybean, corn, cotton, and sugarcane, focused on the Brazilian market.

AUTHENTICATION & ROLES

- Integrate Supabase Auth with Google OAuth as the primary login method, plus email/password as a fallback.

- Two roles: "user" (default on signup) and "admin" (manually assigned in Supabase, not selectable at signup).

- Admins can create/edit content in the commodity blog section; users have read-only access everywhere except the price submission form.

PAGES

1. Landing page

   - Hero section explaining the product (real-time commodity price tracking for Brazil's mechanized crops)

   - Highlight the 4 commodities with icons/images

   - CTA to sign up / log in

   - Public, no auth required

2. Auth page

   - Google OAuth button (primary)

   - Email/password login and signup forms

   - Password reset flow

3. Registration page

   - Email, password, display name

   - On success, create a row in `profiles` with role = 'user'

4. Dashboard (authenticated)

   - Cards showing latest price per commodity (soy, corn, cotton, sugarcane), pulled from `commodity_prices`

   - Trend line chart per commodity (last 30/90 days, toggle)

   - Highlight current harvest season status per crop if in season

5. Commodity Info / Blog section (public, DB-driven)

   - One page per commodity, content loaded from `commodity_content` table (title, body, market_notes)

   - Explains how that commodity's market operates in Brazil

   - Admins see an inline "Edit" button here if their role is admin; opens a simple rich-text editor writing back to `commodity_content`

6. Price History Table (authenticated)

   - Full table view of `commodity_prices`, joined with commodity name

   - Filters: commodity, date range, price range

   - "Export to CSV" button that exports the currently filtered result set (client-side CSV generation, not full table)

DATA

- Use Supabase tables: profiles (with role), commodities, commodity_prices, commodity_content

- All reads live via Supabase client; dashboard price cards should use Supabase Realtime so new price entries update without refresh

DESIGN

- Clean, data-dense but uncluttered — think agricultural/financial dashboard, not consumer app

- Green/earth-tone palette reflecting agriculture, avoid generic SaaS purple

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f74c0e9f-c027-4390-88fe-9aad45cfaca7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
