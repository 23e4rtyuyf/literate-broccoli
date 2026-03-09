import csv
import datetime
import io
import json
import os
import smtplib
import sqlite3
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(title="CrisisGrid API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "crisisgrid.db"

# Optional SMTP config (loaded from environment; silently skipped if absent)
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "noreply@crisisgrid.local")
APP_URL = os.environ.get("APP_URL", "http://localhost:5173")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            city TEXT,
            state TEXT,
            lat REAL,
            lng REAL
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS households (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            city TEXT,
            state TEXT,
            zip_code TEXT,
            lat REAL,
            lng REAL,
            neighborhood TEXT,
            contact TEXT,
            email TEXT,
            zone_id INTEGER,
            residents_count INTEGER DEFAULT 1,
            has_mobility_limitations INTEGER DEFAULT 0,
            medical_equipment TEXT DEFAULT '[]',
            languages TEXT DEFAULT '["English"]',
            has_car INTEGER DEFAULT 1,
            is_elderly INTEGER DEFAULT 0,
            can_help INTEGER DEFAULT 1,
            resources TEXT DEFAULT '{}',
            is_captain INTEGER DEFAULT 0,
            is_admin INTEGER DEFAULT 0,
            captain_status TEXT DEFAULT 'none',
            priority_score REAL DEFAULT 0,
            terms_accepted INTEGER DEFAULT 0,
            deleted_at TEXT,
            created_at TEXT,
            FOREIGN KEY (zone_id) REFERENCES zones(id)
        )
    """)

    # Migrate existing households tables that are missing new columns
    for col, defn in [
        ("email", "TEXT"),
        ("is_admin", "INTEGER DEFAULT 0"),
        ("deleted_at", "TEXT"),
    ]:
        try:
            c.execute(f"ALTER TABLE households ADD COLUMN {col} {defn}")
        except Exception:
            pass  # column already exists

    c.execute("""
        CREATE TABLE IF NOT EXISTS crises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            description TEXT,
            declared_by INTEGER,
            declared_at TEXT,
            status TEXT DEFAULT 'active',
            affected_zones TEXT DEFAULT '[]',
            is_drill INTEGER DEFAULT 0,
            resolved_at TEXT,
            FOREIGN KEY (declared_by) REFERENCES households(id)
        )
    """)

    try:
        c.execute("ALTER TABLE crises ADD COLUMN is_drill INTEGER DEFAULT 0")
    except Exception:
        pass

    c.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            crisis_id INTEGER NOT NULL,
            target_household_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            priority_score REAL DEFAULT 0,
            status TEXT DEFAULT 'pending',
            claimed_by INTEGER,
            claimed_at TEXT,
            completed_at TEXT,
            notes TEXT,
            FOREIGN KEY (crisis_id) REFERENCES crises(id),
            FOREIGN KEY (target_household_id) REFERENCES households(id),
            FOREIGN KEY (claimed_by) REFERENCES households(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_household_id INTEGER NOT NULL,
            to_household_id INTEGER NOT NULL,
            crisis_id INTEGER,
            subject TEXT,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            FOREIGN KEY (from_household_id) REFERENCES households(id),
            FOREIGN KEY (to_household_id) REFERENCES households(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS captain_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            household_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            organization TEXT,
            years_resident INTEGER,
            training TEXT,
            statement TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            reviewed_at TEXT,
            reviewed_by INTEGER,
            FOREIGN KEY (household_id) REFERENCES households(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            household_id INTEGER,
            household_name TEXT,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id INTEGER,
            details TEXT,
            created_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


init_db()


# ── Helpers ───────────────────────────────────────────────────────────────────

def log_audit(conn, household_id, household_name, action, target_type=None, target_id=None, details=None):
    now = datetime.datetime.utcnow().isoformat()
    conn.execute("""
        INSERT INTO audit_log (household_id, household_name, action, target_type, target_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (household_id, household_name, action, target_type, target_id,
          json.dumps(details) if details else None, now))


def calculate_priority_score(h: dict) -> float:
    score = 0.0
    if h.get("has_mobility_limitations"):
        score += 40
    medical = h.get("medical_equipment", [])
    if isinstance(medical, str):
        medical = json.loads(medical)
    score += len(medical) * 20
    if h.get("is_elderly"):
        score += 20
    if not h.get("has_car", True):
        score += 15
    if h.get("residents_count", 1) > 3:
        score += 10
    langs = h.get("languages", ["English"])
    if isinstance(langs, str):
        langs = json.loads(langs)
    if langs and langs[0].lower() != "english":
        score += 5
    return min(score, 100.0)


def find_or_create_zone(conn, city: str, state: str, neighborhood: str = None,
                        lat: float = None, lng: float = None) -> int:
    c = conn.cursor()
    zone_name = f"{neighborhood}, {city}" if neighborhood else f"{city}, {state}"
    c.execute("SELECT id FROM zones WHERE LOWER(name) = LOWER(?)", (zone_name,))
    row = c.fetchone()
    if row:
        return row["id"]
    c.execute(
        "INSERT INTO zones (name, city, state, lat, lng) VALUES (?, ?, ?, ?, ?)",
        (zone_name, city, state, lat, lng),
    )
    conn.commit()
    return c.lastrowid


def serialize_household(row: dict) -> dict:
    row["medical_equipment"] = json.loads(row.get("medical_equipment") or "[]")
    row["languages"] = json.loads(row.get("languages") or '["English"]')
    row["resources"] = json.loads(row.get("resources") or "{}")
    return row


def send_crisis_emails(households: list, crisis_type: str, crisis_id: int,
                       description: str, is_drill: bool) -> int:
    """Send email notifications to households with email addresses. Returns count sent."""
    if not SMTP_HOST:
        print("[CrisisGrid] SMTP not configured — skipping email notifications")
        return 0

    CRISIS_LABELS = {
        "storm": "Storm", "outage": "Power Outage", "flood": "Flood",
        "wildfire": "Wildfire", "missing_person": "Missing Person",
    }
    label = CRISIS_LABELS.get(crisis_type, crisis_type.replace("_", " ").title())
    drill_note = "🟡 THIS IS A DRILL — This is a practice exercise only.\n\n" if is_drill else ""
    task_url = f"{APP_URL}/crisis/{crisis_id}"

    sent = 0
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            if SMTP_USER and SMTP_PASSWORD:
                server.login(SMTP_USER, SMTP_PASSWORD)
            for h in households:
                email_addr = h.get("email")
                if not email_addr:
                    continue
                msg = MIMEMultipart("alternative")
                msg["Subject"] = f"{'[DRILL] ' if is_drill else ''}CrisisGrid Alert: {label} declared in your area"
                msg["From"] = SMTP_FROM
                msg["To"] = email_addr
                body = (
                    f"{drill_note}"
                    f"A {label} has been declared in your neighborhood.\n\n"
                    f"{f'Details: {description}' if description else ''}\n\n"
                    f"View the task board and see how you can help:\n{task_url}\n\n"
                    f"Stay safe. If this is a life-threatening emergency, call 911 immediately.\n\n"
                    f"— CrisisGrid"
                )
                msg.attach(MIMEText(body, "plain"))
                server.sendmail(SMTP_FROM, email_addr, msg.as_string())
                sent += 1
    except Exception as e:
        print(f"[CrisisGrid] Email send error: {e}")
    return sent


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ZoneCreate(BaseModel):
    name: str
    description: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class HouseholdCreate(BaseModel):
    name: str
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    neighborhood: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    zone_id: Optional[int] = None
    residents_count: int = 1
    has_mobility_limitations: bool = False
    medical_equipment: List[str] = []
    languages: List[str] = ["English"]
    has_car: bool = True
    is_elderly: bool = False
    can_help: bool = True
    resources: dict = {}
    is_captain: bool = False
    terms_accepted: bool = False


class HouseholdUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    neighborhood: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    residents_count: Optional[int] = None
    has_mobility_limitations: Optional[bool] = None
    medical_equipment: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    has_car: Optional[bool] = None
    is_elderly: Optional[bool] = None
    can_help: Optional[bool] = None
    resources: Optional[dict] = None


class CrisisCreate(BaseModel):
    type: str
    description: Optional[str] = None
    declared_by: int
    affected_zones: List[int] = []
    is_drill: bool = False


class TaskAction(BaseModel):
    household_id: int
    notes: Optional[str] = None


class MessageCreate(BaseModel):
    from_household_id: int
    to_household_id: int
    subject: Optional[str] = None
    content: str
    crisis_id: Optional[int] = None


class ZoneBroadcast(BaseModel):
    from_household_id: int
    zone_id: int
    subject: Optional[str] = None
    content: str
    crisis_id: Optional[int] = None


class CaptainApplicationCreate(BaseModel):
    household_id: int
    role: str
    organization: Optional[str] = None
    years_resident: Optional[int] = None
    training: Optional[str] = None
    statement: str


# ── Zone routes ───────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/zones")
def create_zone(zone: ZoneCreate):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO zones (name, description, city, state, lat, lng) VALUES (?, ?, ?, ?, ?, ?)",
        (zone.name, zone.description, zone.city, zone.state, zone.lat, zone.lng),
    )
    conn.commit()
    zone_id = c.lastrowid
    conn.close()
    return {"id": zone_id, **zone.model_dump()}


@app.get("/api/zones")
def list_zones():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM zones")
    zones = [dict(r) for r in c.fetchall()]
    conn.close()
    return zones


# ── Household routes ──────────────────────────────────────────────────────────

@app.post("/api/households")
def register_household(h: HouseholdCreate):
    conn = get_db()
    c = conn.cursor()

    zone_id = h.zone_id
    if not zone_id and h.city and h.state:
        zone_id = find_or_create_zone(conn, h.city, h.state, h.neighborhood, h.lat, h.lng)

    score = calculate_priority_score({
        "has_mobility_limitations": h.has_mobility_limitations,
        "medical_equipment": h.medical_equipment,
        "languages": h.languages,
        "has_car": h.has_car,
        "is_elderly": h.is_elderly,
        "residents_count": h.residents_count,
    })
    now = datetime.datetime.utcnow().isoformat()
    c.execute("""
        INSERT INTO households
        (name, address, city, state, zip_code, lat, lng, neighborhood,
         contact, email, zone_id, residents_count, has_mobility_limitations,
         medical_equipment, languages, has_car, is_elderly, can_help, resources,
         is_captain, is_admin, captain_status, priority_score, terms_accepted, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    """, (
        h.name, h.address, h.city, h.state, h.zip_code, h.lat, h.lng, h.neighborhood,
        h.contact, h.email, zone_id, h.residents_count, int(h.has_mobility_limitations),
        json.dumps(h.medical_equipment), json.dumps(h.languages),
        int(h.has_car), int(h.is_elderly), int(h.can_help), json.dumps(h.resources),
        int(h.is_captain), "approved" if h.is_captain else "none",
        score, int(h.terms_accepted), now,
    ))
    conn.commit()
    hid = c.lastrowid
    log_audit(conn, hid, h.name, "household_registered", "household", hid)
    conn.commit()
    conn.close()
    return {"id": hid, "priority_score": score, "zone_id": zone_id, **h.model_dump()}


@app.get("/api/households/export.csv")
def export_households_csv():
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT h.id, h.name, h.address, h.city, h.state, h.zip_code,
               h.lat, h.lng, h.contact, h.email, h.residents_count,
               h.has_mobility_limitations, h.medical_equipment, h.languages,
               h.has_car, h.is_elderly, h.can_help, h.resources,
               h.is_captain, h.captain_status, h.priority_score,
               h.created_at, z.name AS zone_name
        FROM households h
        LEFT JOIN zones z ON h.zone_id = z.id
        WHERE h.deleted_at IS NULL
        ORDER BY h.priority_score DESC
    """)
    rows = c.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Name", "Address", "City", "State", "ZIP",
        "Lat", "Lng", "Contact", "Email", "Residents",
        "Mobility Limitations", "Medical Equipment", "Languages",
        "Has Car", "Elderly", "Can Help", "Resources",
        "Is Captain", "Captain Status", "Priority Score",
        "Zone", "Created At",
    ])
    for r in rows:
        writer.writerow([
            r["id"], r["name"], r["address"], r["city"] or "", r["state"] or "",
            r["zip_code"] or "", r["lat"] or "", r["lng"] or "",
            r["contact"] or "", r["email"] or "", r["residents_count"],
            bool(r["has_mobility_limitations"]),
            r["medical_equipment"], r["languages"],
            bool(r["has_car"]), bool(r["is_elderly"]), bool(r["can_help"]),
            r["resources"], bool(r["is_captain"]), r["captain_status"] or "",
            round(r["priority_score"], 1), r["zone_name"] or "", r["created_at"] or "",
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=crisisgrid-households.csv"},
    )


@app.get("/api/households")
def list_households(zone_id: Optional[int] = None, city: Optional[str] = None):
    conn = get_db()
    c = conn.cursor()
    if zone_id:
        c.execute(
            "SELECT * FROM households WHERE zone_id = ? AND deleted_at IS NULL ORDER BY priority_score DESC",
            (zone_id,),
        )
    elif city:
        c.execute(
            "SELECT * FROM households WHERE LOWER(city) = LOWER(?) AND deleted_at IS NULL ORDER BY priority_score DESC",
            (city,),
        )
    else:
        c.execute("SELECT * FROM households WHERE deleted_at IS NULL ORDER BY priority_score DESC")
    rows = [serialize_household(dict(r)) for r in c.fetchall()]
    conn.close()
    return rows


@app.get("/api/households/{hid}")
def get_household(hid: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM households WHERE id = ? AND deleted_at IS NULL", (hid,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Household not found")
    return serialize_household(dict(row))


@app.put("/api/households/{hid}")
def update_household(hid: int, data: HouseholdUpdate):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM households WHERE id = ? AND deleted_at IS NULL", (hid,))
    existing = c.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Household not found")
    ex = dict(existing)

    # Merge: use new value if provided, else keep existing
    updated = {
        "name": data.name if data.name is not None else ex["name"],
        "address": data.address if data.address is not None else ex["address"],
        "city": data.city if data.city is not None else ex.get("city"),
        "state": data.state if data.state is not None else ex.get("state"),
        "zip_code": data.zip_code if data.zip_code is not None else ex.get("zip_code"),
        "lat": data.lat if data.lat is not None else ex.get("lat"),
        "lng": data.lng if data.lng is not None else ex.get("lng"),
        "neighborhood": data.neighborhood if data.neighborhood is not None else ex.get("neighborhood"),
        "contact": data.contact if data.contact is not None else ex.get("contact"),
        "email": data.email if data.email is not None else ex.get("email"),
        "residents_count": data.residents_count if data.residents_count is not None else ex["residents_count"],
        "has_mobility_limitations": data.has_mobility_limitations if data.has_mobility_limitations is not None else bool(ex["has_mobility_limitations"]),
        "medical_equipment": json.dumps(data.medical_equipment) if data.medical_equipment is not None else ex["medical_equipment"],
        "languages": json.dumps(data.languages) if data.languages is not None else ex["languages"],
        "has_car": data.has_car if data.has_car is not None else bool(ex["has_car"]),
        "is_elderly": data.is_elderly if data.is_elderly is not None else bool(ex["is_elderly"]),
        "can_help": data.can_help if data.can_help is not None else bool(ex["can_help"]),
        "resources": json.dumps(data.resources) if data.resources is not None else ex["resources"],
    }

    score = calculate_priority_score({
        "has_mobility_limitations": updated["has_mobility_limitations"],
        "medical_equipment": json.loads(updated["medical_equipment"]) if isinstance(updated["medical_equipment"], str) else updated["medical_equipment"],
        "languages": json.loads(updated["languages"]) if isinstance(updated["languages"], str) else updated["languages"],
        "has_car": updated["has_car"],
        "is_elderly": updated["is_elderly"],
        "residents_count": updated["residents_count"],
    })

    c.execute("""
        UPDATE households SET
            name=?, address=?, city=?, state=?, zip_code=?, lat=?, lng=?,
            neighborhood=?, contact=?, email=?, residents_count=?,
            has_mobility_limitations=?, medical_equipment=?, languages=?,
            has_car=?, is_elderly=?, can_help=?, resources=?, priority_score=?
        WHERE id=?
    """, (
        updated["name"], updated["address"], updated["city"], updated["state"],
        updated["zip_code"], updated["lat"], updated["lng"], updated["neighborhood"],
        updated["contact"], updated["email"], updated["residents_count"],
        int(updated["has_mobility_limitations"]), updated["medical_equipment"],
        updated["languages"], int(updated["has_car"]), int(updated["is_elderly"]),
        int(updated["can_help"]), updated["resources"], score, hid,
    ))
    conn.commit()
    log_audit(conn, hid, updated["name"], "household_updated", "household", hid)
    conn.commit()
    conn.close()
    return {"id": hid, "priority_score": score}


@app.delete("/api/households/{hid}")
def delete_household(hid: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT name FROM households WHERE id = ? AND deleted_at IS NULL", (hid,))
    row = c.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Household not found")
    name = dict(row)["name"]
    now = datetime.datetime.utcnow().isoformat()
    c.execute("UPDATE households SET deleted_at=? WHERE id=?", (now, hid))
    conn.commit()
    log_audit(conn, hid, name, "household_deleted", "household", hid)
    conn.commit()
    conn.close()
    return {"status": "deleted"}


# ── Crisis routes ─────────────────────────────────────────────────────────────

@app.post("/api/crisis")
def activate_crisis(crisis: CrisisCreate):
    conn = get_db()
    c = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    c.execute("""
        INSERT INTO crises (type, description, declared_by, declared_at, status, affected_zones, is_drill)
        VALUES (?, ?, ?, ?, 'active', ?, ?)
    """, (crisis.type, crisis.description, crisis.declared_by, now,
          json.dumps(crisis.affected_zones), int(crisis.is_drill)))
    conn.commit()
    crisis_id = c.lastrowid

    if crisis.affected_zones:
        placeholders = ",".join("?" * len(crisis.affected_zones))
        c.execute(
            f"SELECT * FROM households WHERE zone_id IN ({placeholders}) AND deleted_at IS NULL ORDER BY priority_score DESC",
            crisis.affected_zones,
        )
    else:
        c.execute("SELECT * FROM households WHERE deleted_at IS NULL ORDER BY priority_score DESC")
    households = [dict(r) for r in c.fetchall()]

    verbs = {
        "storm": "Check on",
        "outage": "Check on",
        "flood": "Check on and assist",
        "wildfire": "Assist with evacuation for",
        "missing_person": "Search area near",
    }
    verb = verbs.get(crisis.type, "Check on")

    for h in households:
        med = json.loads(h["medical_equipment"])
        langs = json.loads(h["languages"])
        details = []
        if h["has_mobility_limitations"]:
            details.append("mobility limitations")
        if med:
            details.append(f"medical: {', '.join(med)}")
        if not h["has_car"]:
            details.append("no vehicle")
        if h["is_elderly"]:
            details.append("elderly")
        if langs and langs[0].lower() != "english":
            details.append(f"speaks {langs[0]}")
        detail_str = f" ({', '.join(details)})" if details else ""
        location = h["address"]
        if h.get("city"):
            location += f", {h['city']}"
        desc = f"{verb} {location}{detail_str} — {h['residents_count']} resident(s)"
        c.execute(
            "INSERT INTO tasks (crisis_id, target_household_id, description, priority_score, status) VALUES (?, ?, ?, ?, 'pending')",
            (crisis_id, h["id"], desc, h["priority_score"]),
        )

    # Get declarer name for audit
    c.execute("SELECT name FROM households WHERE id=?", (crisis.declared_by,))
    declarer = c.fetchone()
    declarer_name = dict(declarer)["name"] if declarer else "Unknown"

    conn.commit()
    log_audit(conn, crisis.declared_by, declarer_name, "crisis_activated", "crisis", crisis_id,
              {"type": crisis.type, "is_drill": crisis.is_drill, "tasks": len(households)})
    conn.commit()

    # Send email notifications
    emails_sent = send_crisis_emails(households, crisis.type, crisis_id,
                                     crisis.description or "", crisis.is_drill)

    conn.close()
    return {"id": crisis_id, "tasks_generated": len(households), "emails_sent": emails_sent}


@app.get("/api/crisis")
def list_crises():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM crises ORDER BY declared_at DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    for r in rows:
        r["affected_zones"] = json.loads(r["affected_zones"])
        r["is_drill"] = bool(r.get("is_drill", 0))
    return rows


@app.get("/api/crisis/{crisis_id}")
def get_crisis(crisis_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM crises WHERE id = ?", (crisis_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Crisis not found")
    r = dict(row)
    r["affected_zones"] = json.loads(r["affected_zones"])
    r["is_drill"] = bool(r.get("is_drill", 0))
    return r


@app.get("/api/crisis/{crisis_id}/tasks")
def get_tasks(crisis_id: int, status: Optional[str] = None):
    conn = get_db()
    c = conn.cursor()
    if status:
        c.execute(
            "SELECT * FROM tasks WHERE crisis_id = ? AND status = ? ORDER BY priority_score DESC",
            (crisis_id, status),
        )
    else:
        c.execute(
            "SELECT * FROM tasks WHERE crisis_id = ? ORDER BY priority_score DESC",
            (crisis_id,),
        )
    tasks = [dict(r) for r in c.fetchall()]
    conn.close()
    return tasks


@app.post("/api/tasks/{task_id}/claim")
def claim_task(task_id: int, action: TaskAction):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT status FROM tasks WHERE id = ?", (task_id,))
    row = c.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    if dict(row)["status"] != "pending":
        raise HTTPException(status_code=400, detail="Task is not pending")
    now = datetime.datetime.utcnow().isoformat()
    c.execute(
        "UPDATE tasks SET status='claimed', claimed_by=?, claimed_at=? WHERE id=?",
        (action.household_id, now, task_id),
    )
    conn.commit()
    c.execute("SELECT name FROM households WHERE id=?", (action.household_id,))
    h = c.fetchone()
    log_audit(conn, action.household_id, dict(h)["name"] if h else "Unknown",
              "task_claimed", "task", task_id)
    conn.commit()
    conn.close()
    return {"status": "claimed"}


@app.post("/api/tasks/{task_id}/complete")
def complete_task(task_id: int, action: TaskAction):
    conn = get_db()
    c = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    c.execute(
        "UPDATE tasks SET status='completed', completed_at=?, notes=? WHERE id=?",
        (now, action.notes, task_id),
    )
    conn.commit()
    c.execute("SELECT name FROM households WHERE id=?", (action.household_id,))
    h = c.fetchone()
    log_audit(conn, action.household_id, dict(h)["name"] if h else "Unknown",
              "task_completed", "task", task_id, {"notes": action.notes})
    conn.commit()
    conn.close()
    return {"status": "completed"}


@app.post("/api/tasks/{task_id}/flag")
def flag_task(task_id: int, action: TaskAction):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "UPDATE tasks SET status='flagged', notes=? WHERE id=?",
        (action.notes, task_id),
    )
    conn.commit()
    c.execute("SELECT name FROM households WHERE id=?", (action.household_id,))
    h = c.fetchone()
    log_audit(conn, action.household_id, dict(h)["name"] if h else "Unknown",
              "task_flagged", "task", task_id, {"notes": action.notes})
    conn.commit()
    conn.close()
    return {"status": "flagged"}


@app.post("/api/crisis/{crisis_id}/resolve")
def resolve_crisis(crisis_id: int):
    conn = get_db()
    c = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    c.execute("SELECT declared_by FROM crises WHERE id=?", (crisis_id,))
    row = c.fetchone()
    c.execute(
        "UPDATE crises SET status='resolved', resolved_at=? WHERE id=?",
        (now, crisis_id),
    )
    conn.commit()
    if row:
        declared_by = dict(row)["declared_by"]
        c.execute("SELECT name FROM households WHERE id=?", (declared_by,))
        h = c.fetchone()
        log_audit(conn, declared_by, dict(h)["name"] if h else "Unknown",
                  "crisis_resolved", "crisis", crisis_id)
        conn.commit()
    conn.close()
    return {"status": "resolved"}


@app.get("/api/crisis/{crisis_id}/debrief")
def get_debrief(crisis_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM crises WHERE id = ?", (crisis_id,))
    crisis_row = c.fetchone()
    if not crisis_row:
        raise HTTPException(status_code=404, detail="Crisis not found")
    crisis = dict(crisis_row)
    crisis["affected_zones"] = json.loads(crisis["affected_zones"])
    crisis["is_drill"] = bool(crisis.get("is_drill", 0))

    c.execute("SELECT * FROM tasks WHERE crisis_id = ?", (crisis_id,))
    tasks = [dict(r) for r in c.fetchall()]
    conn.close()

    total = len(tasks)
    completed = [t for t in tasks if t["status"] == "completed"]
    pending = [t for t in tasks if t["status"] == "pending"]
    claimed = [t for t in tasks if t["status"] == "claimed"]
    flagged = [t for t in tasks if t["status"] == "flagged"]
    coverage = round(len(completed) / total * 100, 1) if total > 0 else 0
    high_priority_unchecked = [
        t for t in tasks
        if t["status"] in ("pending", "claimed") and t["priority_score"] >= 40
    ]

    return {
        "crisis": crisis,
        "summary": {
            "total_tasks": total,
            "completed": len(completed),
            "pending": len(pending),
            "claimed": len(claimed),
            "flagged": len(flagged),
            "coverage_rate": coverage,
        },
        "high_priority_unchecked": high_priority_unchecked,
        "flagged_tasks": flagged,
        "completed_tasks": completed,
        "generated_at": datetime.datetime.utcnow().isoformat(),
    }


@app.get("/api/crisis/{crisis_id}/debrief/export.csv")
def export_debrief_csv(crisis_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT type, declared_at, status, is_drill FROM crises WHERE id=?", (crisis_id,))
    crisis_row = c.fetchone()
    if not crisis_row:
        raise HTTPException(status_code=404, detail="Crisis not found")
    crisis = dict(crisis_row)

    c.execute("""
        SELECT t.id, t.description, t.priority_score, t.status,
               t.claimed_at, t.completed_at, t.notes,
               h.name AS claimer_name
        FROM tasks t
        LEFT JOIN households h ON t.claimed_by = h.id
        WHERE t.crisis_id = ?
        ORDER BY t.priority_score DESC
    """, (crisis_id,))
    tasks = c.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Task ID", "Description", "Priority Score", "Status",
        "Claimed At", "Completed At", "Notes", "Claimed By",
        "Crisis Type", "Declared At", "Is Drill",
    ])
    for t in tasks:
        writer.writerow([
            t["id"], t["description"], round(t["priority_score"], 1), t["status"],
            t["claimed_at"] or "", t["completed_at"] or "", t["notes"] or "",
            t["claimer_name"] or "",
            crisis["type"], crisis["declared_at"], bool(crisis.get("is_drill", 0)),
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=crisis-{crisis_id}-debrief.csv"},
    )


# ── Messaging routes ──────────────────────────────────────────────────────────

@app.post("/api/messages")
def send_message(msg: MessageCreate):
    conn = get_db()
    c = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    c.execute("""
        INSERT INTO messages (from_household_id, to_household_id, crisis_id, subject, content, created_at, is_read)
        VALUES (?, ?, ?, ?, ?, ?, 0)
    """, (msg.from_household_id, msg.to_household_id, msg.crisis_id, msg.subject, msg.content, now))
    conn.commit()
    msg_id = c.lastrowid
    conn.close()
    return {"id": msg_id, "created_at": now}


@app.post("/api/messages/broadcast")
def broadcast_to_zone(broadcast: ZoneBroadcast):
    """Send a message to every household in a zone."""
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id FROM households WHERE zone_id = ? AND id != ? AND deleted_at IS NULL",
              (broadcast.zone_id, broadcast.from_household_id))
    recipients = [row["id"] for row in c.fetchall()]
    if not recipients:
        conn.close()
        raise HTTPException(status_code=400, detail="No recipients in zone")
    now = datetime.datetime.utcnow().isoformat()
    for rid in recipients:
        c.execute("""
            INSERT INTO messages (from_household_id, to_household_id, crisis_id, subject, content, created_at, is_read)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        """, (broadcast.from_household_id, rid, broadcast.crisis_id, broadcast.subject, broadcast.content, now))
    conn.commit()
    conn.close()
    return {"sent_to": len(recipients)}


@app.get("/api/messages/inbox/{household_id}")
def get_inbox(household_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT m.*, h.name AS sender_name, h.address AS sender_address
        FROM messages m
        JOIN households h ON m.from_household_id = h.id
        WHERE m.to_household_id = ?
        ORDER BY m.created_at DESC
    """, (household_id,))
    msgs = [dict(r) for r in c.fetchall()]
    conn.close()
    return msgs


@app.get("/api/messages/sent/{household_id}")
def get_sent(household_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT m.*, h.name AS recipient_name, h.address AS recipient_address
        FROM messages m
        JOIN households h ON m.to_household_id = h.id
        WHERE m.from_household_id = ?
        ORDER BY m.created_at DESC
    """, (household_id,))
    msgs = [dict(r) for r in c.fetchall()]
    conn.close()
    return msgs


@app.get("/api/messages/unread/{household_id}")
def get_unread_count(household_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT COUNT(*) as count FROM messages WHERE to_household_id = ? AND is_read = 0",
        (household_id,),
    )
    count = dict(c.fetchone())["count"]
    conn.close()
    return {"count": count}


@app.put("/api/messages/{msg_id}/read")
def mark_read(msg_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE messages SET is_read = 1 WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.put("/api/messages/read-all/{household_id}")
def mark_all_read(household_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE messages SET is_read = 1 WHERE to_household_id = ?", (household_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


# ── Captain application routes ────────────────────────────────────────────────

@app.post("/api/captain-apply")
def apply_captain(app_data: CaptainApplicationCreate):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id, status FROM captain_applications WHERE household_id = ?",
        (app_data.household_id,),
    )
    existing = c.fetchone()
    if existing:
        status = dict(existing)["status"]
        if status == "pending":
            raise HTTPException(status_code=400, detail="Application already pending")
        if status == "approved":
            raise HTTPException(status_code=400, detail="Already an approved captain")
    now = datetime.datetime.utcnow().isoformat()
    c.execute("""
        INSERT INTO captain_applications
        (household_id, role, organization, years_resident, training, statement, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    """, (
        app_data.household_id, app_data.role, app_data.organization,
        app_data.years_resident, app_data.training, app_data.statement, now,
    ))
    conn.commit()
    app_id = c.lastrowid
    c.execute("SELECT name FROM households WHERE id=?", (app_data.household_id,))
    h = c.fetchone()
    log_audit(conn, app_data.household_id, dict(h)["name"] if h else "Unknown",
              "captain_application_submitted", "captain_application", app_id)
    conn.commit()
    conn.close()
    return {"id": app_id, "status": "pending"}


@app.get("/api/captain-applications")
def list_captain_applications(status: Optional[str] = None):
    conn = get_db()
    c = conn.cursor()
    if status:
        c.execute("""
            SELECT ca.*, h.name AS applicant_name, h.address, h.zone_id
            FROM captain_applications ca
            JOIN households h ON ca.household_id = h.id
            WHERE ca.status = ?
            ORDER BY ca.created_at DESC
        """, (status,))
    else:
        c.execute("""
            SELECT ca.*, h.name AS applicant_name, h.address, h.zone_id
            FROM captain_applications ca
            JOIN households h ON ca.household_id = h.id
            ORDER BY ca.created_at DESC
        """)
    apps = [dict(r) for r in c.fetchall()]
    conn.close()
    return apps


@app.put("/api/captain-applications/{app_id}/approve")
def approve_captain(app_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM captain_applications WHERE id = ?", (app_id,))
    row = c.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    now = datetime.datetime.utcnow().isoformat()
    household_id = dict(row)["household_id"]
    c.execute(
        "UPDATE captain_applications SET status='approved', reviewed_at=? WHERE id=?",
        (now, app_id),
    )
    c.execute(
        "UPDATE households SET is_captain=1, captain_status='approved' WHERE id=?",
        (household_id,),
    )
    conn.commit()
    c.execute("SELECT name FROM households WHERE id=?", (household_id,))
    h = c.fetchone()
    log_audit(conn, household_id, dict(h)["name"] if h else "Unknown",
              "captain_application_approved", "captain_application", app_id)
    conn.commit()
    conn.close()
    return {"status": "approved"}


@app.put("/api/captain-applications/{app_id}/deny")
def deny_captain(app_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT household_id FROM captain_applications WHERE id=?", (app_id,))
    row = c.fetchone()
    now = datetime.datetime.utcnow().isoformat()
    c.execute(
        "UPDATE captain_applications SET status='denied', reviewed_at=? WHERE id=?",
        (now, app_id),
    )
    conn.commit()
    if row:
        hid = dict(row)["household_id"]
        c.execute("SELECT name FROM households WHERE id=?", (hid,))
        h = c.fetchone()
        log_audit(conn, hid, dict(h)["name"] if h else "Unknown",
                  "captain_application_denied", "captain_application", app_id)
        conn.commit()
    conn.close()
    return {"status": "denied"}


# ── Admin routes ──────────────────────────────────────────────────────────────

@app.get("/api/admin/stats")
def admin_stats():
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) as cnt FROM zones")
    total_zones = c.fetchone()["cnt"]

    c.execute("SELECT COUNT(*) as cnt FROM households WHERE deleted_at IS NULL")
    total_households = c.fetchone()["cnt"]

    c.execute("SELECT COUNT(*) as cnt FROM crises WHERE status='active' AND is_drill=0")
    active_crises = c.fetchone()["cnt"]

    c.execute("SELECT COUNT(*) as cnt FROM crises WHERE status='active' AND is_drill=1")
    active_drills = c.fetchone()["cnt"]

    c.execute("SELECT COUNT(*) as cnt FROM crises WHERE status='resolved' AND is_drill=0")
    resolved_crises = c.fetchone()["cnt"]

    c.execute("SELECT COUNT(*) as cnt FROM captain_applications WHERE status='pending'")
    pending_apps = c.fetchone()["cnt"]

    # Coverage: completed tasks / total tasks across all crises
    c.execute("SELECT COUNT(*) as cnt FROM tasks WHERE status='completed'")
    completed_tasks = c.fetchone()["cnt"]
    c.execute("SELECT COUNT(*) as cnt FROM tasks")
    total_tasks = c.fetchone()["cnt"]
    coverage = round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0

    # Per-zone stats
    c.execute("""
        SELECT z.id, z.name,
               COUNT(DISTINCT h.id) AS household_count,
               SUM(CASE WHEN h.is_captain=1 THEN 1 ELSE 0 END) AS captain_count,
               SUM(CASE WHEN h.priority_score >= 40 THEN 1 ELSE 0 END) AS high_priority_count
        FROM zones z
        LEFT JOIN households h ON h.zone_id = z.id AND h.deleted_at IS NULL
        GROUP BY z.id, z.name
        ORDER BY z.name
    """)
    zones = [dict(r) for r in c.fetchall()]

    conn.close()
    return {
        "total_zones": total_zones,
        "total_households": total_households,
        "active_crises": active_crises,
        "active_drills": active_drills,
        "resolved_crises": resolved_crises,
        "pending_applications": pending_apps,
        "coverage_rate": coverage,
        "zones": zones,
    }


@app.get("/api/admin/audit-log")
def get_audit_log(limit: int = 100):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?",
        (min(limit, 500),),
    )
    entries = [dict(r) for r in c.fetchall()]
    conn.close()
    return entries


# ── Seed ──────────────────────────────────────────────────────────────────────

@app.post("/api/seed")
def seed_demo():
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM audit_log")
    c.execute("DELETE FROM captain_applications")
    c.execute("DELETE FROM messages")
    c.execute("DELETE FROM tasks")
    c.execute("DELETE FROM crises")
    c.execute("DELETE FROM households")
    c.execute("DELETE FROM zones")
    conn.commit()

    now = datetime.datetime.utcnow().isoformat()

    c.execute("""INSERT INTO zones (name, city, state, lat, lng)
                 VALUES ('Oak Street Block, Portland', 'Portland', 'OR', 45.5231, -122.6765)""")
    zone_a = c.lastrowid
    c.execute("""INSERT INTO zones (name, city, state, lat, lng)
                 VALUES ('Maple Ave Block, Portland', 'Portland', 'OR', 45.5198, -122.6742)""")
    zone_b = c.lastrowid
    conn.commit()

    # (name, address, city, state, zip, lat, lng, neighborhood, contact, email,
    #  zone_id, residents, mobility, medical, languages, car, elderly, can_help, resources,
    #  is_captain, is_admin)
    seed = [
        ("Margaret Chen",    "821 Oak St",    "Portland","OR","97201", 45.5235,-122.6768, "Oak Street", "503-555-0101", "margaret@example.com", zone_a, 1, True,  ["oxygen concentrator"],    ["Mandarin","English"],   False,True,  False,{},                                  False, False),
        ("Rodriguez Family", "835 Oak St",    "Portland","OR","97201", 45.5238,-122.6770, "Oak Street", "503-555-0102", "rodriguez@example.com", zone_a, 5, False, [],                          ["Spanish"],              False,False, True, {"generator":True,"truck":True},      False, False),
        ("James Okafor",     "847 Oak St",    "Portland","OR","97201", 45.5241,-122.6771, "Oak Street", "503-555-0103", "james@example.com", zone_a, 1, True,  ["dialysis equipment"],      ["English"],              False,True,  False,{},                                  False, False),
        ("The Nguyens",      "852 Oak St",    "Portland","OR","97201", 45.5244,-122.6773, "Oak Street", "503-555-0104", "nguyens@example.com", zone_a, 4, False, [],                          ["Vietnamese","English"], True, False, True, {"first_aid":True},                  False, False),
        ("Carol Winters",    "863 Oak St",    "Portland","OR","97201", 45.5247,-122.6775, "Oak Street", "503-555-0105", "carol@example.com", zone_a, 2, False, [],                          ["English"],              True, True,  True, {"spare_room":True},                 True,  False),
        ("Ahmed Al-Rashid",  "14 Maple Ave",  "Portland","OR","97202", 45.5201,-122.6745, "Maple Ave",  "503-555-0201", "ahmed@example.com", zone_b, 3, False, [],                          ["Arabic","English"],     True, False, True, {"generator":True},                  False, False),
        ("Linda Park",       "22 Maple Ave",  "Portland","OR","97202", 45.5203,-122.6747, "Maple Ave",  "503-555-0202", "linda@example.com", zone_b, 1, True,  ["power wheelchair charger"],["Korean","English"],     False,True,  False,{},                                  False, False),
        ("Dave & Sue Henley","31 Maple Ave",  "Portland","OR","97202", 45.5206,-122.6749, "Maple Ave",  "503-555-0203", "henleys@example.com", zone_b, 2, False, [],                          ["English"],              True, True,  True, {"truck":True,"first_aid":True},      True,  False),
        ("Patel Household",  "45 Maple Ave",  "Portland","OR","97202", 45.5209,-122.6751, "Maple Ave",  "503-555-0204", "patel@example.com", zone_b, 6, False, [],                          ["Gujarati","English"],   True, False, True, {},                                   False, False),
        ("Ruth Abernathy",   "58 Maple Ave",  "Portland","OR","97202", 45.5212,-122.6753, "Maple Ave",  "503-555-0205", "ruth@example.com", zone_b, 1, True,  [],                          ["English"],              False,True,  False,{},                                   False, False),
        # City admin account
        ("City Emergency Mgmt", "1 City Hall Plaza", "Portland","OR","97201", 45.5231,-122.6760, None, "503-555-9000", "admin@portlandor.gov", zone_a, 1, False, [], ["English"], True, False, False, {}, True, True),
    ]

    captain_ids = []
    admin_id = None
    for h in seed:
        score = calculate_priority_score({
            "has_mobility_limitations": h[12],
            "medical_equipment": h[13],
            "languages": h[14],
            "has_car": h[15],
            "is_elderly": h[16],
            "residents_count": h[11],
        })
        c.execute("""
            INSERT INTO households
            (name, address, city, state, zip_code, lat, lng, neighborhood,
             contact, email, zone_id, residents_count, has_mobility_limitations,
             medical_equipment, languages, has_car, is_elderly, can_help, resources,
             is_captain, is_admin, captain_status, priority_score, terms_accepted, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (
            h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7],
            h[8], h[9], h[10], h[11],
            int(h[12]), json.dumps(h[13]), json.dumps(h[14]),
            int(h[15]), int(h[16]), int(h[17]), json.dumps(h[18]),
            int(h[19]), int(h[20]),
            "approved" if h[19] or h[20] else "none",
            score, now,
        ))
        hid = c.lastrowid
        if h[19]:  # is_captain
            captain_ids.append(hid)
        if h[20]:  # is_admin
            admin_id = hid

    conn.commit()

    # Auto-approve captains via applications
    for cid in captain_ids:
        c.execute("""
            INSERT INTO captain_applications
            (household_id, role, organization, years_resident, training, statement, status, created_at, reviewed_at)
            VALUES (?, 'Block Captain', 'Neighborhood Association', 5, 'CERT Basic Training',
                    'Committed to keeping our block safe.', 'approved', ?, ?)
        """, (cid, now, now))

    # Seed a demo message
    all_hids = [r["id"] for r in [dict(rr) for rr in c.execute("SELECT id FROM households WHERE is_admin=0").fetchall()]]
    if len(all_hids) >= 2 and captain_ids:
        c.execute("""
            INSERT INTO messages (from_household_id, to_household_id, subject, content, created_at, is_read)
            VALUES (?, ?, 'Welcome to CrisisGrid', 'Hi neighbor! I am your block captain. Please make sure your household info is up to date. I will reach out before any drills.', ?, 0)
        """, (captain_ids[0], all_hids[1], now))

    # Seed some audit entries
    log_audit(conn, admin_id, "City Emergency Mgmt", "system_seeded", None, None, {"households": len(seed)})

    conn.commit()
    conn.close()
    return {"message": "Demo data loaded", "zones": 2, "households": len(seed)}
