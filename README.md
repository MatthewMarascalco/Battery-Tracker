# Battery Deal Tracker

A private, mobile-friendly web app for logging auto battery buying/selling deals. Built with vanilla HTML/CSS/JavaScript and Supabase.

## Features

- **Dashboard**: View total deals, spending, revenue, profit, and unsold inventory at a glance
- **New Deal**: Log purchases by piece or by weight, with optional sell price
- **Deal History**: Search, filter, and browse all deals; click any deal to edit
- **Edit Deal**: Update deal details, add sell price later, or delete deals
- **Statistics**: See best sellers, average profit, totals, and monthly breakdowns
- **Mobile-First**: Optimized for phone use in the field with large tap targets

## Tech Stack

- **Frontend**: Plain HTML, CSS, vanilla JavaScript (no build tools)
- **Database**: Supabase (PostgreSQL with REST API)
- **Hosting**: GitHub Pages

## Setup Instructions

### 1. Supabase Setup

1. Go to https://supabase.com and create a free account
2. Create a new project (name it "battery-tracker")
3. Once the project is ready, go to the **SQL Editor** and run:

```sql
CREATE TABLE deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  deal_date date NOT NULL,
  seller_name text NOT NULL,
  seller_contact text,
  purchase_type text CHECK (purchase_type IN ('by_piece', 'by_weight')) NOT NULL,
  quantity integer,
  weight_lbs numeric,
  purchase_price numeric NOT NULL,
  sell_price numeric,
  notes text,
  status text DEFAULT 'purchased' CHECK (status IN ('purchased', 'sold'))
);
```

4. Go to **Project Settings > API** and copy your `Project URL` and `anon public` key
5. Update `config.js` with your credentials:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 2. GitHub Pages Deployment

1. Create a new **public** GitHub repository named `battery-tracker`
2. Upload these files to the `main` branch:
   - `index.html`
   - `style.css`
   - `app.js`
   - `config.js`
   - `README.md`
3. Go to repo **Settings > Pages**
4. Set source to `main` branch, root folder
5. Your app will be live at `https://yourusername.github.io/battery-tracker`

### 3. Add to Phone Home Screen

1. Open the GitHub Pages URL in your mobile browser
2. Tap the browser menu and select "Add to Home Screen"
3. The app will now appear as an app icon on your phone

## Security Note

Your Supabase anon key is visible in the public repo. For a hobby/small business app, this is generally acceptable because:

- The anon key only has the permissions you define in Supabase
- You can enable Row Level Security (RLS) for extra protection

### Enabling Row Level Security (Recommended)

In the Supabase SQL Editor, run:

```sql
-- Enable RLS on the deals table
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (for private app)
CREATE POLICY "Allow all operations" ON deals
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

For stricter security, you could add authentication or IP-based restrictions.

## Usage

### Logging a New Deal

1. Tap "+ New Deal" in the bottom navigation
2. Enter the deal date (defaults to today)
3. Enter seller name and optional contact info
4. Select purchase type: "By Piece" or "By Weight"
5. Enter quantity/weight and purchase price
6. Optionally enter sell price if already sold
7. Tap "Log Deal"

### Updating a Deal (e.g., when sold)

1. Go to "History" and find the deal
2. Tap the deal to open edit view
3. Add or update the sell price
4. Tap "Save Changes"

### Viewing Statistics

1. Tap "Stats" in the bottom navigation
2. See overview stats and monthly breakdown

## Development

No build step required! Just edit the files and refresh the browser.

### File Structure

```
battery-tracker/
├── index.html    # App shell with all views
├── style.css     # Mobile-first styling
├── app.js        # All JavaScript logic
├── config.js     # Supabase credentials
└── README.md     # This file
```

## License

Private use only. This is a personal/hobby project template.
