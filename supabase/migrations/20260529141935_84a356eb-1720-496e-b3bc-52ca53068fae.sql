
-- Tambah enum value in_use
ALTER TYPE public.reservation_status ADD VALUE IF NOT EXISTS 'in_use';

-- Tambah kolom baru
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS actual_pickup_time timestamptz,
  ADD COLUMN IF NOT EXISTS actual_return_time timestamptz,
  ADD COLUMN IF NOT EXISTS return_proof_url text,
  ADD COLUMN IF NOT EXISTS return_photo_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_photo_uploaded_by uuid,
  ADD COLUMN IF NOT EXISTS returned_by uuid;

-- Storage bucket return-proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('return-proofs', 'return-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Policies: public read
CREATE POLICY "Return proofs public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'return-proofs');

-- Authenticated bisa upload
CREATE POLICY "Authenticated upload return proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'return-proofs');

-- Staf/admin bisa hapus
CREATE POLICY "Staff manage return proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'return-proofs'
  AND (public.has_role(auth.uid(), 'staf') OR public.has_role(auth.uid(), 'admin'))
);
