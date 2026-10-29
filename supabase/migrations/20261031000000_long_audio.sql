-- Pro users can generate up to ~5 minutes on the server; WAV at that length is ~15 MB.
-- 50 MB is the largest single file the Supabase free plan allows.
update storage.buckets set file_size_limit = 52428800 where id = 'generations';
