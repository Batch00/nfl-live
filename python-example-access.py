"""
Halftime Play-by-Play Data Access Module

This module provides easy access to halftime play-by-play data from the database.
Designed for use in Jupyter notebooks and Python scripts.

Install required packages:
    pip install supabase pandas

Quick Start (Jupyter Notebook):
    from python_example_access import HalftimeDataClient
    
    # Initialize client
    client = HalftimeDataClient()
    
    # Get play-by-play data for a specific game
    df = client.get_play_by_play_df(game_id='401671760')
    
    # Now work with the DataFrame in other cells
    df.head()
    df.describe()
"""

from supabase import create_client, Client
from typing import Optional, List, Dict
import pandas as pd
from io import StringIO


class HalftimeDataClient:
    """Client for accessing halftime play-by-play data."""
    
    def __init__(self, url: str = None, key: str = None):
        """
        Initialize the Halftime Data Client.
        
        Args:
            url: Supabase URL (defaults to built-in)
            key: Supabase anon key (defaults to built-in)
        """
        self.SUPABASE_URL = url or "https://tjazosfjsxqaaspwsgal.supabase.co"
        self.SUPABASE_KEY = key or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqYXpvc2Zqc3hxYWFzcHdzZ2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjE5NzAsImV4cCI6MjA3NTY5Nzk3MH0.UUZ4OgNtEPCTpsuVxbxaq09SDZawKOeN3jUovuCi64A"
        self.supabase = create_client(self.SUPABASE_URL, self.SUPABASE_KEY)

    
    def get_all_games(self) -> List[Dict]:
        """Fetch all halftime game exports."""
        response = self.supabase.table('halftime_exports').select('*').execute()
        return response.data
    
    def get_games_by_week(self, year: int, week: int) -> List[Dict]:
        """Fetch games for a specific year and week."""
        response = self.supabase.table('halftime_exports').select('*').eq('year', year).eq('week', week).execute()
        return response.data
    
    def get_games_by_team(self, team_name: str) -> List[Dict]:
        """Fetch all games involving a specific team (home or away)."""
        response = self.supabase.table('halftime_exports').select('*').or_(
            f'home_team.ilike.%{team_name}%,away_team.ilike.%{team_name}%'
        ).execute()
        return response.data
    
    def get_successful_exports(self) -> List[Dict]:
        """Fetch only successfully emailed games."""
        response = self.supabase.table('halftime_exports').select('*').eq('email_status', 'success').execute()
        return response.data
    
    def get_game_metadata(self, game_id: str) -> Optional[Dict]:
        """
        Get metadata for a specific game.
        
        Args:
            game_id: The game ID to fetch
            
        Returns:
            Game metadata dictionary or None if not found
        """
        response = self.supabase.table('halftime_exports').select('*').eq('game_id', game_id).execute()
        return response.data[0] if response.data else None
    
    def get_play_by_play_df(self, game_id: str) -> Optional[pd.DataFrame]:
        """
        Fetch play-by-play data for a specific game as a pandas DataFrame.
        
        This is the main function you'll use in Jupyter notebooks to get game data.
        
        Args:
            game_id: The game ID to fetch (e.g., '401671760')
            
        Returns:
            pandas DataFrame with play-by-play data, or None if not found
            
        Example:
            client = HalftimeDataClient()
            df = client.get_play_by_play_df('401671760')
            df.head()
        """
        # Fetch the CSV content from database
        response = self.supabase.table('halftime_exports').select('csv_content').eq('game_id', game_id).execute()
        
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
    
    def list_available_games(self) -> pd.DataFrame:
        """
        Get a summary DataFrame of all available games.
        
        Returns:
            DataFrame with game_id, year, week, teams, and date
        """
        games = self.get_all_games()
        
        if not games:
            return pd.DataFrame()
        
        summary = [{
            'game_id': g['game_id'],
            'year': g['year'],
            'week': g['week'],
            'matchup': f"{g['away_team']} @ {g['home_team']}",
            'date': g['game_date'],
            'status': g['email_status']
        } for g in games]
        
        return pd.DataFrame(summary)


# =============================================================================
# Example Usage & Demo Functions
# =============================================================================

def run_examples():
    """
    Run example queries to demonstrate the client functionality.
    
    This function won't run when you import the module in Jupyter.
    Run it manually if you want to see examples.
    """
    client = HalftimeDataClient()
    print("✅ Connected to database\n")
    
    # Example 1: List all available games
    print("📊 Example 1: List all available games")
    games_df = client.list_available_games()
    print(f"Found {len(games_df)} total games")
    print(games_df.head())
    print()
    
    # Example 2: Get games for specific week
    print("📊 Example 2: Games for 2025 Week 8")
    week_games = client.get_games_by_week(2025, 8)
    print(f"Found {len(week_games)} games in Week 8")
    for game in week_games:
        print(f"  - {game['csv_filename']}")
    print()
    
    # Example 3: Get play-by-play DataFrame for a game
    all_games = client.get_all_games()
    if all_games:
        print("📊 Example 3: Load play-by-play data into DataFrame")
        game_id = all_games[0]['game_id']
        print(f"  Loading data for game {game_id}...")
        
        df = client.get_play_by_play_df(game_id)
        
        if df is not None:
            print(f"  ✅ Successfully loaded {len(df)} plays into DataFrame")
            print(f"  Columns: {list(df.columns)}")
            print(f"\n  First 3 plays:")
            print(df.head(3).to_string(index=False))
            print(f"\n  DataFrame shape: {df.shape}")
        else:
            print("  ❌ Could not load play-by-play data")


# =============================================================================
# Jupyter Notebook Quick Start
# =============================================================================
"""
JUPYTER NOTEBOOK USAGE:

# Cell 1: Import and initialize
from python_example_access import HalftimeDataClient
client = HalftimeDataClient()

# Cell 2: See what games are available
available_games = client.list_available_games()
available_games

# Cell 3: Get play-by-play data for a specific game
game_id = '401671760'  # Use a game_id from the available games
df = client.get_play_by_play_df(game_id)

# Cell 4: Work with the DataFrame
df.head()
df.describe()
df['Play Type'].value_counts()

# Cell 5: Filter and analyze
pass_plays = df[df['Play Type'] == 'Pass Reception']
pass_plays.head()
"""


if __name__ == "__main__":
    # Only run examples if script is executed directly (not imported)
    run_examples()
