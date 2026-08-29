-- Migration to clean whitespace and newlines from Stripe API keys
UPDATE integrations 
SET api_key = regexp_replace(api_key, '[\r\n\t\s]', '', 'g') 
WHERE provider = 'stripe';

UPDATE integrations 
SET config = jsonb_set(
  config, 
  '{publishable_key}', 
  to_jsonb(regexp_replace(config->>'publishable_key', '[\r\n\t\s]', '', 'g'))
)
WHERE provider = 'stripe' AND config ? 'publishable_key';
