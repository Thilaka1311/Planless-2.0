-- Migration: Category and Activity Type Normalization
CREATE TYPE plan_category_enum AS ENUM ('sports', 'movies', 'dining', 'custom');
CREATE TYPE plan_activity_type_enum AS ENUM ('football', 'badminton');

ALTER TABLE plans ADD COLUMN category plan_category_enum;

-- Data Migration
UPDATE plans SET category = 'movies'::plan_category_enum WHERE activity_type = 'movies';
UPDATE plans SET category = 'dining'::plan_category_enum WHERE activity_type = 'restaurants' OR activity_type = 'dining' OR activity_type = 'brunch';
UPDATE plans SET category = 'sports'::plan_category_enum WHERE activity_type = 'football';
UPDATE plans SET category = 'sports'::plan_category_enum WHERE activity_type = 'badminton';
UPDATE plans SET category = 'sports'::plan_category_enum WHERE activity_type = 'sports';
UPDATE plans SET category = 'custom'::plan_category_enum WHERE category IS NULL;

-- Clean activity_type values before casting
UPDATE plans SET activity_type = 'football' WHERE category = 'sports' AND (activity_type = 'sports' OR activity_type = 'football' OR activity_type IS NULL);
UPDATE plans SET activity_type = 'badminton' WHERE category = 'sports' AND activity_type = 'badminton';
UPDATE plans SET activity_type = NULL WHERE category != 'sports';

-- Alter column types and constraints
ALTER TABLE plans ALTER COLUMN category SET NOT NULL;
ALTER TABLE plans ALTER COLUMN activity_type TYPE plan_activity_type_enum USING activity_type::plan_activity_type_enum;

-- Add constraint: if category = sports, activity_type must be NOT NULL; else must be NULL
ALTER TABLE plans ADD CONSTRAINT check_sports_activity_type CHECK (
  (category = 'sports'::plan_category_enum AND activity_type IS NOT NULL) OR
  (category != 'sports'::plan_category_enum AND activity_type IS NULL)
);
