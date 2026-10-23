-- CRM files are reachable only through the app, which checks the person's permission on the record.
-- The first version let any signed-in staff account (whatever its role) list, read, upload and
-- delete every object in the bucket straight through the storage API. With these policies gone and
-- row level security still on, the bucket denies every user; the server uses the service-role key,
-- which is not subject to the policies.
DROP POLICY IF EXISTS "staff read crm files" ON storage.objects;
DROP POLICY IF EXISTS "staff upload crm files" ON storage.objects;
DROP POLICY IF EXISTS "staff delete crm files" ON storage.objects;
