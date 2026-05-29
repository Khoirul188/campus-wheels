
-- Privatkan bucket
UPDATE storage.buckets SET public = false WHERE id = 'return-proofs';

-- Hapus policy SELECT terbuka
DROP POLICY IF EXISTS "Return proofs public read" ON storage.objects;

-- SELECT: pemilik reservasi (folder = reservation_id) ATAU staf/admin
CREATE POLICY "Return proofs owner or staff read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'return-proofs'
  AND (
    public.has_role(auth.uid(), 'staf')
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id::text = (storage.foldername(name))[1]
        AND r.user_id = auth.uid()
    )
  )
);
