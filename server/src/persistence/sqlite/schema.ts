// Each entry upgrades PRAGMA user_version by one; never edit a shipped entry, append a new one.
export const MIGRATIONS: readonly string[] = [
   `
   CREATE TABLE tasks (
      seq INTEGER PRIMARY KEY,
      id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      due TEXT,
      blocked_on TEXT,
      tags TEXT NOT NULL,
      parent_id TEXT REFERENCES tasks(id),
      links TEXT NOT NULL,
      assignee TEXT NOT NULL,
      source_key TEXT UNIQUE,
      imported_from TEXT
   );

   CREATE TABLE task_events (
      id INTEGER PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      at TEXT NOT NULL,
      by TEXT NOT NULL,
      reverts INTEGER REFERENCES task_events(id),
      data TEXT NOT NULL
   );
   CREATE INDEX task_events_by_task ON task_events(task_id, id);
   CREATE INDEX task_events_by_time ON task_events(at);

   CREATE TABLE updates (
      id INTEGER PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      body TEXT NOT NULL,
      by TEXT NOT NULL,
      at TEXT NOT NULL
   );
   CREATE INDEX updates_by_task ON updates(task_id, id);
   CREATE INDEX updates_by_time ON updates(at);

   CREATE TABLE days (
      date TEXT PRIMARY KEY,
      summary TEXT,
      signed_off_at TEXT
   );

   CREATE TABLE day_notes (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL REFERENCES days(date),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
   );
   CREATE INDEX day_notes_by_date ON day_notes(date, id);

   CREATE TABLE meetings (
      id INTEGER PRIMARY KEY,
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      title TEXT NOT NULL,
      join_url TEXT,
      source TEXT NOT NULL,
      cancelled INTEGER NOT NULL
   );
   CREATE INDEX meetings_by_start ON meetings(starts_at);

   CREATE VIRTUAL TABLE search USING fts5(kind UNINDEXED, ref UNINDEXED, body, tokenize = 'porter unicode61');

   CREATE TRIGGER tasks_search_insert AFTER INSERT ON tasks BEGIN
      INSERT INTO search (kind, ref, body) VALUES ('task', new.id, new.title || char(10) || new.description);
   END;
   CREATE TRIGGER tasks_search_update AFTER UPDATE OF title, description ON tasks BEGIN
      DELETE FROM search WHERE kind = 'task' AND ref = old.id;
      INSERT INTO search (kind, ref, body) VALUES ('task', new.id, new.title || char(10) || new.description);
   END;
   CREATE TRIGGER tasks_search_delete AFTER DELETE ON tasks BEGIN
      DELETE FROM search WHERE kind = 'task' AND ref = old.id;
   END;

   CREATE TRIGGER updates_search_insert AFTER INSERT ON updates BEGIN
      INSERT INTO search (kind, ref, body) VALUES ('update', CAST(new.id AS TEXT), new.body);
   END;
   CREATE TRIGGER updates_search_update AFTER UPDATE OF body ON updates BEGIN
      DELETE FROM search WHERE kind = 'update' AND ref = CAST(old.id AS TEXT);
      INSERT INTO search (kind, ref, body) VALUES ('update', CAST(new.id AS TEXT), new.body);
   END;
   CREATE TRIGGER updates_search_delete AFTER DELETE ON updates BEGIN
      DELETE FROM search WHERE kind = 'update' AND ref = CAST(old.id AS TEXT);
   END;

   CREATE TRIGGER day_notes_search_insert AFTER INSERT ON day_notes BEGIN
      INSERT INTO search (kind, ref, body) VALUES ('note', CAST(new.id AS TEXT), new.body);
   END;
   CREATE TRIGGER day_notes_search_delete AFTER DELETE ON day_notes BEGIN
      DELETE FROM search WHERE kind = 'note' AND ref = CAST(old.id AS TEXT);
   END;
   `,
   `
   ALTER TABLE updates ADD COLUMN in_summary INTEGER NOT NULL DEFAULT 1;
   `,
];
