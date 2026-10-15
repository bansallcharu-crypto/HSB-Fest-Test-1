from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.database import get_db_connection, init_db
from backend.models import (
    EventCreate,
    EventDetail,
    EventOut,
    RegistrationDetailOut,
    RegistrationIn,
    RegistrationOut,
    StatsOut,
)
from backend.seed_data import seed_events

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="Zenith '26 College Fest Management System API",
    description="API for event registration, scheduling, and fest administration",
    version="1.0.0",
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Ensure database schema is created and seed data is populated on startup."""
    init_db()
    try:
        seed_events()
    except Exception as e:
        print(f"Warning during seed: {e}")


# ==========================================
# REST API Endpoints
# ==========================================


@app.get("/api/events", response_model=List[EventOut])
def get_events(
    category: Optional[str] = Query(None, description="Filter by event category"),
    search: Optional[str] = Query(None, description="Search in event title"),
):
    """List events with computed available seats, with optional category and search filters."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT 
            e.id, e.title, e.category, e.description, e.event_date, e.event_time,
            e.venue, e.capacity, e.fee, e.icon,
            (e.capacity - COUNT(r.id)) AS available_seats
        FROM events e
        LEFT JOIN registrations r ON e.id = r.event_id
        WHERE 1=1
    """
    params = []

    if category and category.strip().lower() != "all":
        query += " AND LOWER(e.category) = LOWER(?)"
        params.append(category.strip())

    if search and search.strip():
        query += " AND LOWER(e.title) LIKE LOWER(?)"
        params.append(f"%{search.strip()}%")

    query += " GROUP BY e.id ORDER BY e.id ASC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    events = []
    for row in rows:
        events.append(
            EventOut(
                id=row["id"],
                title=row["title"],
                category=row["category"],
                description=row["description"] or "",
                event_date=row["event_date"],
                event_time=row["event_time"],
                venue=row["venue"],
                capacity=row["capacity"],
                fee=row["fee"],
                icon=row["icon"] or "",
                available_seats=max(0, row["available_seats"]),
            )
        )
    return events


@app.get("/api/events/{event_id}", response_model=EventDetail)
def get_event_detail(event_id: int):
    """Retrieve details for a single event by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT 
            e.id, e.title, e.category, e.description, e.event_date, e.event_time,
            e.venue, e.capacity, e.fee, e.icon,
            (e.capacity - COUNT(r.id)) AS available_seats
        FROM events e
        LEFT JOIN registrations r ON e.id = r.event_id
        WHERE e.id = ?
        GROUP BY e.id
    """
    cursor.execute(query, (event_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found",
        )

    return EventDetail(
        id=row["id"],
        title=row["title"],
        category=row["category"],
        description=row["description"] or "",
        event_date=row["event_date"],
        event_time=row["event_time"],
        venue=row["venue"],
        capacity=row["capacity"],
        fee=row["fee"],
        icon=row["icon"] or "",
        available_seats=max(0, row["available_seats"]),
    )


@app.post(
    "/api/events/{event_id}/register",
    response_model=RegistrationOut,
    status_code=status.HTTP_201_CREATED,
)
def register_for_event(event_id: int, payload: RegistrationIn):
    """Register a student for an event with strict server-side validation."""
    student_name = payload.student_name.strip()
    roll_number = payload.roll_number.strip()
    email = payload.email.strip()
    phone = payload.phone.strip() if payload.phone else None

    # Server-side validation: Required fields check
    if not student_name or not roll_number or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student name, roll number, and email are required",
        )

    # Email format check
    if "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address: must contain '@'",
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    # Verify event existence and capacity
    cursor.execute("SELECT id, title, capacity FROM events WHERE id = ?", (event_id,))
    event_row = cursor.fetchone()
    if not event_row:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found",
        )

    capacity = event_row["capacity"]

    # Check current registrations count for capacity limit
    cursor.execute("SELECT COUNT(*) FROM registrations WHERE event_id = ?", (event_id,))
    current_regs = cursor.fetchone()[0]
    if current_regs >= capacity:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event is full",
        )

    # Check for duplicate registration for this student/email on this event
    cursor.execute(
        "SELECT id FROM registrations WHERE event_id = ? AND LOWER(email) = LOWER(?)",
        (event_id, email),
    )
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already registered",
        )

    # Insert registration
    registered_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        """
        INSERT INTO registrations (event_id, student_name, roll_number, email, phone, registered_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (event_id, student_name, roll_number, email, phone, registered_at),
    )
    conn.commit()
    reg_id = cursor.lastrowid
    conn.close()

    return RegistrationOut(
        id=reg_id,
        event_id=event_id,
        student_name=student_name,
        registered_at=registered_at,
    )


@app.get("/api/registrations", response_model=List[RegistrationDetailOut])
def get_registrations(event_id: Optional[int] = Query(None, description="Filter by event ID")):
    """List student registrations, optionally filtered by event_id, including event title."""
    conn = get_db_connection()
    cursor = conn.cursor()

    if event_id:
        cursor.execute(
            """
            SELECT r.id, r.event_id, r.student_name, r.roll_number, r.email, r.phone, r.registered_at, e.title AS event_title
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE r.event_id = ?
            ORDER BY r.id DESC
            """,
            (event_id,),
        )
    else:
        cursor.execute(
            """
            SELECT r.id, r.event_id, r.student_name, r.roll_number, r.email, r.phone, r.registered_at, e.title AS event_title
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            ORDER BY r.id DESC
            """
        )

    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append(
            RegistrationDetailOut(
                id=r["id"],
                event_id=r["event_id"],
                student_name=r["student_name"],
                roll_number=r["roll_number"],
                email=r["email"],
                phone=r["phone"],
                registered_at=r["registered_at"],
                event_title=r["event_title"],
            )
        )
    return results


@app.get("/api/stats", response_model=StatsOut)
def get_stats():
    """Live computed fest administration metrics."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Total events and capacity
    cursor.execute("SELECT COUNT(*), COALESCE(SUM(capacity), 0) FROM events")
    event_row = cursor.fetchone()
    total_events = event_row[0] or 0
    total_capacity = event_row[1] or 0

    # Total registrations
    cursor.execute("SELECT COUNT(*) FROM registrations")
    total_registrations = cursor.fetchone()[0] or 0

    # Overall utilization percentage
    overall_utilization_pct = 0.0
    if total_capacity > 0:
        overall_utilization_pct = round((total_registrations / total_capacity) * 100, 1)

    # Upcoming events count: events with event_date today or later
    today_str = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("SELECT COUNT(*) FROM events WHERE event_date >= ?", (today_str,))
    upcoming_events_count = cursor.fetchone()[0] or 0

    # Events by category breakdown
    cursor.execute("SELECT category, COUNT(*) FROM events GROUP BY category")
    category_rows = cursor.fetchall()
    events_by_category = {row[0]: row[1] for row in category_rows}

    conn.close()

    return StatsOut(
        total_events=total_events,
        total_registrations=total_registrations,
        total_capacity=total_capacity,
        overall_utilization_pct=overall_utilization_pct,
        upcoming_events_count=upcoming_events_count,
        events_by_category=events_by_category,
    )


# ==========================================
# Stretch Endpoints (Admin Capabilities)
# ==========================================


@app.post("/api/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate):
    """Stretch Goal: Admin adds a new fest event."""
    title = payload.title.strip()
    category = payload.category.strip()
    venue = payload.venue.strip()
    event_date = payload.event_date.strip()
    event_time = payload.event_time.strip()

    if not title or not category or not venue or not event_date or not event_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title, category, venue, event_date, and event_time are required",
        )

    if payload.capacity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Capacity must be greater than 0",
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO events (title, category, description, event_date, event_time, venue, capacity, fee, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            title,
            category,
            payload.description or "",
            event_date,
            event_time,
            venue,
            payload.capacity,
            payload.fee,
            payload.icon or "🎯",
        ),
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return EventOut(
        id=new_id,
        title=title,
        category=category,
        description=payload.description or "",
        event_date=event_date,
        event_time=event_time,
        venue=venue,
        capacity=payload.capacity,
        fee=payload.fee,
        icon=payload.icon or "🎯",
        available_seats=payload.capacity,
    )


@app.delete("/api/registrations/{registration_id}")
def cancel_registration(registration_id: int):
    """Stretch Goal: Admin cancels a registration."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, event_id, student_name FROM registrations WHERE id = ?", (registration_id,))
    reg = cursor.fetchone()
    if not reg:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Registration with ID {registration_id} not found",
        )

    cursor.execute("DELETE FROM registrations WHERE id = ?", (registration_id,))
    conn.commit()
    conn.close()

    return {
        "message": "Registration cancelled successfully",
        "id": registration_id,
        "event_id": reg["event_id"],
    }


# ==========================================
# Frontend Static Files & SPA Routing
# ==========================================

# Mount JS assets
app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")


@app.get("/", response_class=FileResponse)
def serve_index():
    """Serve the student event portal."""
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/index.html", response_class=FileResponse)
def serve_index_html():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/admin.html", response_class=FileResponse)
def serve_admin():
    """Serve the fest admin dashboard."""
    return FileResponse(FRONTEND_DIR / "admin.html")
