# Postman Testing Commands: Zenith '26 Fest Management System

This testing guide accompanies the **Zenith '26 College Fest Management System** API. It covers the full test suite (18 requests) to verify API contracts, HTTP status codes, edge cases, and server-side validation.

---

## 🚀 Setup Instructions

1. Start the FastAPI backend server:
   ```bash
   cd zenith26-fest-system
   .venv/bin/uvicorn backend.main:app --reload --port 8080
   ```
2. Open the Postman Desktop App.
3. Click **Import** and select `zenith26-api.postman_collection.json`.
4. The environment variable `{{base_url}}` defaults to `http://localhost:8080`.

---

## 📋 Comprehensive 18-Request API Testing Checklist

### Group 1: Events Endpoints (`/api/events`)

#### 1. GET All Events (Base Contract)
- **Method / URL**: `GET http://localhost:8080/api/events`
- **Expected Status**: `200 OK`
- **Expected Response**: JSON array with 14 event objects. Each includes `available_seats`.

#### 2. GET Events by Category (Filter: Technical)
- **Method / URL**: `GET http://localhost:8080/api/events?category=Technical`
- **Expected Status**: `200 OK`
- **Expected Response**: Array with 4 technical events (Code Sprint 2.0, Robo Race, AI Pitch Fest, Web Design Rumble).

#### 3. GET Events by Category (Filter: Cultural)
- **Method / URL**: `GET http://localhost:8080/api/events?category=Cultural`
- **Expected Status**: `200 OK`
- **Expected Response**: Array with 5 cultural events.

#### 4. GET Events by Category (Filter: Sports)
- **Method / URL**: `GET http://localhost:8080/api/events?category=Sports`
- **Expected Status**: `200 OK`
- **Expected Response**: Array with 2 sports events (Football, Chess).

#### 5. GET Events by Search Substring
- **Method / URL**: `GET http://localhost:8080/api/events?search=sprint`
- **Expected Status**: `200 OK`
- **Expected Response**: Single event `Code Sprint 2.0`.

#### 6. GET Events Combined Filter (Category + Search)
- **Method / URL**: `GET http://localhost:8080/api/events?category=Workshop&search=Vibe`
- **Expected Status**: `200 OK`
- **Expected Response**: Array containing `Intro to Vibe Coding`.

#### 7. GET Single Event Detail (Valid ID)
- **Method / URL**: `GET http://localhost:8080/api/events/1`
- **Expected Status**: `200 OK`
- **Expected Response**: Event object for `id: 1` with description, venue, and `available_seats: 100`.

#### 8. GET Single Event Detail (Non-existent ID - 404 Test)
- **Method / URL**: `GET http://localhost:8080/api/events/999`
- **Expected Status**: `404 Not Found`
- **Expected Response**: `{"detail": "Event with ID 999 not found"}`

---

### Group 2: Student Registrations (`/api/events/{id}/register`)

#### 9. POST Valid Registration (Happy Path - 201 Created)
- **Method / URL**: `POST http://localhost:8080/api/events/1/register`
- **Header**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "student_name": "Charu Bansal",
    "roll_number": "26MBA009",
    "email": "charu.bansal@college.edu",
    "phone": "9876543210"
  }
  ```
- **Expected Status**: `201 Created`
- **Expected Response**:
  ```json
  {
    "id": 1,
    "event_id": 1,
    "student_name": "Charu Bansal",
    "registered_at": "2026-..."
  }
  ```

#### 10. POST Registration Missing Name (400 Bad Request)
- **Method / URL**: `POST http://localhost:8080/api/events/1/register`
- **Body**:
  ```json
  {
    "student_name": "",
    "roll_number": "26MBA009",
    "email": "charu.bansal2@college.edu"
  }
  ```
- **Expected Status**: `400 Bad Request`
- **Expected Response**: `{"detail": "Student name, roll number, and email are required"}`

#### 11. POST Registration Invalid Email (400 Bad Request)
- **Method / URL**: `POST http://localhost:8080/api/events/1/register`
- **Body**:
  ```json
  {
    "student_name": "Rahul Verma",
    "roll_number": "26CS045",
    "email": "rahul.verma.college.edu"
  }
  ```
- **Expected Status**: `400 Bad Request`
- **Expected Response**: `{"detail": "Invalid email address: must contain '@'"}`

#### 12. POST Duplicate Registration Check (409 Conflict)
- **Method / URL**: `POST http://localhost:8080/api/events/1/register`
- **Body**: Same as Request 9 (`charu.bansal@college.edu`)
- **Expected Status**: `409 Conflict`
- **Expected Response**: `{"detail": "Already registered"}`

#### 13. POST Registration for Non-Existent Event (404 Not Found)
- **Method / URL**: `POST http://localhost:8080/api/events/999/register`
- **Body**:
  ```json
  {
    "student_name": "Rahul Verma",
    "roll_number": "26CS045",
    "email": "rahul.verma@college.edu"
  }
  ```
- **Expected Status**: `404 Not Found`
- **Expected Response**: `{"detail": "Event with ID 999 not found"}`

---

### Group 3: Registrations Log & Admin Stats

#### 14. GET All Registrations
- **Method / URL**: `GET http://localhost:8080/api/registrations`
- **Expected Status**: `200 OK`
- **Expected Response**: Array of registration records with student details and `event_title`.

#### 15. GET Registrations Filtered by Event ID
- **Method / URL**: `GET http://localhost:8080/api/registrations?event_id=1`
- **Expected Status**: `200 OK`
- **Expected Response**: Filtered registrations list specifically for event ID 1.

#### 16. GET Admin Stats (Live Computed Metrics)
- **Method / URL**: `GET http://localhost:8080/api/stats`
- **Expected Status**: `200 OK`
- **Expected Response**:
  ```json
  {
    "total_events": 14,
    "total_registrations": 1,
    "total_capacity": 1417,
    "overall_utilization_pct": 0.1,
    "upcoming_events_count": 14,
    "events_by_category": {
      "Technical": 4,
      "Cultural": 5,
      "Sports": 2,
      "Gaming": 1,
      "Workshop": 2
    }
  }
  ```

---

### Group 4: Stretch Goals (Admin Operations)

#### 17. POST Create New Event (Stretch Goal - 201 Created)
- **Method / URL**: `POST http://localhost:8080/api/events`
- **Header**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "title": "Quantum Computing Hack",
    "category": "Technical",
    "description": "Hands-on quantum algorithm design.",
    "event_date": "2026-11-15",
    "event_time": "02:00 PM",
    "venue": "Physics Lab 3",
    "capacity": 30,
    "fee": 0,
    "icon": "⚛️"
  }
  ```
- **Expected Status**: `201 Created`

#### 18. DELETE Cancel Registration (Stretch Goal - 200 OK)
- **Method / URL**: `DELETE http://localhost:8080/api/registrations/1`
- **Expected Status**: `200 OK`
- **Expected Response**: `{"message": "Registration cancelled successfully", "id": 1, "event_id": 1}`
