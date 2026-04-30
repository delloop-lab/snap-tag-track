alter table receipts
  add column if not exists ai_processed_at timestamptz;

comment on column receipts.ai_processed_at is 'When AI processing last completed successfully for this receipt.';
