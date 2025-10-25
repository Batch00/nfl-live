# NFL Data Dashboard - API Documentation

## Overview
This dashboard automatically collects live NFL game data and stores it in a database. All data is accessible via API endpoints for external analysis (e.g., Python, pandas, Jupyter notebooks).

## Python Integration

### Install Required Packages
```bash
pip install requests pandas
```

### Fetch Game Data as JSON

```python
import requests
import pandas as pd
from datetime import datetime, timedelta

# API endpoint
API_URL = "https://tjazosfjsxqaaspwsgal.supabase.co/functions/v1/export-game-data"

# Fetch all game snapshots
response = requests.get(API_URL, params={
    'format': 'json',
    'limit': 1000
})

data = response.json()
df = pd.DataFrame(data['data'])
print(f"Loaded {len(df)} game snapshots")
print(df.head())
```

### Filter by Date Range

```python
# Get games from last 7 days
start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
end_date = datetime.now().strftime('%Y-%m-%d')

response = requests.get(API_URL, params={
    'format': 'json',
    'start_date': start_date,
    'end_date': end_date,
    'limit': 1000
})

df = pd.DataFrame(response.json()['data'])
```

### Filter by Specific Game

```python
# Get all snapshots for a specific game
response = requests.get(API_URL, params={
    'format': 'json',
    'game_id': '401547656',  # Replace with actual game ID
    'limit': 1000
})

df = pd.DataFrame(response.json()['data'])
```

### Download as CSV

```python
import requests

response = requests.get(API_URL, params={
    'format': 'csv',
    'limit': 1000
})

# Save to file
with open('nfl_data.csv', 'wb') as f:
    f.write(response.content)

# Or load directly into pandas
from io import StringIO
df = pd.read_csv(StringIO(response.text))
```

## API Endpoints

### 1. Export Game Data
**Endpoint:** `/functions/v1/export-game-data`  
**Method:** GET  
**Authentication:** Not required (public data)

**Query Parameters:**
- `format` (optional): `json` or `csv` (default: `json`)
- `game_id` (optional): Filter by specific game ID
- `start_date` (optional): Filter by start date (YYYY-MM-DD)
- `end_date` (optional): Filter by end date (YYYY-MM-DD)
- `limit` (optional): Maximum number of records (default: 1000)

**Response (JSON):**
```json
{
  "success": true,
  "count": 150,
  "data": [
    {
      "id": "uuid",
      "created_at": "2025-01-10T18:30:00Z",
      "game_id": "401547656",
      "game_date": "2025-01-10",
      "home_team": "Kansas City Chiefs",
      "away_team": "Miami Dolphins",
      "home_team_abbr": "KC",
      "away_team_abbr": "MIA",
      "home_score": 24,
      "away_score": 17,
      "quarter": 3,
      "clock": "8:45",
      "game_status": "In Progress",
      "home_stats": {
        "totalYards": "345",
        "passingYards": "255",
        "rushingYards": "90",
        "turnovers": "1"
      },
      "away_stats": { ... },
      "venue": "Arrowhead Stadium",
      "broadcast": "CBS"
    }
  ]
}
```

### 2. Fetch Live NFL Data (Refresh)
**Endpoint:** `/functions/v1/fetch-nfl-data`  
**Method:** POST  
**Authentication:** Not required

This endpoint fetches current NFL games from ESPN API and stores snapshots in the database.

**Response:**
```json
{
  "success": true,
  "snapshots": 12,
  "data": [...]
}
```

## Data Schema

### Game Snapshot Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique snapshot identifier |
| `created_at` | Timestamp | When this snapshot was captured |
| `game_id` | String | ESPN game identifier |
| `game_date` | Date | Date of the game |
| `home_team` | String | Home team full name |
| `away_team` | String | Away team full name |
| `home_team_abbr` | String | Home team abbreviation |
| `away_team_abbr` | String | Away team abbreviation |
| `home_score` | Integer | Home team score |
| `away_score` | Integer | Away team score |
| `quarter` | Integer | Current quarter (1-4) |
| `clock` | String | Time remaining in quarter |
| `game_status` | String | Game status description |
| `home_stats` | JSON | Home team statistics |
| `away_stats` | JSON | Away team statistics |
| `venue` | String | Stadium name |
| `broadcast` | String | Broadcast network |
| `betting_lines` | JSON | Real-time betting odds from TheOddsAPI |

### Betting Lines Object
The `betting_lines` field contains comprehensive odds data from TheOddsAPI (when available):

```json
{
  "source": "TheOddsAPI",
  "game_state": "In Progress",
  "last_update": "2025-01-10T18:45:32Z",
  "consensus": {
    "home_ml": -150,
    "away_ml": 130,
    "spread": -3.5,
    "total": 47.5
  },
  "bookmakers": [
    {
      "name": "DraftKings",
      "home_moneyline": -155,
      "away_moneyline": 135,
      "home_spread": -3.5,
      "home_spread_odds": -110,
      "total": 47.5,
      "over_odds": -110,
      "under_odds": -110
    }
  ]
}
```

**Key Fields:**
- `source`: Either "TheOddsAPI" (preferred) or "ESPN" (fallback)
- `game_state`: Pregame, In Progress, Halftime, Final
- `consensus`: Average odds across all sportsbooks
- `bookmakers`: Array of individual sportsbook odds for comparison

### Statistics Object
The `home_stats` and `away_stats` fields contain objects with keys like:
- `totalYards`
- `passingYards`
- `rushingYards`
- `turnovers`
- `possessionTime`
- `firstDowns`

## Betting Odds Integration

### TheOddsAPI Features
This dashboard integrates with **TheOddsAPI** to provide real-time, comprehensive betting odds:

**Coverage:**
- Pre-game odds (opening lines)
- Live in-game odds (updated every 45 seconds)
- Halftime odds (captured at halftime)
- Multiple sportsbooks for comparison (DraftKings, FanDuel, BetMGM, etc.)

**Included Markets:**
- Moneyline (home/away win)
- Point Spread with odds
- Over/Under (total points)

**API Key Setup:**
The dashboard uses TheOddsAPI with a secure API key stored in Lovable Cloud secrets. The free tier provides 500 requests/month, which is sufficient for tracking NFL games (13-16 games per week × 45-second intervals during game time).

**Usage Monitoring:**
The function logs remaining API requests in the console. Monitor usage in the edge function logs.

### Halftime Odds Export

When a game reaches halftime, the automated email includes:

1. **Consensus Odds** - Average of all sportsbooks
2. **Individual Sportsbook Comparison** - Detailed odds from each bookmaker
3. **Timestamp** - Exact time odds were captured
4. **Game State** - Confirms odds are from halftime

Example halftime CSV includes:
```
Betting Odds
Odds Source,TheOddsAPI
Game State,Halftime
Last Updated,2025-01-10T19:30:15Z

Consensus Odds (Average of Multiple Sportsbooks)
Home Moneyline,+120
Away Moneyline,-145
Spread,+2.5
Total (Over/Under),44.5

Individual Sportsbook Odds
Sportsbook,Home ML,Away ML,Spread,Home Spread Odds,Total,Over Odds,Under Odds
DraftKings,+118,-140,+2.5,-110,44.5,-110,-110
FanDuel,+122,-148,+2.5,-112,44.0,-108,-112
```

### Python Example: Analyzing Betting Odds

```python
import requests
import pandas as pd
import json

# Fetch game data with betting odds
API_URL = "https://tjazosfjsxqaaspwsgal.supabase.co/functions/v1/export-game-data"
response = requests.get(API_URL, params={'format': 'json', 'limit': 1000})
df = pd.DataFrame(response.json()['data'])

# Parse betting lines
df['betting_lines_dict'] = df['betting_lines'].apply(lambda x: json.loads(x) if isinstance(x, str) else x)

# Extract consensus odds (when TheOddsAPI is source)
df['home_ml'] = df['betting_lines_dict'].apply(
    lambda x: x.get('consensus', {}).get('home_ml') if x and x.get('source') == 'TheOddsAPI' else None
)
df['spread'] = df['betting_lines_dict'].apply(
    lambda x: x.get('consensus', {}).get('spread') if x and x.get('source') == 'TheOddsAPI' else None
)
df['total'] = df['betting_lines_dict'].apply(
    lambda x: x.get('consensus', {}).get('total') if x and x.get('source') == 'TheOddsAPI' else None
)

# Filter halftime games with odds
halftime_df = df[
    (df['game_status'] == 'Halftime') & 
    (df['betting_lines_dict'].notna())
].copy()

print(f"Found {len(halftime_df)} halftime snapshots with odds")
print(halftime_df[['game_date', 'home_team_abbr', 'away_team_abbr', 'home_score', 'away_score', 'spread', 'total']].head())

# Compare pre-game vs halftime odds
# (Requires comparing snapshots from same game_id at different times)
```

## Example: Building a Halftime Analysis Dataset

```python
import requests
import pandas as pd
import json

# Fetch all game snapshots
API_URL = "https://tjazosfjsxqaaspwsgal.supabase.co/functions/v1/export-game-data"
response = requests.get(API_URL, params={'format': 'json', 'limit': 5000})
df = pd.DataFrame(response.json()['data'])

# Parse JSON columns
df['home_stats_dict'] = df['home_stats'].apply(lambda x: json.loads(x) if isinstance(x, str) else x)
df['away_stats_dict'] = df['away_stats'].apply(lambda x: json.loads(x) if isinstance(x, str) else x)

# Extract specific stats
df['home_total_yards'] = df['home_stats_dict'].apply(lambda x: int(x.get('totalYards', 0)) if x else 0)
df['away_total_yards'] = df['away_stats_dict'].apply(lambda x: int(x.get('totalYards', 0)) if x else 0)

# Calculate score differential
df['score_diff'] = df['home_score'] - df['away_score']

# Filter for halftime snapshots (end of Q2)
halftime_df = df[df['quarter'] == 2].copy()

# Group by game to get latest halftime snapshot
halftime_latest = halftime_df.sort_values('created_at').groupby('game_id').tail(1)

print(f"Halftime dataset: {len(halftime_latest)} games")
print(halftime_latest[['game_date', 'home_team_abbr', 'away_team_abbr', 'home_score', 'away_score', 'score_diff']].head())

# Export for modeling
halftime_latest.to_csv('halftime_analysis.csv', index=False)
```

## Rate Limiting & Best Practices

1. **Caching**: The dashboard auto-refreshes every 45 seconds. No need to poll more frequently.
2. **Bulk Downloads**: Use the `limit` parameter wisely. For large datasets, consider pagination.
3. **Date Filtering**: Always use date filters when possible to reduce payload size.
4. **CSV for Large Datasets**: Use `format=csv` for datasets > 1000 records.

## Data Update Frequency

- **Live Games**: Data refreshes automatically every 45 seconds when games are in progress
- **Historical Data**: All snapshots are preserved for historical analysis
- **Source**: ESPN public API (no authentication required)

## Support & Troubleshooting

### Common Issues

1. **Empty Response**: No games are currently in progress or stored in database. Click "Refresh" in the dashboard.
2. **Large Payload**: Use date filters or CSV format for better performance.
3. **Missing Stats**: Some stats are only available during/after games, not pre-game.

### Testing the API

```bash
# Test JSON export
curl "https://tjazosfjsxqaaspwsgal.supabase.co/functions/v1/export-game-data?format=json&limit=5"

# Test CSV export
curl "https://tjazosfjsxqaaspwsgal.supabase.co/functions/v1/export-game-data?format=csv&limit=100" --output nfl_data.csv
```
