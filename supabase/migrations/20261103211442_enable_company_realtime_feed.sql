/*
# Enable company realtime feed

1. Changes
- Adds `measurements` and `openings` tables to the `supabase_realtime` publication
- Sets `REPLICA IDENTITY FULL` on both tables so old row values are available in UPDATE/DELETE events
2. Security
- No policy changes; realtime respects RLS policies
3. Important Notes
- This enables the manager dashboard live feed to receive realtime updates
- REPLICA IDENTITY FULL ensures change events include full row data
*/

ALTER PUBLICATION supabase_realtime ADD TABLE measurements;
ALTER PUBLICATION supabase_realtime ADD TABLE openings;

ALTER TABLE measurements REPLICA IDENTITY FULL;
ALTER TABLE openings REPLICA IDENTITY FULL;