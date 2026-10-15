# ⚡ Zenith '26 College Fest Management System & Android Mobile App

A full-stack, production-grade event registration and operations management portal built for **Zenith '26**, an annual college fest (Nov 14–15, 2026), available as both a web application and a native **Android mobile application** using **Kotlin & Android WebView**.

Developed as a Vibe-Coding Capstone project companion to **PM2-01 (How Software Works)** and **PM2-02 (Front-End, Back-End & Mobile)**.

---

## 🛠️ Tech Stack

| Layer | Technology | Role & Purpose |
| :--- | :--- | :--- |
| **Android Application** | Kotlin · Android WebView · Android SDK 34 · Gradle 8.7 | Native Android container hosting the authentic responsive interface, handling back navigation and network security |
| **Frontend** | HTML5 · Tailwind CSS · Vanilla JavaScript | Responsive student portal, real-time filters, modals, cards, admin capacity dashboard |
| **Backend** | Python 3 · FastAPI · Pydantic · Uvicorn | RESTful API, server-side data validation, HTTP error handling, business logic |
| **Database** | SQLite (`fest.db`) | Relational persistence, foreign key integrity, unique constraints (`event_id`, `email`) |
| **Data Ingestion** | OpenPyXL (`events_seed.xlsx`) | Automated startup seeding of 14 fest events from spreadsheet |
| **Testing** | Postman | API contract verification, HTTP status validation (200, 201, 400, 404, 409) |

---

## 📁 Project Structure

```text
zenith26-fest-system/
├── android/                             # Android Studio Kotlin Project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/zenith26/fest/
│   │   │   │   └── MainActivity.kt      # Kotlin WebView activity, Android bridge, back navigation
│   │   │   ├── res/                     # Dark theme, launcher vectors, layouts, network security
│   │   │   ├── assets/frontend/         # Integrated HTML, Tailwind, and JS assets
│   │   │   └── AndroidManifest.xml      # INTERNET permission & cleartext network rules
│   │   └── build.gradle.kts             # App-level Gradle build configuration
│   ├── build.gradle.kts                 # Root Gradle configuration
│   ├── settings.gradle.kts              # Gradle plugin & project management
│   ├── gradlew                          # Gradle wrapper executable
│   └── gradle/wrapper/                  # Gradle 8.7 wrapper distribution
├── backend/
│   ├── database.py                      # SQLite connection helper & schema initialization
│   ├── main.py                          # FastAPI app, REST endpoints, CORS, static file serving
│   ├── models.py                        # Pydantic schemas (EventOut, RegistrationIn/Out, StatsOut)
│   └── seed_data.py                     # Seed script loading events from data/events_seed.xlsx
├── frontend/
│   ├── index.html                       # Student event discovery & registration portal
│   ├── admin.html                       # Admin ops console & capacity utilization tracker
│   └── js/
│       ├── app.js                       # Student UI logic (API fetches, search, filtering, modals)
│       └── admin.js                     # Admin UI logic (live stats, demand sorting, cancellation)
├── data/
│   └── events_seed.xlsx                 # 14 seed events across Technical, Cultural, Sports, Gaming, Workshop
├── fest.db                              # SQLite database (events & registrations tables)
├── requirements.txt                     # Python dependencies
├── README.md                            # Comprehensive project documentation & run instructions
├── gradlew                              # Convenient root Gradle wrapper script
├── zenith26-app-debug.apk               # Pre-compiled, installable Android APK
└── zenith26-api.postman_collection.json # Ready-to-import Postman test suite
```

---

## 🚀 How to Run the Application

### 1. Prerequisites
- **Python 3.9+** installed on your system.
- **Java 17+ (JDK 17)** and **Android SDK 34** (for compiling/running Android).
- **Android Studio** or connected Android device / emulator.

---

### 2. Setup Backend & Virtual Environment

Inside `zenith26-fest-system/`:

```bash
# Create Python virtual environment
python3 -m venv .venv

# Activate virtual environment
# On macOS / Linux:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Install required Python packages
pip install -r requirements.txt
```

---

### 3. Initialize & Seed Database

The database seeds automatically on startup. To verify or manually run the seed script:

```bash
python -m backend.seed_data
```

---

### 4. Start the FastAPI Server

To allow both web browsers and mobile devices (emulators/physical devices) to connect, bind to `0.0.0.0`:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
# or simply execute:
./run_backend.sh
```

- **Student Event Portal:** [http://localhost:8080/](http://localhost:8080/)
- **Admin Coordinator Dashboard:** [http://localhost:8080/admin.html](http://localhost:8080/admin.html)
- **Interactive Swagger API Docs:** [http://localhost:8080/docs](http://localhost:8080/docs)

---

### 5. Build & Run the Android Mobile Application

The Android app is built using **Kotlin** and **Android WebView**, keeping the exact UI, styling, and interactions 100% identical.

#### Option A: Build APK via Terminal
From `zenith26-fest-system/`:

```bash
# Build the Debug APK
./gradlew assembleDebug

# Output APK location:
# zenith26-fest-system/android/app/build/outputs/apk/debug/app-debug.apk
# (Also mirrored at zenith26-fest-system/zenith26-app-debug.apk)
```

#### Option B: Open in Android Studio
1. Open **Android Studio**.
2. Select **Open** and choose the `zenith26-fest-system/android` directory.
3. Sync Gradle and click **Run 'app'** (Shift + F10) on your emulator or connected device.

---

### 6. Mobile Device & Emulator Connectivity

Android devices do not use `localhost` to refer to the host development computer:

1. **Android Emulator:**
   - The app automatically defaults to `http://10.0.2.2:8080`, Android's special alias loopback to your development computer.
   - Start the FastAPI server on port 8080, and the Android emulator will connect immediately.

2. **Physical Android Device (via USB):**
   - Connect your phone via USB with USB Debugging enabled.
   - Run port forwarding:
     ```bash
     adb reverse tcp:8080 tcp:8080
     ```
   - In the app, connect using `http://localhost:8080`.

3. **Physical Android Device (via Wi-Fi LAN):**
   - Ensure phone and laptop are on the same Wi-Fi network.
   - Find your laptop's local IP (e.g. `192.168.1.X` or `172.16.62.215`).
   - In the Zenith '26 Android app, if the server is offline or unreachable, an on-screen connection helper allows entering the backend address (e.g., `http://192.168.1.X:8080`) and tapping **Connect & Retry**.
   - You can also press the device **Menu** key or trigger the Server Settings dialog anytime.

#### Installing Pre-built APK directly via ADB:
```bash
adb install zenith26-app-debug.apk
```

---

## 📡 REST API Contract

All endpoints follow strict REST conventions, returning typed JSON responses:

| Method | Endpoint | Query / Body Params | Response Status | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | `category` (optional), `search` (optional) | `200 OK` | Returns array of events with live-computed `available_seats` |
| `GET` | `/api/events/{id}` | Path: `id` (int) | `200 OK` / `404 Not Found` | Detail view of a single event |
| `POST` | `/api/events/{id}/register` | JSON: `student_name`, `roll_number`, `email`, `phone` | `201 Created` / `400 Bad Request` / `409 Conflict` | Registers a student; enforces duplicate & capacity checks |
| `GET` | `/api/registrations` | `event_id` (optional int) | `200 OK` | Lists registrations with student contact & event titles |
| `GET` | `/api/stats` | None | `200 OK` | Live fest stats: total events, signups, capacity utilization %, upcoming count |
| `POST` | `/api/events` | JSON: `title`, `category`, `venue`, `capacity`, etc. | `201 Created` / `400 Bad Request` | *(Stretch)* Admin adds a new event |
| `DELETE` | `/api/registrations/{id}` | Path: `id` (int) | `200 OK` / `404 Not Found` | *(Stretch)* Admin cancels a registration & releases seat |

---

## 🧪 Postman API Verification

1. Import `zenith26-api.postman_collection.json` into Postman.
2. Ensure the server is running on `http://localhost:8080`.
3. Run the requests in order to test:
   - **Contract Validation:** Verify correct JSON keys and data types.
   - **Happy Path:** Registering a student returns `201 Created`.
   - **Server-Side Validation:** Empty fields or emails without `@` return `400 Bad Request`.
   - **Duplicate Detection:** Registering the same email twice for the same event returns `409 Conflict`.
   - **Full Capacity:** Submitting registrations beyond capacity returns `409 Conflict ("Event is full")`.
   - Refer to `Postman-Testing-Commands-Zenith26.md` for the full 18-request checklist.

---

## 💡 Key PM Architecture Lessons

1. **Client vs. Server as Source of Truth:**
   The frontend displays available seats and prevents submission of blank fields, but the FastAPI backend independently verifies capacity, email syntax, and duplicate records. Never trust the client.
2. **Three-Layer Stack in Practice:**
   - **Presentation Layer:** Kotlin Android WebView + `frontend/index.html` & `app.js`
   - **Business Logic Layer:** `backend/main.py`
   - **Data Layer:** `backend/database.py` & SQLite (`fest.db`)
3. **Cross-Platform Mobile Conversion Strategy:**
   By encapsulating the existing responsive HTML/Tailwind/JS frontend within a native Kotlin WebView container, 100% visual fidelity and interaction parity are preserved with zero redesign risk, while leveraging native Android back-button handling, lifecycle management, and network permissions.
4. **No Stored "Derived" State:**
   `available_seats` is computed dynamically via SQL `(capacity - COUNT(registrations))` rather than stored in a separate column, eliminating data synchronization drift.
