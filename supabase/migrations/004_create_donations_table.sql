-- Create donations table to track all donations
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);

-- Create index on stripe_payment_intent_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_donations_stripe_payment_intent_id ON public.donations(stripe_payment_intent_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON public.donations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own donations
CREATE POLICY "Users can view own donations"
  ON public.donations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert donations (for webhook)
CREATE POLICY "Service role can insert donations"
  ON public.donations
  FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can update donations (for refunds, etc)
CREATE POLICY "Service role can update donations"
  ON public.donations
  FOR UPDATE
  USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create a view for donation statistics per user
CREATE OR REPLACE VIEW public.user_donation_stats AS
SELECT 
  user_id,
  COUNT(*) as donation_count,
  SUM(amount) as total_amount_cents,
  MAX(created_at) as last_donation_at,
  MIN(created_at) as first_donation_at
FROM public.donations
WHERE status = 'completed'
GROUP BY user_id;

-- Grant access to authenticated users for the view
GRANT SELECT ON public.user_donation_stats TO authenticated;

COMMENT ON TABLE public.donations IS 'Stores all donation transactions from Stripe';
COMMENT ON COLUMN public.donations.amount IS 'Donation amount in cents';
COMMENT ON COLUMN public.donations.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for reconciliation';

