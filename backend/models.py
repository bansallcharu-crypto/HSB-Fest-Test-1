from typing import Dict, Optional
from pydantic import BaseModel, Field


class EventOut(BaseModel):
    id: int
    title: str
    category: str
    description: Optional[str] = ""
    event_date: str
    event_time: str
    venue: str
    capacity: int
    fee: int = 0
    icon: Optional[str] = ""
    available_seats: int


class EventDetail(EventOut):
    pass


class RegistrationIn(BaseModel):
    student_name: str
    roll_number: str
    email: str
    phone: Optional[str] = None


class RegistrationOut(BaseModel):
    id: int
    event_id: int
    student_name: str
    registered_at: str


class RegistrationDetailOut(BaseModel):
    id: int
    event_id: int
    student_name: str
    roll_number: str
    email: str
    phone: Optional[str] = None
    registered_at: str
    event_title: Optional[str] = None


class StatsOut(BaseModel):
    total_events: int
    total_registrations: int
    total_capacity: int
    overall_utilization_pct: float
    upcoming_events_count: int
    events_by_category: Dict[str, int]


class EventCreate(BaseModel):
    title: str
    category: str
    description: Optional[str] = ""
    event_date: str
    event_time: str
    venue: str
    capacity: int = Field(gt=0, description="Capacity must be greater than zero")
    fee: int = 0
    icon: Optional[str] = "🎯"
