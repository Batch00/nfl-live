# Accessing Halftime Play-by-Play Data from Python

Your halftime automation now stores comprehensive metadata in the `halftime_exports` database table every time a game reaches halftime and is emailed.

## What Gets Stored

Every halftime game export creates a record with:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique record identifier |
| `game_id` | Text | ESPN game ID |
| `year` | Integer | Season year (e.g., 2025) |
| `week` | Integer | NFL week number (1-18) |
| `home_team` | Text | Full home team name |
| `away_team` | Text | Full away team name |
| `game_date` | Text | Game date (YYYY-MM-DD) |
| `csv_filename` | Text | Generated CSV filename |
| `csv_path` | Text | Path/reference to CSV |
| `email_status` | Text | 'success' or 'failed' |
| `recipient_email` | Text | Comma-separated recipient list |
| `error_message` | Text | Error details if failed |
| `created_at` | Timestamp | When record was created |
| `emailed_at` | Timestamp | When email was sent |

## Python Access

### Installation

```bash
pip install supabase
```

### Quick Start

```python
from supabase import create_client

# Connect to your database
supabase = create_client(
    "https://tjazosfjsxqaaspwsgal.supabase.co",
    "your-anon-key-here"
)

# Get all halftime exports
data = supabase.table('halftime_exports').select('*').execute()
print(data.data)
```

### Common Queries

**Get games for a specific week:**
```python
games = supabase.table('halftime_exports')\
    .select('*')\
    .eq('year', 2025)\
    .eq('week', 8)\
    .execute()
```

**Get all games for a team:**
```python
games = supabase.table('halftime_exports')\
    .select('*')\
    .or_('home_team.ilike.%Chiefs%,away_team.ilike.%Chiefs%')\
    .execute()
```

**Get only successful exports:**
```python
successful = supabase.table('halftime_exports')\
    .select('*')\
    .eq('email_status', 'success')\
    .execute()
```

**Get recent exports:**
```python
recent = supabase.table('halftime_exports')\
    .select('*')\
    .order('created_at', desc=True)\
    .limit(10)\
    .execute()
```

## Example Script

See `python-example-access.py` for a complete working example with multiple query patterns.

## Use Cases

This database enables you to:
- ✅ Build a training dataset from historical play-by-play data
- ✅ Track which games have been processed
- ✅ Query games by team, week, or season
- ✅ Monitor email delivery success rates
- ✅ Access metadata for your prediction models
- ✅ Integrate with pandas for data analysis

## Notes

- The database uses **Supabase/PostgreSQL** under the hood, accessible via the Python SDK
- Row-Level Security (RLS) policies allow public read access to this table
- CSV files are sent as email attachments; `csv_path` stores the filename reference
- Duplicate game exports are prevented automatically by checking existing `game_id` records
