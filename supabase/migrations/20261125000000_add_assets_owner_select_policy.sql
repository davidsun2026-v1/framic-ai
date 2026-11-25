-- Keep the repository migration contract aligned with the verified live
-- owner-scoped read policy for private generated assets.
--
-- Object keys must use: users/{authenticated-user-id}/{filename}
-- This grants authenticated users SELECT access only to their own objects
-- in the private "assets" bucket. It does not grant public access or writes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'assets_owner_select'
  ) THEN
    CREATE POLICY "assets_owner_select"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'assets'
        AND (storage.foldername(name))[1] = 'users'
        AND (storage.foldername(name))[2] = (SELECT auth.uid()::text)
      );
  END IF;
END
$$;
