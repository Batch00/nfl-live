-- Update the test record with sample CSV content
UPDATE halftime_exports
SET csv_content = 'Game Metadata
Game ID,401671760
Date,2025-10-20
Home Team,Kansas City Chiefs
Away Team,Las Vegas Raiders
Status,Halftime
Venue,Allegiant Stadium
Broadcast,NBC
Export Time,2025-10-20T19:30:00.000Z

Play-by-Play Data
Drive Team,Drive Description,Quarter,Clock,Down,Distance,Yard Line,Play Description,Play Type,Scored,Home Score,Away Score
Kansas City Chiefs,"7 plays, 75 yards, 3:42",1,11:18,1,10,KC 25,"Patrick Mahomes pass complete short right to Travis Kelce for 12 yards",Pass Reception,No,0,0
Kansas City Chiefs,"7 plays, 75 yards, 3:42",1,10:45,1,10,KC 37,"Isiah Pacheco rush right guard for 8 yards",Rush,No,0,0
Kansas City Chiefs,"7 plays, 75 yards, 3:42",1,10:12,2,2,KC 45,"Patrick Mahomes pass complete deep left to Rashee Rice for 28 yards",Pass Reception,No,0,0
Kansas City Chiefs,"7 plays, 75 yards, 3:42",1,9:31,1,10,LV 27,"Patrick Mahomes pass complete short middle to Travis Kelce for 15 yards",Pass Reception,No,0,0
Kansas City Chiefs,"7 plays, 75 yards, 3:42",1,8:54,1,10,LV 12,"Isiah Pacheco rush up the middle for 7 yards",Rush,No,0,0
Kansas City Chiefs,"7 plays, 75 yards, 3:42",1,8:15,2,3,LV 5,"Patrick Mahomes pass complete to Isiah Pacheco for 5 yards TOUCHDOWN",Pass Reception,Yes,7,0
Las Vegas Raiders,"6 plays, 55 yards, 2:18",1,7:36,1,10,LV 30,"Jimmy Garoppolo pass complete short left to Davante Adams for 18 yards",Pass Reception,No,7,0
Las Vegas Raiders,"6 plays, 55 yards, 2:18",1,6:58,1,10,LV 48,"Josh Jacobs rush left tackle for 15 yards",Rush,No,7,0
Las Vegas Raiders,"6 plays, 55 yards, 2:18",1,6:15,1,10,KC 37,"Jimmy Garoppolo pass incomplete deep right to Jakobi Meyers",Pass Incompletion,No,7,0
Las Vegas Raiders,"6 plays, 55 yards, 2:18",1,5:41,2,10,KC 37,"Josh Jacobs rush right end for 22 yards",Rush,No,7,0
Las Vegas Raiders,"6 plays, 55 yards, 2:18",1,5:02,1,10,KC 15,"Jimmy Garoppolo pass complete to Josh Jacobs for 15 yards TOUCHDOWN",Pass Reception,Yes,7,7
Kansas City Chiefs,"4 plays, 28 yards, 1:25",2,4:37,1,10,KC 20,"Patrick Mahomes pass complete short right to Marquez Valdes-Scantling for 13 yards",Pass Reception,No,7,7
Kansas City Chiefs,"4 plays, 28 yards, 1:25",2,3:58,1,10,KC 33,"Isiah Pacheco rush left guard for 6 yards",Rush,No,7,7
Kansas City Chiefs,"4 plays, 28 yards, 1:25",2,3:24,2,4,KC 39,"Patrick Mahomes sacked by Maxx Crosby for -6 yards",Sack,No,7,7
Kansas City Chiefs,"4 plays, 28 yards, 1:25",2,2:45,3,10,KC 33,"Patrick Mahomes pass incomplete short left",Pass Incompletion,No,7,7'
WHERE game_id = '401671760';