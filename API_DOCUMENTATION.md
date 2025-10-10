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

### Statistics Object
The `home_stats` and `away_stats` fields contain objects with keys like:
- `totalYards`
- `passingYards`
- `rushingYards`
- `turnovers`
- `possessionTime`
- `firstDowns`

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
