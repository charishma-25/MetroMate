-- MetroMind schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS station_lines (
  station_id INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  line TEXT NOT NULL CHECK (line IN ('Red', 'Blue', 'Green')),
  sequence_on_line INT NOT NULL,
  PRIMARY KEY (station_id, line)
);

-- Directed edges (we insert both directions)
CREATE TABLE IF NOT EXISTS edges (
  from_station_id INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  to_station_id INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  line TEXT NOT NULL CHECK (line IN ('Red', 'Blue', 'Green')),
  weight INT NOT NULL DEFAULT 1,
  PRIMARY KEY (from_station_id, to_station_id, line)
);

CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_station_id);
CREATE INDEX IF NOT EXISTS idx_station_lines_line_seq ON station_lines(line, sequence_on_line);