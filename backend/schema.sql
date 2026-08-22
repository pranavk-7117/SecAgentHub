CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  filename TEXT NOT NULL,
  raw_hcl TEXT NOT NULL,
  parsed_hcl_json JSONB DEFAULT '{}'::jsonb,
  raw_checkov_json JSONB,
  graph_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id),
  agent_id TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  amount_paid NUMERIC NOT NULL,
  pay_to_address TEXT NOT NULL,
  challenge_nonce TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  output_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id),
  pdf_storage_path TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_executions_scan_id ON agent_executions(scan_id);
CREATE INDEX idx_scans_user_id ON scans(user_id);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY scans_select_own ON scans
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY scans_insert_own ON scans
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY scans_update_own ON scans
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY agent_executions_select_own ON agent_executions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM scans WHERE scans.id = agent_executions.scan_id AND scans.user_id = auth.uid())
  );

CREATE POLICY agent_executions_insert_own ON agent_executions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM scans WHERE scans.id = agent_executions.scan_id AND scans.user_id = auth.uid())
  );

CREATE POLICY reports_select_own ON reports
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM scans WHERE scans.id = reports.scan_id AND scans.user_id = auth.uid())
  );

CREATE POLICY reports_insert_own ON reports
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM scans WHERE scans.id = reports.scan_id AND scans.user_id = auth.uid())
  );
