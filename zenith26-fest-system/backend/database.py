import os
import shutil
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def get_db_path() -> Path:
    """Return database path, copying to /tmp on Vercel serverless environment."""
    if os.environ.get("VERCEL"):
        tmp_db = Path("/tmp/fest.db")
        if not tmp_db.exists():
            candidates = [
                BASE_DIR / "fest.db",
                BASE_DIR / "zenith26-fest-system" / "fest.db",
                Path(__file__).resolve().parent.parent / "fest.db",
                Path.cwd() / "fest.db",
            ]
            for c in candidates:
                if c.exists():
                    shutil.copyfile(c, tmp_db)
                    break
        return tmp_db
    return BASE_DIR / "fest.db"


def get_db_connection():
    """Return a connection to the SQLite database with row_factory configured."""
    db_file = get_db_path()
    conn = sqlite3.connect(str(db_file))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    """Initialize database tables if they do not already exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            event_date TEXT NOT NULL,
            event_time TEXT NOT NULL,
            venue TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            fee INTEGER NOT NULL DEFAULT 0,
            icon TEXT
        );
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL REFERENCES events(id),
            student_name TEXT NOT NULL,
            roll_number TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            registered_at TEXT NOT NULL,
            UNIQUE(event_id, email)
        );
    """)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {DB_PATH}")
