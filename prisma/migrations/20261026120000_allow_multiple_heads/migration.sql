-- Remove the partial unique index that limited the workspace to one HEAD.
-- This operation changes no rows and preserves all user and report data.
DROP INDEX IF EXISTS "User_single_head_key";
