from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ScanType(str, Enum):
    GENERAL_ENUM = 'general_enum'
    BRUTE_DOMAIN = 'brute_domain'
    BRUTE_REVERSE = 'brute_reverse'
    BRUTE_SRV = 'brute_srv'
    BRUTE_TLDS = 'brute_tlds'
    ZONE_WALK = 'zone_walk'
    WILDCARD_CHECK = 'wildcard_check'
    AXFR_TEST = 'axfr_test'
    CAA_RECORDS = 'caa_records'
    CACHE_SNOOP = 'cache_snoop'
    BIND_VERSION = 'bind_version'
    RECURSIVE_CHECK = 'recursive_check'
    NXDOMAIN_HIJACK = 'nxdomain_hijack'


class ScanStatus(str, Enum):
    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'


class ScanCreate(BaseModel):
    domain: str = Field(..., min_length=3, description='Target domain or IP')
    scan_type: ScanType
    options: dict = Field(default_factory=dict)


class ScanResponse(BaseModel):
    id: str
    user_id: str
    domain: str
    scan_type: ScanType
    status: ScanStatus
    options: dict
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None


class ScanResultResponse(BaseModel):
    id: str
    scan_id: str
    record_type: str
    name: str
    address: str
    target: str | None = None
    port: int | None = None
    raw_data: dict = Field(default_factory=dict)
    created_at: datetime


class ScanListResponse(BaseModel):
    scans: list[ScanResponse]
    total: int


class ScanDetailResponse(BaseModel):
    scan: ScanResponse
    results: list[ScanResultResponse]


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    last_used_at: datetime | None = None


class ApiKeyCreatedResponse(BaseModel):
    id: str
    name: str
    key: str
    created_at: datetime


class StatsResponse(BaseModel):
    total_scans: int
    completed_scans: int
    total_records_found: int
    domains_scanned: int


class SupabaseConfigResponse(BaseModel):
    url: str
    anon_key: str
