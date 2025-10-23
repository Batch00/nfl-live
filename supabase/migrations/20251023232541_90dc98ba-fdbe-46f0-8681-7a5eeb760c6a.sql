-- Add csv_content column to store the actual CSV data
ALTER TABLE halftime_exports 
ADD COLUMN csv_content TEXT;