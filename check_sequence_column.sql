-- Check if the sequence column exists in the proteins table
SELECT 
    column_name, 
    data_type, 
    character_maximum_length
FROM 
    information_schema.columns 
WHERE 
    table_name = 'proteins' 
    AND column_name = 'sequence';

-- If the sequence column doesn't exist, you can add it with:
-- ALTER TABLE proteins ADD COLUMN sequence TEXT;

-- Check all columns in the proteins table
SELECT 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_name = 'proteins'
ORDER BY 
    ordinal_position;