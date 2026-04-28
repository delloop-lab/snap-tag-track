-- Add line_items as JSONB on receipts for AI-extracted itemised data
alter table receipts
  add column if not exists line_items jsonb default '[]'::jsonb;

comment on column receipts.line_items is
  'AI-extracted line items from receipt. Array of {description: string, amount: number}.';
