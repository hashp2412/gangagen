-- Drop the trigger first
DROP TRIGGER IF EXISTS update_saved_queries_updated_at ON saved_queries;

-- Drop the function
DROP FUNCTION IF EXISTS update_updated_at_column();
