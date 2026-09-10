-- Migration: Add participation_mode to sessions table
-- Date: 2026-09-10
-- Purpose: Support multiple voting participation modes (team_device, individual_device, voting_disabled)

-- Add participation_mode column with enum type
ALTER TABLE sessions ADD COLUMN participation_mode VARCHAR(50) DEFAULT 'team_device';

-- Add constraint to restrict values
ALTER TABLE sessions ADD CONSTRAINT sessions_participation_mode_check 
  CHECK (participation_mode IN ('team_device', 'individual_device', 'voting_disabled'));

-- Update RPC: create_session to support participation_mode
-- The RPC already handles session creation; participation_mode defaults to 'team_device'
-- Facilitators can update it via update_session_participation_mode

-- New RPC to update participation mode
CREATE OR REPLACE FUNCTION update_session_participation_mode(
  p_session_code VARCHAR,
  p_admin_pin VARCHAR,
  p_participation_mode VARCHAR
) RETURNS json AS $$
DECLARE
  v_session_id UUID;
  v_participation_mode VARCHAR;
BEGIN
  -- Validate participation_mode value
  IF p_participation_mode NOT IN ('team_device', 'individual_device', 'voting_disabled') THEN
    RAISE EXCEPTION 'Invalid participation_mode: %', p_participation_mode;
  END IF;

  -- Find session with code and admin_pin
  SELECT id INTO v_session_id
  FROM sessions
  WHERE session_code = p_session_code
    AND admin_pin = p_admin_pin
    AND active = true
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Invalid session code or admin pin';
  END IF;

  -- Update participation_mode
  UPDATE sessions
  SET participation_mode = p_participation_mode,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = v_session_id;

  -- Return updated session
  RETURN json_build_object(
    'session_id', v_session_id,
    'participation_mode', p_participation_mode,
    'updated_at', CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Grant execute permission to all (authenticated users)
GRANT EXECUTE ON FUNCTION update_session_participation_mode(VARCHAR, VARCHAR, VARCHAR) TO authenticated;

-- Add participation_mode to get_session_details RPC return (already includes full session JSON)
-- No changes needed there since it returns the full session row

COMMENT ON COLUMN sessions.participation_mode 
  IS 'Participation mode for the session: team_device (one shared device), individual_device (coming), voting_disabled (skip voting)';

-- Verify no RLS violations
-- sessions table has block-all RLS, so all access must go through RPCs
-- This update is safe - update_session_participation_mode enforces admin_pin check
