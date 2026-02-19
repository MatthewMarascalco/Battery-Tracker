# Battery Business Tracker — Claude Code Build Plan

## Project Overview
Build a private, mobile-friendly web app for logging auto battery buying/selling deals. The app will be hosted free on GitHub Pages and use Supabase (free tier) as the database backend so both users can access shared records from any device.

---

## Tech Stack
- **Frontend**: Plain HTML, CSS, and vanilla JavaScript (no build tools needed — keeps it simple and easy to deploy)
- **Database**: Supabase (free tier) — a hosted PostgreSQL database with a REST API
- **Hosting**: GitHub Pages (free static hosting)
- **No frameworks, no npm, no build step** — just files that work

---

## Phase 1 — Supabase Setup Instructions (do this manually before coding)

> Note to Claude: Tell the user to complete these steps before you write the Supabase integration code, since you'll need the project URL and anon key.

1. Go to https://supabase.com and create a free account
2. Create a new project (name it something like "battery-tracker")
3. Once the project is ready, go to the **SQL Editor** and run the following table creation script:

```sql
CREATE TABLE deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  deal_date date NOT NULL,
  seller_name text NOT NULL,
  seller_contact text,
  purchase_type text CHECK (purchase_type IN ('by_piece', 'by_weight')) NOT NULL,
  quantity integer,           -- number of batteries (if by piece)
  weight_lbs numeric,         -- total weight in lbs (if by weight)
  purchase_price numeric NOT NULL,   -- what we paid
  sell_price numeric,                -- what we sold for (can be filled in later)
  notes text,
  status text DEFAULT 'purchased' CHECK (status IN ('purchased', 'sold'))
);
```

4. Go to **Project Settings > API** and copy:
   - `Project URL`
   - `anon public` key
5. Give these two values to Claude Code when asked

---

## Phase 2 — File Structure to Build

```
battery-tracker/
├── index.html         # Main app shell
├── style.css          # All styling
├── app.js             # All JavaScript logic
├── config.js          # Supabase URL + key (user fills this in)
└── README.md          # Simple setup instructions
```

---

## Phase 3 — Features to Build

### 3A — Dashboard / Home Screen
- Show total number of deals (all time)
- Show total amount spent (purchasing) and total revenue (selling)
- Show total profit
- Show a count of deals with no sell price yet ("unsold inventory")
- A big "+ New Deal" button prominently at the top

### 3B — New Deal Form
Fields to collect:
- **Date** (default to today)
- **Seller Name** (text input)
- **Seller Contact** (phone or note, optional)
- **Purchase Type** — toggle/radio: "By Piece" or "By Weight"
  - If By Piece: show "Number of Batteries" (integer input)
  - If By Weight: show "Total Weight (lbs)" (decimal input)
- **Purchase Price** ($) — what we paid them
- **Sell Price** ($) — what we sold for (optional, can leave blank and fill in later)
- **Notes** (optional text area)
- Submit button: "Log Deal"

Validation: require date, seller name, purchase type, and purchase price at minimum.

### 3C — Deals Log / History Page
- Table or card list of all deals, newest first
- Each deal shows: Date, Seller, Type, Qty/Weight, Paid, Sold For, Profit, Status
- Color code: green if sold, yellow/orange if not yet sold
- Click any deal to open an edit/detail view
- Search bar to filter by seller name
- Filter by status (all / purchased / sold)

### 3D — Edit Deal View
- Pre-populated form with all deal data
- Ability to add or update the Sell Price (common workflow — buy first, sell later)
- Save changes button
- Delete deal button (with confirmation)

### 3E — Simple Stats Page (optional but nice)
- Best seller (person sold us the most)
- Average profit per deal
- Total batteries purchased (count and/or weight)
- Monthly breakdown table

---

## Phase 4 — Design Requirements

- **Mobile-first** — this will mostly be used on a phone in the field
- Clean, simple UI — large tap targets, easy to read
- Color scheme: dark navy/charcoal with yellow/amber accents (battery/industrial feel)
- Bottom navigation bar with: Home | New Deal | History | Stats
- No login screen needed (it's a private URL, security through obscurity is fine for now)

---

## Phase 5 — GitHub Pages Deployment

1. Create a new **public** GitHub repository named `battery-tracker`
2. Push all files to the `main` branch
3. Go to repo **Settings > Pages**, set source to `main` branch, root folder
4. The app will be live at `https://yourusername.github.io/battery-tracker`
5. Bookmark this URL on both phones — it works like an app

> Note to Claude: Add a `.gitignore` and remind the user that their Supabase anon key will be visible in the public repo. This is acceptable for a hobby/small business app since the anon key only has the permissions you define in Supabase, but mention they can set Row Level Security (RLS) in Supabase for extra protection. Provide brief instructions on enabling RLS in the README.

---

## Phase 6 — README to Include

Write a README.md that explains:
- What the app does
- How to do the Supabase setup (the SQL script, where to get the keys)
- How to fill in config.js
- How to access the app via GitHub Pages URL
- How to add it to your phone's home screen (PWA-style, just "Add to Home Screen" in mobile browser)

---

## Build Order for Claude Code

1. Create the file structure and `config.js` template
2. Build `style.css` with the full design system
3. Build `index.html` with the app shell and bottom nav
4. Build the Dashboard section in `app.js`
5. Build the New Deal form with validation
6. Build the Deals History view with search/filter
7. Build the Edit Deal view
8. Build the Stats view
9. Wire up all Supabase calls (fetch, insert, update, delete)
10. Test all flows end to end
11. Write `README.md` with deployment instructions
