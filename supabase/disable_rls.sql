-- Disable Row Level Security for demo purposes
-- This allows the network monitor to insert data without authentication

ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE hosts DISABLE ROW LEVEL SECURITY;
ALTER TABLE processes DISABLE ROW LEVEL SECURITY;
ALTER TABLE connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE network_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
