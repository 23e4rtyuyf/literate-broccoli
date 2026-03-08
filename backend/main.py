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
            description TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS households (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
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
            priority_score REAL DEFAULT 0,
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
    conn.commit()
    conn.close()


init_db()


def calculate_priority_score(h: dict) -> float:
    score = 0.0
    if h.get("has_mobility_limitations"):
        score += 40
    medical = json.loads(h["medical_equipment"]) if isinstance(h.get("medical_equipment"), str) else h.get("medical_equipment", [])
    score += len(medical) * 20
    if h.get("is_elderly"):
        score += 20
    if not h.get("has_car", True):
        score += 15
    if h.get("residents_count", 1) > 3:
        score += 10
    langs = json.loads(h["languages"]) if isinstance(h.get("languages"), str) else h.get("languages", ["English"])
    if langs and langs[0].lower() != "english":
        score += 5
    return min(score, 100.0)


def serialize_household(row: dict) -> dict:
    row["medical_equipment"] = json.loads(row["medical_equipment"])
    row["languages"] = json.loads(row["languages"])
    row["resources"] = json.loads(row["resources"])
    return row


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ZoneCreate(BaseModel):
    name: str
    description: Optional[str] = None


class HouseholdCreate(BaseModel):
    name: str
    address: str
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


class CrisisCreate(BaseModel):
    type: str
    description: Optional[str] = None
    declared_by: int
    affected_zones: List[int] = []


class TaskAction(BaseModel):
    household_id: int
    notes: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/zones")
def create_zone(zone: ZoneCreate):
    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT INTO zones (name, description) VALUES (?, ?)", (zone.name, zone.description))
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


@app.post("/api/households")
def register_household(h: HouseholdCreate):
    conn = get_db()
    c = conn.cursor()
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
        (name, address, contact, zone_id, residents_count, has_mobility_limitations,
         medical_equipment, languages, has_car, is_elderly, can_help, resources,
         is_captain, priority_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        h.name, h.address, h.contact, h.zone_id, h.residents_count,
        int(h.has_mobility_limitations), json.dumps(h.medical_equipment),
        json.dumps(h.languages), int(h.has_car), int(h.is_elderly),
        int(h.can_help), json.dumps(h.resources), int(h.is_captain),
        score, now,
    ))
    conn.commit()
    hid = c.lastrowid
    conn.close()
    return {"id": hid, "priority_score": score, **h.model_dump()}


@app.get("/api/households")
def list_households(zone_id: Optional[int] = None):
    conn = get_db()
    c = conn.cursor()
    if zone_id:
        c.execute("SELECT * FROM households WHERE zone_id = ? ORDER BY priority_score DESC", (zone_id,))
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

    # Generate tasks for households in affected zones
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
        desc = f"{verb} {h['address']}{detail_str} — {h['residents_count']} resident(s)"
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


@app.post("/api/seed")
def seed_demo():
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM tasks")
    c.execute("DELETE FROM crises")
    c.execute("DELETE FROM households")
    c.execute("DELETE FROM zones")
    conn.commit()

    c.execute("INSERT INTO zones (name, description) VALUES ('Zone A — Oak Street', 'North end of Oak Street and surrounds')")
    zone_a = c.lastrowid
    c.execute("INSERT INTO zones (name, description) VALUES ('Zone B — Maple Ave', 'Maple Avenue and cross streets')")
    zone_b = c.lastrowid
    conn.commit()

    now = datetime.datetime.utcnow().isoformat()
    # (name, address, contact, zone_id, residents, mobility, medical, languages, car, elderly, can_help, resources, captain)
    seed = [
        ("Margaret Chen",    "821 Oak St",   "555-0101", zone_a, 1, True,  ["oxygen concentrator"],    ["Mandarin", "English"],    False, True,  False, {},                                      False),
        ("Rodriguez Family", "835 Oak St",   "555-0102", zone_a, 5, False, [],                          ["Spanish"],               False, False, True,  {"generator": True, "truck": True},      False),
        ("James Okafor",     "847 Oak St",   "555-0103", zone_a, 1, True,  ["dialysis equipment"],      ["English"],               False, True,  False, {},                                      False),
        ("The Nguyens",      "852 Oak St",   "555-0104", zone_a, 4, False, [],                          ["Vietnamese", "English"], True,  False, True,  {"first_aid": True},                     False),
        ("Carol Winters",    "863 Oak St",   "555-0105", zone_a, 2, False, [],                          ["English"],               True,  True,  True,  {"spare_room": True},                    True),
        ("Ahmed Al-Rashid",  "14 Maple Ave", "555-0201", zone_b, 3, False, [],                          ["Arabic", "English"],     True,  False, True,  {"generator": True},                     False),
        ("Linda Park",       "22 Maple Ave", "555-0202", zone_b, 1, True,  ["power wheelchair charger"],["Korean", "English"],     False, True,  False, {},                                      False),
        ("Dave & Sue Henley","31 Maple Ave", "555-0203", zone_b, 2, False, [],                          ["English"],               True,  True,  True,  {"truck": True, "first_aid": True},      True),
        ("Patel Household",  "45 Maple Ave", "555-0204", zone_b, 6, False, [],                          ["Gujarati", "English"],   True,  False, True,  {},                                      False),
        ("Ruth Abernathy",   "58 Maple Ave", "555-0205", zone_b, 1, True,  [],                          ["English"],               False, True,  False, {},                                      False),
    ]

    for h in seed:
        score = calculate_priority_score({
            "has_mobility_limitations": h[5],
            "medical_equipment": h[6],
            "languages": h[7],
            "has_car": h[8],
            "is_elderly": h[9],
            "residents_count": h[4],
        })
        c.execute("""
            INSERT INTO households
            (name, address, contact, zone_id, residents_count, has_mobility_limitations,
             medical_equipment, languages, has_car, is_elderly, can_help, resources,
             is_captain, priority_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            h[0], h[1], h[2], h[3], h[4],
            int(h[5]), json.dumps(h[6]), json.dumps(h[7]),
            int(h[8]), int(h[9]), int(h[10]),
            json.dumps(h[11]), int(h[12]),
            score, now,
        ))

    conn.commit()
    conn.close()
    return {"message": "Demo data loaded", "zones": 2, "households": len(seed)}
