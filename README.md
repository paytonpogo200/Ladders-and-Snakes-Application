# Campaign Battle Tool Starter

A mobile-first web app starter for a private tabletop campaign tool.

Built with:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Realtime
- Vercel-ready environment variables

## What this first draft already includes

- Login and sign up screen
- One permanent DM claim option
- Player accounts
- DM character creation
- Character assignment to accounts
- Character inventory management
- Active battle creation
- DM-selected battle participants
- Live gridded battle map
- Zoom and pan controls
- DM token movement
- DM HP, mana, and initiative updates
- Enemy creation during combat
- Player bottom panel showing their active characters
- DM end combat button that saves final HP/mana back to characters

## 1. Create the Supabase project

1. Go to Supabase and create a new project.
2. Open **SQL Editor**.
3. Paste the contents of `supabase/schema.sql` into the editor.
4. Run it.

If the final `alter publication supabase_realtime add table ...` lines say a table is already part of the publication, that is harmless.

For easier private testing with friends, you may want to disable email confirmation:

Supabase Dashboard → Authentication → Providers → Email → Confirm email → Off

You can turn it back on later.

## 2. Get your Supabase keys

In Supabase:

Project Settings → API

Copy:

- Project URL
- Publishable key

Some older Supabase dashboards may still call the public browser key an `anon` key. This starter uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as the variable name.

## 3. Run locally

From the project folder:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-key-here
```

Then open:

```bash
http://localhost:3000
```

## 4. First test flow

1. Create your account.
2. Check **Claim this account as DM**.
3. Log in.
4. Create one or two player accounts in another browser, phone, or incognito window.
5. As DM, create characters and assign them to accounts.
6. Go to Battle.
7. Select characters.
8. Start battle.
9. Tap a token, then tap a grid square to move it.
10. Edit HP/mana from DM controls.
11. Add enemies during combat.
12. End combat.

## 5. Push to GitHub

```bash
git init
git add .
git commit -m "Initial campaign battle tool starter"
```

Create a new GitHub repo, then follow GitHub's commands to push the local repo.

## 6. Deploy to Vercel

1. Import the GitHub repo into Vercel.
2. Add the same environment variables from `.env.local` into Vercel Project Settings → Environment Variables.
3. Deploy.

If you change environment variables later, redeploy the project.

## 7. Next bricks to add

Recommended next additions:

- Multiple campaigns/worlds
- Fog of war / hidden enemy tokens
- Initiative tracker
- Movement ruler
- Conditions and status effects
- Market/shop system
- Currency tracking
- Trade requests
- Player-editable notes
- DM-only secret notes
- Map image upload under the grid
- Custom token colors/icons
- Character stat sheets beyond HP and mana
- Out-of-session downtime mode

## Resetting the DM claim during development

Only do this while testing. In Supabase SQL Editor:

```sql
update public.profiles set role = 'player';
update public.dm_lock set dm_user_id = null, claimed_at = null where id = true;
```

Then the DM claim checkbox will appear again.
