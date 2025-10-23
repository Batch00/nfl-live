"""
Example Python script for accessing halftime play-by-play data from Supabase.

This demonstrates how to connect to the halftime_exports database and query
the metadata for all processed games.

Install required package:
    pip install supabase

Usage:
    python python-example-access.py
"""

from supabase import create_client, Client
import os

# Supabase credentials (get from .env file or set as environment variables)
SUPABASE_URL = "https://tjazosfjsxqaaspwsgal.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqYXpvc2Zqc3hxYWFzcHdzZ2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjE5NzAsImV4cCI6MjA3NTY5Nzk3MH0.UUZ4OgNtEPCTpsuVxbxaq09SDZawKOeN3jUovuCi64A"

def connect_to_database() -> Client:
    """Create and return a Supabase client."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def get_all_halftime_games(supabase: Client):
    """Fetch all halftime game exports."""
    response = supabase.table('halftime_exports').select('*').execute()
    return response.data

def get_games_by_week(supabase: Client, year: int, week: int):
    """Fetch games for a specific year and week."""
    response = supabase.table('halftime_exports').select('*').eq('year', year).eq('week', week).execute()
    return response.data

def get_games_by_team(supabase: Client, team_name: str):
    """Fetch all games involving a specific team (home or away)."""
    response = supabase.table('halftime_exports').select('*').or_(
        f'home_team.ilike.%{team_name}%,away_team.ilike.%{team_name}%'
    ).execute()
    return response.data

def get_successful_exports_only(supabase: Client):
    """Fetch only successfully emailed games."""
    response = supabase.table('halftime_exports').select('*').eq('email_status', 'success').execute()
    return response.data

def get_play_by_play_as_dataframe(supabase: Client, game_id: str):
    """
    Fetch the CSV content for a specific game and convert it to a pandas DataFrame.
    
    The CSV has game metadata at the top, followed by 'Play-by-Play Data' header,
    then the actual data table. This function skips the metadata and returns just the play data.
    """
    import pandas as pd
    from io import StringIO
    
    # Fetch the CSV content from database
    response = supabase.table('halftime_exports').select('csv_content').eq('game_id', game_id).execute()
    
    if not response.data or not response.data[0].get('csv_content'):
        print(f"No CSV content found for game_id: {game_id}")
        return None
    
    csv_content = response.data[0]['csv_content']
    
    # Find where the actual data starts (after "Play-by-Play Data" header)
    lines = csv_content.split('\n')
    data_start_index = None
    
    for i, line in enumerate(lines):
        if line.strip() == 'Play-by-Play Data':
            # The next line after "Play-by-Play Data" is the column headers
            data_start_index = i + 1
            break
    
    if data_start_index is None:
        print("Could not find 'Play-by-Play Data' section in CSV")
        return None
    
    # Join lines from the data section onward
    csv_data_section = '\n'.join(lines[data_start_index:])
    
    # Convert to pandas DataFrame
    df = pd.read_csv(StringIO(csv_data_section))
    
    return df

def main():
    """Main function demonstrating various queries."""
    
    # Connect to database
    supabase = connect_to_database()
    print("✅ Connected to Supabase database\n")
    
    # Example 1: Get all games
    print("📊 Example 1: All halftime games")
    all_games = get_all_halftime_games(supabase)
    print(f"Found {len(all_games)} total games")
    for game in all_games[:3]:  # Show first 3
        print(f"  - {game['year']} Week {game['week']}: {game['away_team']} @ {game['home_team']}")
    print()
    
    # Example 2: Get games for specific week
    print("📊 Example 2: Games for 2025 Week 8")
    week_games = get_games_by_week(supabase, 2025, 8)
    print(f"Found {len(week_games)} games in Week 8")
    for game in week_games:
        print(f"  - {game['csv_filename']}")
    print()
    
    # Example 3: Get all successful exports
    print("📊 Example 3: Successfully emailed games")
    successful = get_successful_exports_only(supabase)
    print(f"Found {len(successful)} successful exports")
    print()
    
    # Example 4: Show detailed info for one game
    if all_games:
        print("📊 Example 4: Detailed game metadata")
        game = all_games[0]
        print(f"  Game ID: {game['game_id']}")
        print(f"  Year: {game['year']}, Week: {game['week']}")
        print(f"  Matchup: {game['away_team']} @ {game['home_team']}")
        print(f"  Date: {game['game_date']}")
        print(f"  CSV Filename: {game['csv_filename']}")
        print(f"  Email Status: {game['email_status']}")
        print(f"  Timestamp: {game['created_at']}")
        print()
    
    # Example 5: Get play-by-play data as pandas DataFrame
    if all_games:
        print("📊 Example 5: Load play-by-play CSV into pandas DataFrame")
        game_id = all_games[0]['game_id']
        print(f"  Loading data for game {game_id}...")
        
        df = get_play_by_play_as_dataframe(supabase, game_id)
        
        if df is not None:
            print(f"  ✅ Successfully loaded {len(df)} plays into DataFrame")
            print(f"  Columns: {list(df.columns)}")
            print(f"\n  First 3 plays:")
            print(df.head(3).to_string(index=False))
            print(f"\n  DataFrame shape: {df.shape}")
            print(f"  Memory usage: {df.memory_usage(deep=True).sum() / 1024:.2f} KB")
        else:
            print("  ❌ Could not load play-by-play data")

if __name__ == "__main__":
    main()
