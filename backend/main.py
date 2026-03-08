import datetime
import json
import sqlite3
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="CrisisGrid API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "crisisgrid.db"


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
            captain_status TEXT DEFAULT 'none',
            priority_score REAL DEFAULT 0,
            terms_accepted INTEGER DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY (zone_id) REFERENCES zones(id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS crises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            description TEXT,
            declared_by INTEGER,
            declared_at TEXT,
            status TEXT DEFAULT 'active',
            affected_zones TEXT DEFAULT '[]',
            resolved_at TEXT,
            FOREIGN KEY (declared_by) REFERENCES households(id)
        )
    """)

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

    conn.commit()
    conn.close()


init_db()


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


class CrisisCreate(BaseModel):
    type: str
    description: Optional[str] = None
    declared_by: int
    affected_zones: List[int] = []


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

    # Auto-assign zone based on city/neighborhood if not provided
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
         contact, zone_id, residents_count, has_mobility_limitations,
         medical_equipment, languages, has_car, is_elderly, can_help, resources,
         is_captain, captain_status, priority_score, terms_accepted, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        h.name, h.address, h.city, h.state, h.zip_code, h.lat, h.lng, h.neighborhood,
        h.contact, zone_id, h.residents_count, int(h.has_mobility_limitations),
        json.dumps(h.medical_equipment), json.dumps(h.languages),
        int(h.has_car), int(h.is_elderly), int(h.can_help), json.dumps(h.resources),
        int(h.is_captain), "approved" if h.is_captain else "none",
        score, int(h.terms_accepted), now,
    ))
    conn.commit()
    hid = c.lastrowid
    conn.close()
    return {"id": hid, "priority_score": score, "zone_id": zone_id, **h.model_dump()}


@app.get("/api/households")
def list_households(zone_id: Optional[int] = None, city: Optional[str] = None):
    conn = get_db()
    c = conn.cursor()
    if zone_id:
        c.execute("SELECT * FROM households WHERE zone_id = ? ORDER BY priority_score DESC", (zone_id,))
    elif city:
        c.execute("SELECT * FROM households WHERE LOWER(city) = LOWER(?) ORDER BY priority_score DESC", (city,))
    else:
        c.execute("SELECT * FROM households ORDER BY priority_score DESC")
    rows = [serialize_household(dict(r)) for r in c.fetchall()]
    conn.close()
    return rows


@app.get("/api/households/{hid}")
def get_household(hid: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM households WHERE id = ?", (hid,))
    row = c.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Household not found")
    return serialize_household(dict(row))


# ── Crisis routes ─────────────────────────────────────────────────────────────

@app.post("/api/crisis")
def activate_crisis(crisis: CrisisCreate):
    conn = get_db()
    c = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    c.execute("""
        INSERT INTO crises (type, description, declared_by, declared_at, status, affected_zones)
        VALUES (?, ?, ?, ?, 'active', ?)
    """, (crisis.type, crisis.description, crisis.declared_by, now, json.dumps(crisis.affected_zones)))
    conn.commit()
    crisis_id = c.lastrowid

    if crisis.affected_zones:
        placeholders = ",".join("?" * len(crisis.affected_zones))
        c.execute(
            f"SELECT * FROM households WHERE zone_id IN ({placeholders}) ORDER BY priority_score DESC",
            crisis.affected_zones,
        )
    else:
        c.execute("SELECT * FROM households ORDER BY priority_score DESC")
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

    conn.commit()
    conn.close()
    return {"id": crisis_id, "tasks_generated": len(households)}


@app.get("/api/crisis")
def list_crises():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM crises ORDER BY declared_at DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    for r in rows:
        r["affected_zones"] = json.loads(r["affected_zones"])
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
    conn.close()
    return {"status": "flagged"}


@app.post("/api/crisis/{crisis_id}/resolve")
def resolve_crisis(crisis_id: int):
    conn = get_db()
    c = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    c.execute(
        "UPDATE crises SET status='resolved', resolved_at=? WHERE id=?",
        (now, crisis_id),
    )
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
    c.execute("SELECT id FROM households WHERE zone_id = ? AND id != ?",
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
    # Check for existing pending application
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
    conn.close()
    return {"status": "approved"}


@app.put("/api/captain-applications/{app_id}/deny")
def deny_captain(app_id: int):
    conn = get_db()
    c = conn.cursor()
    now = datetime.datetime.utcnow().isoformat()
    c.execute(
        "UPDATE captain_applications SET status='denied', reviewed_at=? WHERE id=?",
        (now, app_id),
    )
    conn.commit()
    conn.close()
    return {"status": "denied"}


# ── Seed ──────────────────────────────────────────────────────────────────────

@app.post("/api/seed")
def seed_demo():
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM captain_applications")
    c.execute("DELETE FROM messages")
    c.execute("DELETE FROM tasks")
    c.execute("DELETE FROM crises")
    c.execute("DELETE FROM households")
    c.execute("DELETE FROM zones")
    conn.commit()

    now = datetime.datetime.utcnow().isoformat()

    # Two realistic US zones with real coordinates
    c.execute("""INSERT INTO zones (name, city, state, lat, lng)
                 VALUES ('Oak Street Block, Portland', 'Portland', 'OR', 45.5231, -122.6765)""")
    zone_a = c.lastrowid
    c.execute("""INSERT INTO zones (name, city, state, lat, lng)
                 VALUES ('Maple Ave Block, Portland', 'Portland', 'OR', 45.5198, -122.6742)""")
    zone_b = c.lastrowid
    conn.commit()

    # (name, address, city, state, zip, lat, lng, neighborhood, contact,
    #  zone_id, residents, mobility, medical, languages, car, elderly, can_help, resources, is_captain)
    seed = [
        ("Margaret Chen",    "821 Oak St",    "Portland","OR","97201", 45.5235,-122.6768, "Oak Street", "503-555-0101", zone_a, 1, True,  ["oxygen concentrator"],    ["Mandarin","English"],   False,True,  False,{},                                  False),
        ("Rodriguez Family", "835 Oak St",    "Portland","OR","97201", 45.5238,-122.6770, "Oak Street", "503-555-0102", zone_a, 5, False, [],                          ["Spanish"],              False,False, True, {"generator":True,"truck":True},      False),
        ("James Okafor",     "847 Oak St",    "Portland","OR","97201", 45.5241,-122.6771, "Oak Street", "503-555-0103", zone_a, 1, True,  ["dialysis equipment"],      ["English"],              False,True,  False,{},                                  False),
        ("The Nguyens",      "852 Oak St",    "Portland","OR","97201", 45.5244,-122.6773, "Oak Street", "503-555-0104", zone_a, 4, False, [],                          ["Vietnamese","English"], True, False, True, {"first_aid":True},                  False),
        ("Carol Winters",    "863 Oak St",    "Portland","OR","97201", 45.5247,-122.6775, "Oak Street", "503-555-0105", zone_a, 2, False, [],                          ["English"],              True, True,  True, {"spare_room":True},                 True),
        ("Ahmed Al-Rashid",  "14 Maple Ave",  "Portland","OR","97202", 45.5201,-122.6745, "Maple Ave",  "503-555-0201", zone_b, 3, False, [],                          ["Arabic","English"],     True, False, True, {"generator":True},                  False),
        ("Linda Park",       "22 Maple Ave",  "Portland","OR","97202", 45.5203,-122.6747, "Maple Ave",  "503-555-0202", zone_b, 1, True,  ["power wheelchair charger"],["Korean","English"],     False,True,  False,{},                                  False),
        ("Dave & Sue Henley","31 Maple Ave",  "Portland","OR","97202", 45.5206,-122.6749, "Maple Ave",  "503-555-0203", zone_b, 2, False, [],                          ["English"],              True, True,  True, {"truck":True,"first_aid":True},      True),
        ("Patel Household",  "45 Maple Ave",  "Portland","OR","97202", 45.5209,-122.6751, "Maple Ave",  "503-555-0204", zone_b, 6, False, [],                          ["Gujarati","English"],   True, False, True, {},                                   False),
        ("Ruth Abernathy",   "58 Maple Ave",  "Portland","OR","97202", 45.5212,-122.6753, "Maple Ave",  "503-555-0205", zone_b, 1, True,  [],                          ["English"],              False,True,  False,{},                                   False),
    ]

    captain_ids = []
    for h in seed:
        score = calculate_priority_score({
            "has_mobility_limitations": h[11],
            "medical_equipment": h[12],
            "languages": h[13],
            "has_car": h[14],
            "is_elderly": h[15],
            "residents_count": h[10],
        })
        c.execute("""
            INSERT INTO households
            (name, address, city, state, zip_code, lat, lng, neighborhood,
             contact, zone_id, residents_count, has_mobility_limitations,
             medical_equipment, languages, has_car, is_elderly, can_help, resources,
             is_captain, captain_status, priority_score, terms_accepted, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (
            h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7],
            h[8], h[9], h[10],
            int(h[11]), json.dumps(h[12]), json.dumps(h[13]),
            int(h[14]), int(h[15]), int(h[16]), json.dumps(h[17]),
            int(h[18]), "approved" if h[18] else "none",
            score, now,
        ))
        hid = c.lastrowid
        if h[18]:
            captain_ids.append(hid)

    conn.commit()

    # Auto-approve captains via applications
    for cid in captain_ids:
        c.execute("""
            INSERT INTO captain_applications
            (household_id, role, organization, years_resident, training, statement, status, created_at, reviewed_at)
            VALUES (?, 'Block Captain', 'Neighborhood Association', 5, 'CERT Basic Training',
                    'Committed to keeping our block safe.', 'approved', ?, ?)
        """, (cid, now, now))

    # Seed a couple of demo messages
    all_hids = [r["id"] for r in [dict(rr) for rr in c.execute("SELECT id FROM households").fetchall()]]
    if len(all_hids) >= 2:
        c.execute("""
            INSERT INTO messages (from_household_id, to_household_id, subject, content, created_at, is_read)
            VALUES (?, ?, 'Welcome to CrisisGrid', 'Hi neighbor! I am your block captain. Please make sure your household info is up to date. I will reach out before any drills.', ?, 0)
        """, (captain_ids[0] if captain_ids else all_hids[0], all_hids[1], now))

    conn.commit()
    conn.close()
    return {"message": "Demo data loaded", "zones": 2, "households": len(seed)}
