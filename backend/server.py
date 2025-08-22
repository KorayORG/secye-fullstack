from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request, Response, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union, Literal
from datetime import datetime, timezone, timedelta, time
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import uuid
import hashlib
import hmac
import base64
import json
import redis.asyncio as redis
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import io
import pandas as pd
from random import randint
import re

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Security setup
ph = PasswordHasher()
security = HTTPBearer()

# Database connections
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Redis connection (optional for development)
try:
    redis_client = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379'))
    redis_available = True
except Exception:
    redis_client = None
    redis_available = False
    print("Warning: Redis not available, using in-memory cache")

# Create the main app
app = FastAPI(title="Seç Ye API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===== TYPES & MODELS =====
CompanyType = Literal['corporate', 'catering', 'supplier']
RoleName = Literal[
    'corporateOwner', 'corporate1', 'corporate2', 'corporate3', 'corporate4',
    'cateringOwner', 'catering1', 'catering2', 'catering3', 'catering4',
    'supplierOwner', 'supplier1', 'supplier2', 'supplier3', 'supplier4'
]

UserType = Literal['individual', 'corporate']

class Company(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: CompanyType
    name: str
    slug: str
    address: Optional[Dict[str, Any]] = None
    phone: Optional[str] = None
    ratings: Optional[Dict[str, Any]] = None
    counts: Optional[Dict[str, int]] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    phone: str  # E.164 format
    email: Optional[str] = None
    password_hash: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login_at: Optional[datetime] = None

class RoleAssignment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    role: RoleName
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Shift(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str  # corporate company
    title: str
    start_time: str  # "HH:MM"
    end_time: str    # "HH:MM"
    days: List[int]  # 1..7 (Mon..Sun)
    timezone: str = "Europe/Istanbul"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierProduct(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: str
    name: str
    description: Optional[str] = None
    unit: str = "adet"  # adet, kg, litre, paket
    unit_price: float
    stock: Optional[int] = None
    image_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupplierOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: str
    catering_id: str
    items: List[Dict[str, Any]]  # [{product_id, qty, unit_price}]
    status: Literal['olusturuldu', 'hazirlaniyor', 'kargoda', 'tamamlandi', 'iptal'] = 'olusturuldu'
    timeline: Optional[List[Dict[str, Any]]] = None
    total_amount: float = 0.0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user_id: str
    from_address: str
    from_company_id: str
    to_user_ids: List[str]
    to_addresses: List[str] 
    to_company_ids: List[str]
    subject: str
    body: str
    labels: Optional[List[str]] = None
    read_by: Optional[List[str]] = None
    attachments: Optional[List[Dict[str, str]]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Offer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_company_id: str
    to_company_id: str
    unit_price: float
    message: Optional[str] = None
    status: Literal['sent', 'accepted', 'rejected', 'updated'] = 'sent'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response models
class LoginRequest(BaseModel):
    phone: str
    password: str
    company_type: CompanyType
    company_id: str

class RegisterIndividualRequest(BaseModel):
    full_name: str
    phone: str
    password: str
    company_type: CompanyType
    company_id: str

class CorporateApplicationRequest(BaseModel):
    mode: Literal['existing', 'new']
    target: Union[
        Dict[str, str],  # {'mode': 'existing', 'company_id': '...'}
        Dict[str, Any]   # {'mode': 'new', 'company_type': '...', 'new_company_payload': {...}}
    ]
    applicant: Dict[str, str]  # {'full_name': '...', 'phone': '...', 'email': '...'}
    password: str

class ApplicationResponse(BaseModel):
    success: bool
    message: str
    application_id: Optional[str] = None

class LoginResponse(BaseModel):
    success: bool
    user_id: str
    redirect_url: Optional[str] = None
    message: str

class CompanySearchResponse(BaseModel):
    companies: List[Dict[str, Any]]
    has_more: bool

# Corporate Dashboard Models
class CorporateDashboardStats(BaseModel):
    individual_users: int
    corporate_users: int
    total_preferences: int
    active_shifts: int
    recent_activities: List[Dict[str, Any]]

class CateringDashboardStats(BaseModel):
    rating: float
    served_individuals: int
    total_preferences: int
    partner_corporates: int
    recent_activities: List[Dict[str, Any]]

class SupplierDashboardStats(BaseModel):
    total_orders: int
    product_variety: int
    recent_orders: int
    partner_caterings: int
    recent_activities: List[Dict[str, Any]]

class UserProfile(BaseModel):
    id: str
    full_name: str
    phone: str
    email: Optional[str]
    company: Dict[str, Any]
    role: str
    is_active: bool

# Admin Models
class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    success: bool
    token: str
    message: str

class DashboardStats(BaseModel):
    active_companies: int
    inactive_companies: int
    total_companies: int
    pending_applications: int
    total_users: int
    recent_applications: List[Dict[str, Any]]

class ApplicationUpdateRequest(BaseModel):
    status: Literal['approved', 'rejected']
    notes: Optional[str] = None

class CompanyUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

# Employee Management Models
class EmployeeListResponse(BaseModel):
    users: List[Dict[str, Any]]
    total: int
    has_more: bool

class EmployeeUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None

class RoleUpdateRequest(BaseModel):
    role: RoleName
    is_active: bool = True

class BulkImportRequest(BaseModel):
    users: List[Dict[str, str]]  # [{"full_name": "...", "phone": "..."}]

class BulkImportResponse(BaseModel):
    success: bool
    imported_count: int
    failed_count: int
    failed_users: List[Dict[str, Any]]
    download_url: Optional[str] = None

# Shift Management Models
class ShiftCreateRequest(BaseModel):
    title: str
    start_time: str
    end_time: str
    days: List[int]
    timezone: str = "Europe/Istanbul"

class ShiftUpdateRequest(BaseModel):
    title: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    days: Optional[List[int]] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None

# Product Management Models
class ProductCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    unit: str = "adet"
    unit_price: float
    stock: Optional[int] = None

class ProductUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None

# Order Management Models
class OrderCreateRequest(BaseModel):
    supplier_id: str
    items: List[Dict[str, Any]]
    notes: Optional[str] = None

class OrderUpdateRequest(BaseModel):
    status: Optional[Literal['olusturuldu', 'hazirlaniyor', 'kargoda', 'tamamlandi', 'iptal']] = None
    notes: Optional[str] = None

# Mail Models
class MailCreateRequest(BaseModel):
    to_addresses: List[str]
    subject: str
    body: str
    labels: Optional[List[str]] = None

class MailUpdateRequest(BaseModel):
    labels: Optional[List[str]] = None
    is_read: Optional[bool] = None

# Offer Models
class OfferCreateRequest(BaseModel):
    to_company_id: str
    unit_price: float
    message: Optional[str] = None

class OfferUpdateRequest(BaseModel):
    status: Literal['accepted', 'rejected', 'updated']
    unit_price: Optional[float] = None
    message: Optional[str] = None

# ===== UTILITY FUNCTIONS =====
def create_signed_path_segment(payload: Dict[str, Any], expires_in_hours: int = 2) -> str:
    """Create HMAC signed path segment"""
    exp = int((datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)).timestamp())
    payload['exp'] = exp
    
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode().rstrip('=')
    
    secret = os.environ['HMAC_PATH_SECRET'].encode()
    signature = hmac.new(secret, payload_b64.encode(), hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip('=')
    
    return f"{payload_b64}.{signature_b64}"

def verify_signed_path_segment(signed_segment: str) -> Optional[Dict[str, Any]]:
    """Verify HMAC signed path segment"""
    try:
        payload_b64, signature_b64 = signed_segment.split('.')
        
        # Add padding if needed
        payload_b64 += '=' * (4 - len(payload_b64) % 4)
        signature_b64 += '=' * (4 - len(signature_b64) % 4)
        
        # Verify signature
        secret = os.environ['HMAC_PATH_SECRET'].encode()
        expected_signature = hmac.new(secret, signed_segment.split('.')[0].encode(), hashlib.sha256).digest()
        provided_signature = base64.urlsafe_b64decode(signature_b64)
        
        if not hmac.compare_digest(expected_signature, provided_signature):
            return None
        
        # Decode and check expiration
        payload_json = base64.urlsafe_b64decode(payload_b64).decode()
        payload = json.loads(payload_json)
        
        if payload.get('exp', 0) < int(datetime.now(timezone.utc).timestamp()):
            return None
        
        return payload
    except Exception as e:
        logger.error(f"Path segment verification failed: {e}")
        return None

def create_turkce_slug(text: str) -> str:
    """Create Turkish-safe slug"""
    replacements = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'c', 'Ğ': 'g', 'I': 'i', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
    }
    
    result = text.lower()
    for tr_char, en_char in replacements.items():
        result = result.replace(tr_char, en_char)
    
    # Remove non-alphanumeric characters
    result = ''.join(c for c in result if c.isalnum() or c in '-_')
    result = result.replace(' ', '-')
    
    return result

def create_email_address(full_name: str, company_slug: str) -> str:
    """Create email address from full name and company slug"""
    # Convert Turkish characters and create clean name
    name_slug = create_turkce_slug(full_name.replace(' ', ''))
    base_address = f"{name_slug}@{company_slug}.sy"
    
    return base_address

def generate_4_digit_password() -> str:
    """Generate unique 4-digit password"""
    return f"{randint(0, 9999):04d}"

async def get_user_roles_cached(user_id: str, company_id: str) -> List[str]:
    """Get user roles with Redis caching (fallback to direct DB query)"""
    cache_key = f"roles:{user_id}:{company_id}"
    
    # Try cache first (if Redis is available)
    if redis_available and redis_client:
        try:
            cached_roles = await redis_client.get(cache_key)
            if cached_roles:
                return json.loads(cached_roles)
        except Exception:
            pass  # Fall back to database query
    
    # Query database
    roles = await db.role_assignments.find({
        "user_id": user_id,
        "company_id": company_id,
        "is_active": True
    }).to_list(None)
    
    role_list = [role['role'] for role in roles]
    
    # Cache for 60 seconds (if Redis is available)
    if redis_available and redis_client:
        try:
            await redis_client.setex(cache_key, 60, json.dumps(role_list))
        except Exception:
            pass  # Cache operation failed, continue without caching
    
    return role_list

def create_admin_token(username: str) -> str:
    """Create admin session token"""
    payload = {
        "username": username,
        "is_admin": True,
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=8)).timestamp())
    }
    
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode().rstrip('=')
    
    secret = os.environ['JWT_SECRET'].encode()
    signature = hmac.new(secret, payload_b64.encode(), hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip('=')
    
    return f"{payload_b64}.{signature_b64}"

def verify_admin_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify admin token"""
    try:
        payload_b64, signature_b64 = token.split('.')
        
        # Add padding if needed
        payload_b64 += '=' * (4 - len(payload_b64) % 4)
        signature_b64 += '=' * (4 - len(signature_b64) % 4)
        
        # Verify signature
        secret = os.environ['JWT_SECRET'].encode()
        expected_signature = hmac.new(secret, token.split('.')[0].encode(), hashlib.sha256).digest()
        provided_signature = base64.urlsafe_b64decode(signature_b64)
        
        if not hmac.compare_digest(expected_signature, provided_signature):
            return None
        
        # Decode and check expiration
        payload_json = base64.urlsafe_b64decode(payload_b64).decode()
        payload = json.loads(payload_json)
        
        if payload.get('exp', 0) < int(datetime.now(timezone.utc).timestamp()):
            return None
        
        if not payload.get('is_admin'):
            return None
        
        return payload
    except Exception as e:
        logger.error(f"Admin token verification failed: {e}")
        return None

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Admin authentication dependency"""
    token = credentials.credentials
    admin_data = verify_admin_token(token)
    
    if not admin_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz admin token"
        )
    
    return admin_data

def check_rbac_permission(user_role: str, required_permission: str) -> bool:
    """Check if user role has required permission"""
    # Permission matrix based on role levels
    permissions = {
        'corporateOwner': ['company.read', 'company.write', 'user.invite', 'role.assign', 'shift.manage', 'audit.read', 'audit.export', 'mail.use'],
        'corporate4': ['company.read', 'company.write', 'user.invite', 'role.assign', 'shift.manage', 'mail.use'],
        'corporate3': ['company.read', 'user.invite', 'shift.manage', 'mail.use'],
        'corporate2': ['company.read', 'user.invite', 'mail.use'],
        'corporate1': ['company.read', 'mail.use'],
        'cateringOwner': ['company.read', 'company.write', 'user.invite', 'role.assign', 'menu.upload', 'offer.send', 'audit.read', 'mail.use'],
        'catering4': ['company.read', 'company.write', 'user.invite', 'menu.upload', 'offer.send', 'mail.use'],
        'catering3': ['company.read', 'menu.upload', 'offer.send', 'mail.use'],
        'catering2': ['company.read', 'mail.use'],
        'catering1': ['company.read', 'mail.use'],
        'supplierOwner': ['company.read', 'company.write', 'user.invite', 'role.assign', 'order.create', 'audit.read', 'mail.use'],
        'supplier4': ['company.read', 'company.write', 'user.invite', 'order.create', 'mail.use'],
        'supplier3': ['company.read', 'order.create', 'mail.use'],
        'supplier2': ['company.read', 'mail.use'],
        'supplier1': ['company.read', 'mail.use']
    }
    
    user_permissions = permissions.get(user_role, [])
    return required_permission in user_permissions

def get_activity_description(log: Dict[str, Any]) -> str:
    """Generate human-readable activity description from audit log"""
    activity_descriptions = {
        "CORPORATE_APPLICATION_SUBMITTED": "Yeni kurumsal hesap başvurusu yapıldı",
        "APPLICATION_APPROVED": "Başvuru onaylandı",
        "APPLICATION_REJECTED": "Başvuru reddedildi",
        "COMPANY_UPDATED": "Şirket bilgileri güncellendi",
        "USER_CREATED": "Yeni kullanıcı oluşturuldu",
        "ROLE_ASSIGNED": "Rol ataması yapıldı",
        "SHIFT_CREATED": "Yeni vardiya oluşturuldu",
        "SHIFT_UPDATED": "Vardiya güncellendi",
        "MENU_UPLOADED": "Yeni menü yüklendi",
        "PRODUCT_CREATED": "Yeni ürün eklendi",
        "ORDER_CREATED": "Yeni sipariş oluşturuldu",
        "ORDER_UPDATED": "Sipariş durumu güncellendi",
        "MAIL_SENT": "Mail gönderildi",
        "OFFER_SENT": "Teklif gönderildi",
        "OFFER_UPDATED": "Teklif güncellendi"
    }
    
    return activity_descriptions.get(log["type"], f"Sistem aktivitesi: {log['type']}")

# ===== API ENDPOINTS =====
@api_router.get("/")
async def root():
    return {"message": "Seç Ye API - Multi-tenant Yemek Seçim Platformu"}

@api_router.get("/companies/search")
async def search_companies(
    type: CompanyType,
    query: str = "",
    limit: int = 20,
    offset: int = 0
):
    """Search companies with server-side pagination"""
    filter_query = {"type": type, "is_active": True}
    
    if query:
        filter_query["name"] = {"$regex": query, "$options": "i"}
    
    companies = await db.companies.find(filter_query).skip(offset).limit(limit + 1).to_list(None)
    
    has_more = len(companies) > limit
    if has_more:
        companies = companies[:-1]
    
    company_list = []
    for company in companies:
        company_list.append({
            "id": company["id"],
            "name": company["name"],
            "slug": company["slug"],
            "type": company["type"]
        })
    
    return CompanySearchResponse(companies=company_list, has_more=has_more)

# ===== DASHBOARD APIs =====
@api_router.get("/auth/verify")
async def verify_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify authentication token and return user info"""
    try:
        # For now, we'll implement a simple token verification
        # In a real implementation, this would verify JWT tokens
        token = credentials.credentials
        
        # Decode the token (this is a placeholder implementation)
        # In reality, you'd verify JWT or session tokens
        
        return {"message": "Token verification endpoint - implementation needed"}
        
    except Exception as e:
        logger.error(f"Auth verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz token"
        )

@api_router.get("/corporate/{company_id}/dashboard")
async def get_corporate_dashboard(company_id: str):
    """Get corporate dashboard statistics"""
    try:
        # Verify company exists and is corporate type
        company = await db.companies.find_one({
            "id": company_id,
            "type": "corporate", 
            "is_active": True
        })
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Count individual users (users without corporate roles in this company)
        all_roles = await db.role_assignments.find({
            "company_id": company_id,
            "is_active": True
        }).to_list(None)
        
        corporate_user_ids = set()
        for role in all_roles:
            if role['role'].startswith('corporate') and not role['role'].endswith('1'):
                corporate_user_ids.add(role['user_id'])
        
        # Count corporate users (users with corporate management roles)
        corporate_users = len(corporate_user_ids)
        
        # Count individual users (estimate - we'll improve this with proper individual user tracking)
        total_users = await db.users.count_documents({"is_active": True})
        individual_users = max(0, total_users - corporate_users)
        
        # Count total preferences (we'll add this when we implement menu selection)
        total_preferences = 0  # Placeholder for now
        
        # Count active shifts
        active_shifts = await db.shifts.count_documents({"company_id": company_id}) if 'shifts' in await db.list_collection_names() else 0
        
        # Get recent activities from audit logs
        recent_logs = await db.audit_logs.find({
            "company_id": company_id
        }).sort("created_at", -1).limit(10).to_list(None)
        
        recent_activities = []
        for log in recent_logs:
            recent_activities.append({
                "type": log["type"],
                "description": get_activity_description(log),
                "timestamp": log["created_at"].isoformat(),
                "meta": log.get("meta", {})
            })
        
        return CorporateDashboardStats(
            individual_users=individual_users,
            corporate_users=corporate_users,
            total_preferences=total_preferences,
            active_shifts=active_shifts,
            recent_activities=recent_activities
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Corporate dashboard error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dashboard verileri alınamadı"
        )

@api_router.get("/catering/{company_id}/dashboard")
async def get_catering_dashboard(company_id: str):
    """Get catering dashboard statistics"""
    try:
        # Verify company exists and is catering type
        company = await db.companies.find_one({
            "id": company_id,
            "type": "catering",
            "is_active": True
        })
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Get rating from company data
        rating = company.get("ratings", {}).get("avg", 0.0)
        
        # Count served individuals (estimate based on partner corporates)
        partner_corporates = 0  # We'll implement this when we add catering-corporate relationships
        served_individuals = 0  # Placeholder
        
        # Count total preferences
        total_preferences = 0  # Placeholder
        
        # Get recent activities
        recent_logs = await db.audit_logs.find({
            "company_id": company_id
        }).sort("created_at", -1).limit(10).to_list(None)
        
        recent_activities = []
        for log in recent_logs:
            recent_activities.append({
                "type": log["type"],
                "description": get_activity_description(log),
                "timestamp": log["created_at"].isoformat(),
                "meta": log.get("meta", {})
            })
        
        return CateringDashboardStats(
            rating=rating,
            served_individuals=served_individuals,
            total_preferences=total_preferences,
            partner_corporates=partner_corporates,
            recent_activities=recent_activities
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Catering dashboard error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dashboard verileri alınamadı"
        )

@api_router.get("/supplier/{company_id}/dashboard")
async def get_supplier_dashboard(company_id: str):
    """Get supplier dashboard statistics"""
    try:
        # Verify company exists and is supplier type
        company = await db.companies.find_one({
            "id": company_id,
            "type": "supplier",
            "is_active": True
        })
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Count orders
        total_orders = await db.supplier_orders.count_documents({
            "supplier_id": company_id
        }) if 'supplier_orders' in await db.list_collection_names() else 0
        
        # Count products
        product_variety = await db.supplier_products.count_documents({
            "supplier_id": company_id
        }) if 'supplier_products' in await db.list_collection_names() else 0
        
        # Count recent orders (last 30 days)
        recent_date = datetime.now(timezone.utc) - timedelta(days=30)
        recent_orders = await db.supplier_orders.count_documents({
            "supplier_id": company_id,
            "created_at": {"$gte": recent_date}
        }) if 'supplier_orders' in await db.list_collection_names() else 0
        
        # Count partner caterings
        partner_caterings = 0  # Placeholder - we'll implement this when we add supplier-catering relationships
        
        # Get recent activities
        recent_logs = await db.audit_logs.find({
            "company_id": company_id
        }).sort("created_at", -1).limit(10).to_list(None)
        
        recent_activities = []
        for log in recent_logs:
            recent_activities.append({
                "type": log["type"],
                "description": get_activity_description(log),
                "timestamp": log["created_at"].isoformat(),
                "meta": log.get("meta", {})
            })
        
        return SupplierDashboardStats(
            total_orders=total_orders,
            product_variety=product_variety,
            recent_orders=recent_orders,
            partner_caterings=partner_caterings,
            recent_activities=recent_activities
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Supplier dashboard error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dashboard verileri alınamadı"
        )

@api_router.get("/user/profile")
async def get_user_profile(user_id: str, company_id: str):
    """Get user profile with company and role information"""
    try:
        # Get user
        user = await db.users.find_one({"id": user_id, "is_active": True})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Get company
        company = await db.companies.find_one({"id": company_id, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Get user role in this company
        role_assignment = await db.role_assignments.find_one({
            "user_id": user_id,
            "company_id": company_id,
            "is_active": True
        })
        
        user_role = role_assignment['role'] if role_assignment else 'individual'
        
        return UserProfile(
            id=user["id"],
            full_name=user["full_name"],
            phone=user["phone"],
            email=user.get("email"),
            company={
                "id": company["id"],
                "name": company["name"],
                "type": company["type"],
                "slug": company["slug"]
            },
            role=user_role,
            is_active=user["is_active"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kullanıcı profili alınamadı"
        )

# ===== EMPLOYEE MANAGEMENT APIs =====
@api_router.get("/corporate/{company_id}/employees")
async def get_corporate_employees(
    company_id: str,
    type: UserType = None,
    status: str = None,
    search: str = "",
    limit: int = 50,
    offset: int = 0
):
    """Get corporate employees with filtering"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Build filter query
        filter_query = {}
        
        if type == "corporate":
            # Get users with corporate roles
            corporate_roles = await db.role_assignments.find({
                "company_id": company_id,
                "role": {"$regex": "^corporate"},
                "is_active": True
            }).to_list(None)
            
            user_ids = [role["user_id"] for role in corporate_roles]
            filter_query["id"] = {"$in": user_ids}
        elif type == "individual":
            # Get users without corporate roles (individual users)
            corporate_roles = await db.role_assignments.find({
                "company_id": company_id,
                "role": {"$regex": "^corporate"}
            }).to_list(None)
            
            corporate_user_ids = [role["user_id"] for role in corporate_roles]
            filter_query["id"] = {"$nin": corporate_user_ids}
        
        if status:
            filter_query["is_active"] = status == "active"
        
        if search:
            filter_query["$or"] = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        # Get users
        users = await db.users.find(filter_query).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(users) > limit
        if has_more:
            users = users[:-1]
        
        # Get role information for each user
        result_users = []
        for user in users:
            user_role = await db.role_assignments.find_one({
                "user_id": user["id"],
                "company_id": company_id,
                "is_active": True
            })
            
            result_users.append({
                "id": user["id"],
                "full_name": user["full_name"],
                "phone": user["phone"],
                "email": user.get("email"),
                "role": user_role["role"] if user_role else "individual",
                "is_active": user["is_active"],
                "created_at": user["created_at"].isoformat(),
                "last_login_at": user.get("last_login_at").isoformat() if user.get("last_login_at") else None
            })
        
        return EmployeeListResponse(
            users=result_users,
            total=len(result_users),
            has_more=has_more
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get employees error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Çalışanlar alınamadı"
        )

@api_router.put("/corporate/{company_id}/employees/{user_id}")
async def update_employee(
    company_id: str,
    user_id: str,
    request: EmployeeUpdateRequest
):
    """Update employee details"""
    try:
        # Verify user exists
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Prepare update data
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        if request.full_name is not None:
            update_data["full_name"] = request.full_name
        
        if request.email is not None:
            update_data["email"] = request.email
        
        if request.is_active is not None:
            update_data["is_active"] = request.is_active
        
        # Update user
        await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "USER_UPDATED",
            "company_id": company_id,
            "user_id": user_id,
            "meta": {
                "changes": {k: v for k, v in update_data.items() if k != "updated_at"}
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Kullanıcı bilgileri güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update employee error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kullanıcı güncellenemedi"
        )

@api_router.post("/corporate/{company_id}/employees/{user_id}/role")
async def assign_employee_role(
    company_id: str,
    user_id: str,
    request: RoleUpdateRequest
):
    """Assign or update employee role"""
    try:
        # Verify user exists
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
        # Check if role assignment already exists
        existing_role = await db.role_assignments.find_one({
            "user_id": user_id,
            "company_id": company_id
        })
        
        if existing_role:
            # Update existing role
            await db.role_assignments.update_one(
                {"user_id": user_id, "company_id": company_id},
                {"$set": {
                    "role": request.role,
                    "is_active": request.is_active,
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
        else:
            # Create new role assignment
            role_assignment = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "company_id": company_id,
                "role": request.role,
                "is_active": request.is_active,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await db.role_assignments.insert_one(role_assignment)
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "ROLE_ASSIGNED",
            "company_id": company_id,
            "user_id": user_id,
            "meta": {
                "role": request.role,
                "is_active": request.is_active
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Rol ataması güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assign role error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Rol ataması yapılamadı"
        )

@api_router.post("/corporate/{company_id}/employees/bulk-import")
async def bulk_import_employees(
    company_id: str,
    request: BulkImportRequest
):
    """Bulk import employees from Excel data"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        imported_users = []
        failed_users = []
        passwords = []
        
        for user_data in request.users:
            try:
                # Check if phone already exists
                existing_user = await db.users.find_one({"phone": user_data["phone"]})
                if existing_user:
                    failed_users.append({
                        "full_name": user_data["full_name"],
                        "phone": user_data["phone"],
                        "error": "Telefon numarası zaten kayıtlı"
                    })
                    continue
                
                # Generate password
                password = generate_4_digit_password()
                password_hash = ph.hash(password)
                
                # Create user
                user = {
                    "id": str(uuid.uuid4()),
                    "full_name": user_data["full_name"],
                    "phone": user_data["phone"],
                    "email": create_email_address(user_data["full_name"], company["slug"]),
                    "password_hash": password_hash,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                
                await db.users.insert_one(user)
                
                imported_users.append(user)
                passwords.append({
                    "full_name": user_data["full_name"],
                    "phone": user_data["phone"], 
                    "password": password
                })
                
            except Exception as e:
                failed_users.append({
                    "full_name": user_data.get("full_name", ""),
                    "phone": user_data.get("phone", ""),
                    "error": str(e)
                })
        
        # Create Excel file with passwords
        df = pd.DataFrame(passwords)
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False, columns=["full_name", "phone", "password"])
        excel_buffer.seek(0)
        
        # In a real implementation, you'd save this to a file storage system
        # For now, we'll just return the data
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "BULK_IMPORT",
            "company_id": company_id,
            "meta": {
                "imported_count": len(imported_users),
                "failed_count": len(failed_users)
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return BulkImportResponse(
            success=True,
            imported_count=len(imported_users),
            failed_count=len(failed_users),
            failed_users=failed_users,
            download_url=None  # In real implementation, this would be a file URL
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk import error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Toplu içe aktarma başarısız"
        )

# ===== SHIFT MANAGEMENT APIs =====
@api_router.get("/corporate/{company_id}/shifts")
async def get_corporate_shifts(
    company_id: str,
    limit: int = 50,
    offset: int = 0
):
    """Get corporate shifts"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "corporate", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Get shifts
        shifts = await db.shifts.find({
            "company_id": company_id
        }).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(shifts) > limit
        if has_more:
            shifts = shifts[:-1]
        
        # Format shifts
        result_shifts = []
        for shift in shifts:
            result_shifts.append({
                "id": shift["id"],
                "title": shift["title"],
                "start_time": shift["start_time"],
                "end_time": shift["end_time"],
                "days": shift["days"],
                "timezone": shift.get("timezone", "Europe/Istanbul"),
                "is_active": shift.get("is_active", True),
                "created_at": shift["created_at"].isoformat()
            })
        
        return {
            "shifts": result_shifts,
            "total": len(result_shifts),
            "has_more": has_more
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get shifts error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vardiyalar alınamadı"
        )

@api_router.post("/corporate/{company_id}/shifts")
async def create_corporate_shift(
    company_id: str,
    request: ShiftCreateRequest
):
    """Create new corporate shift"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "corporate", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Validate time format
        try:
            datetime.strptime(request.start_time, "%H:%M")
            datetime.strptime(request.end_time, "%H:%M")
        except ValueError:
            raise HTTPException(status_code=400, detail="Geçersiz saat formatı. HH:MM formatında olmalıdır.")
        
        # Validate days
        if not all(1 <= day <= 7 for day in request.days):
            raise HTTPException(status_code=400, detail="Günler 1-7 arasında olmalıdır")
        
        # Create shift
        shift = {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "title": request.title,
            "start_time": request.start_time,
            "end_time": request.end_time,
            "days": request.days,
            "timezone": request.timezone,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.shifts.insert_one(shift)
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "SHIFT_CREATED",
            "company_id": company_id,
            "meta": {
                "shift_id": shift["id"],
                "title": request.title
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Vardiya oluşturuldu", "shift_id": shift["id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create shift error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vardiya oluşturulamadı"
        )

@api_router.put("/corporate/{company_id}/shifts/{shift_id}")
async def update_corporate_shift(
    company_id: str,
    shift_id: str,
    request: ShiftUpdateRequest
):
    """Update corporate shift"""
    try:
        # Verify shift exists
        shift = await db.shifts.find_one({"id": shift_id, "company_id": company_id})
        if not shift:
            raise HTTPException(status_code=404, detail="Vardiya bulunamadı")
        
        # Prepare update data
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        if request.title is not None:
            update_data["title"] = request.title
        
        if request.start_time is not None:
            try:
                datetime.strptime(request.start_time, "%H:%M")
                update_data["start_time"] = request.start_time
            except ValueError:
                raise HTTPException(status_code=400, detail="Geçersiz başlangıç saati formatı")
        
        if request.end_time is not None:
            try:
                datetime.strptime(request.end_time, "%H:%M")  
                update_data["end_time"] = request.end_time
            except ValueError:
                raise HTTPException(status_code=400, detail="Geçersiz bitiş saati formatı")
        
        if request.days is not None:
            if not all(1 <= day <= 7 for day in request.days):
                raise HTTPException(status_code=400, detail="Günler 1-7 arasında olmalıdır")
            update_data["days"] = request.days
        
        if request.timezone is not None:
            update_data["timezone"] = request.timezone
        
        if request.is_active is not None:
            update_data["is_active"] = request.is_active
        
        # Update shift
        await db.shifts.update_one(
            {"id": shift_id},
            {"$set": update_data}
        )
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "SHIFT_UPDATED",
            "company_id": company_id,
            "meta": {
                "shift_id": shift_id,
                "changes": {k: v for k, v in update_data.items() if k != "updated_at"}
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Vardiya güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update shift error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vardiya güncellenemedi"
        )

@api_router.delete("/corporate/{company_id}/shifts/{shift_id}")
async def delete_corporate_shift(company_id: str, shift_id: str):
    """Delete corporate shift"""
    try:
        # Verify shift exists
        shift = await db.shifts.find_one({"id": shift_id, "company_id": company_id})
        if not shift:
            raise HTTPException(status_code=404, detail="Vardiya bulunamadı")
        
        # Soft delete - mark as inactive
        await db.shifts.update_one(
            {"id": shift_id},
            {"$set": {
                "is_active": False,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "SHIFT_DELETED",
            "company_id": company_id,
            "meta": {
                "shift_id": shift_id,
                "title": shift["title"]
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Vardiya silindi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete shift error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Vardiya silinemedi"
        )

# ===== SYSTEM SETTINGS APIs =====
@api_router.get("/corporate/{company_id}/settings")
async def get_corporate_settings(company_id: str):
    """Get corporate system settings"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "corporate", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        return {
            "company": {
                "id": company["id"],
                "name": company["name"],
                "slug": company["slug"],
                "phone": company.get("phone"),
                "address": company.get("address"),
                "is_active": company["is_active"],
                "created_at": company["created_at"].isoformat(),
                "updated_at": company["updated_at"].isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ayarlar alınamadı"
        )

@api_router.get("/corporate/{company_id}/audit-logs")
async def get_corporate_audit_logs(
    company_id: str,
    log_type: str = None,
    start_date: str = None,
    end_date: str = None,
    limit: int = 100,
    offset: int = 0
):
    """Get corporate audit logs with filtering"""
    try:
        # Build filter query
        filter_query = {"company_id": company_id}
        
        if log_type:
            filter_query["type"] = log_type
        
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if end_date:
                date_filter["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            filter_query["created_at"] = date_filter
        
        # Get audit logs
        logs = await db.audit_logs.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(logs) > limit
        if has_more:
            logs = logs[:-1]
        
        # Format logs
        result_logs = []
        for log in logs:
            result_logs.append({
                "id": log["id"],
                "type": log["type"],
                "description": get_activity_description(log),
                "user_id": log.get("user_id"),
                "actor_id": log.get("actor_id"),
                "meta": log.get("meta", {}),
                "created_at": log["created_at"].isoformat()
            })
        
        return {
            "logs": result_logs,
            "total": len(result_logs),
            "has_more": has_more
        }
        
    except Exception as e:
        logger.error(f"Get audit logs error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Audit logları alınamadı"
        )

# Continue with existing endpoints...
@api_router.post("/auth/register/corporate/application", response_model=ApplicationResponse)
async def register_corporate_application(request: CorporateApplicationRequest):
    """Submit corporate account application"""
    try:
        # Check if phone already exists
        existing_user = await db.users.find_one({"phone": request.applicant["phone"]})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu telefon numarası zaten kayıtlı"
            )
        
        # Hash password
        password_hash = ph.hash(request.password)
        
        # Create application document
        application = {
            "id": str(uuid.uuid4()),
            "target": request.target,
            "applicant": {
                **request.applicant,
                "password_hash": password_hash
            },
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # If it's an existing company application, verify company exists
        if request.mode == 'existing':
            company = await db.companies.find_one({
                "id": request.target["company_id"],
                "is_active": True
            })
            if not company:
                raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Save application
        await db.corporate_applications.insert_one(application)
        
        # Log the application for audit
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "CORPORATE_APPLICATION_SUBMITTED",
            "meta": {
                "application_id": application["id"],
                "mode": request.mode,
                "applicant_phone": request.applicant["phone"]
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return ApplicationResponse(
            success=True,
            message="Başvurunuz başarıyla alındı. İnceleme sonrası size bilgi verilecektir.",
            application_id=application["id"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Corporate application error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Başvuru işlemi sırasında hata oluştu"
        )

@api_router.post("/auth/register/individual")
async def register_individual(request: RegisterIndividualRequest):
    """Register individual user"""
    try:
        # Check if phone already exists
        existing_user = await db.users.find_one({"phone": request.phone})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu telefon numarası zaten kayıtlı"
            )
        
        # Check if company exists
        company = await db.companies.find_one({
            "id": request.company_id,
            "type": request.company_type,
            "is_active": True
        })
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Hash password
        password_hash = ph.hash(request.password)
        
        # Create user
        user = User(
            full_name=request.full_name,
            phone=request.phone,
            password_hash=password_hash
        )
        
        await db.users.insert_one(user.dict())
        
        return {"success": True, "message": "Kayıt başarılı"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Individual registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kayıt işlemi sırasında hata oluştu"
        )

@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    """Unified login endpoint"""
    try:
        # Find user by phone
        user = await db.users.find_one({"phone": request.phone, "is_active": True})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Telefon numarası veya şifre hatalı"
            )
        
        # Verify password
        try:
            ph.verify(user['password_hash'], request.password)
        except VerifyMismatchError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Telefon numarası veya şifre hatalı"
            )
        
        # Check if user has role in requested company
        roles = await get_user_roles_cached(user['id'], request.company_id)
        if not roles:
            # Check if this is individual access to corporate
            if request.company_type == 'corporate':
                # Individual users can access corporate companies they belong to
                company = await db.companies.find_one({
                    "id": request.company_id,
                    "type": "corporate",
                    "is_active": True
                })
                if not company:
                    raise HTTPException(status_code=404, detail="Şirket bulunamadı")
                
                # For now, allow individual access (we'll implement proper individual checking later)
                redirect_url = "/app/home"
                return LoginResponse(
                    success=True,
                    user_id=user['id'],
                    redirect_url=redirect_url,
                    message="Giriş başarılı - Bireysel panel"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bu şirkette yetkiniz bulunmamaktadır"
                )
        
        # Corporate panel access - create signed URL
        highest_role = get_highest_role(roles)
        if highest_role:
            # Create signed path segments
            enc_user_id = create_signed_path_segment({"user_id": user['id']})
            enc_company_type = create_signed_path_segment({"company_type": request.company_type})
            enc_company_id = create_signed_path_segment({"company_id": request.company_id})
            
            redirect_url = f"/{enc_user_id}/{enc_company_type}/{enc_company_id}/general"
            
            return LoginResponse(
                success=True,
                user_id=user['id'],
                redirect_url=redirect_url,
                message="Giriş başarılı - Kurumsal panel"
            )
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yetkisiz erişim"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Giriş işlemi sırasında hata oluştu"
        )

def get_highest_role(roles: List[str]) -> Optional[str]:
    """Get highest priority role from list"""
    role_priority = {
        'corporateOwner': 10, 'corporate4': 9, 'corporate3': 8, 'corporate2': 7, 'corporate1': 6,
        'cateringOwner': 10, 'catering4': 9, 'catering3': 8, 'catering2': 7, 'catering1': 6,
        'supplierOwner': 10, 'supplier4': 9, 'supplier3': 8, 'supplier2': 7, 'supplier1': 6
    }
    
    if not roles:
        return None
    
    return max(roles, key=lambda role: role_priority.get(role, 0))

# ===== ADMIN ENDPOINTS =====
@api_router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLoginRequest):
    """Admin login endpoint"""
    try:
        master_username = os.environ.get('MASTER_ADMIN_USERNAME')
        master_password = os.environ.get('MASTER_ADMIN_PASSWORD')
        
        if request.username != master_username or request.password != master_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Geçersiz admin kullanıcı adı veya şifre"
            )
        
        # Create admin token
        token = create_admin_token(request.username)
        
        return AdminLoginResponse(
            success=True,
            token=token,
            message="Master admin girişi başarılı"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Giriş işlemi sırasında hata oluştu"
        )

@api_router.get("/admin/dashboard", response_model=DashboardStats)
async def get_admin_dashboard(admin_user = Depends(get_admin_user)):
    """Get admin dashboard statistics"""
    try:
        # Count companies
        active_companies = await db.companies.count_documents({"is_active": True})
        inactive_companies = await db.companies.count_documents({"is_active": False})
        total_companies = active_companies + inactive_companies
        
        # Count pending applications
        pending_applications = await db.corporate_applications.count_documents({"status": "pending"})
        
        # Count total users
        total_users = await db.users.count_documents({})
        
        # Get recent applications
        recent_apps = await db.corporate_applications.find().sort("created_at", -1).limit(10).to_list(None)
        recent_applications = []
        
        for app in recent_apps:
            # Get company name if it's an existing company application
            company_name = "Yeni Şirket"
            if app.get('target', {}).get('mode') == 'existing':
                company_id = app.get('target', {}).get('company_id')
                if company_id:
                    company = await db.companies.find_one({"id": company_id})
                    if company:
                        company_name = company['name']
            elif app.get('target', {}).get('new_company_payload'):
                company_name = app['target']['new_company_payload'].get('name', 'Yeni Şirket')
            
            recent_applications.append({
                "id": app["id"],
                "applicant_name": app["applicant"]["full_name"],
                "company_name": company_name,
                "status": app["status"],
                "created_at": app["created_at"].isoformat(),
                "mode": app.get('target', {}).get('mode', 'unknown')
            })
        
        return DashboardStats(
            active_companies=active_companies,
            inactive_companies=inactive_companies,
            total_companies=total_companies,
            pending_applications=pending_applications,
            total_users=total_users,
            recent_applications=recent_applications
        )
        
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dashboard verileri alınamadı"
        )

@api_router.get("/admin/applications")
async def get_admin_applications(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin_user = Depends(get_admin_user)
):
    """Get corporate applications for admin"""
    try:
        filter_query = {}
        if status:
            filter_query["status"] = status
        
        applications = await db.corporate_applications.find(filter_query).sort("created_at", -1).skip(offset).limit(limit).to_list(None)
        
        result = []
        for app in applications:
            # Get company info
            company_info = {"name": "Yeni Şirket", "type": "unknown"}
            
            if app.get('target', {}).get('mode') == 'existing':
                company_id = app.get('target', {}).get('company_id')
                if company_id:
                    company = await db.companies.find_one({"id": company_id})
                    if company:
                        company_info = {
                            "name": company['name'],
                            "type": company['type'],
                            "slug": company['slug']
                        }
            elif app.get('target', {}).get('new_company_payload'):
                payload = app['target']['new_company_payload']
                company_info = {
                    "name": payload.get('name', 'Yeni Şirket'),
                    "type": app.get('target', {}).get('company_type', 'unknown'),
                    "address": payload.get('address'),
                    "phone": payload.get('contact_phone')
                }
            
            result.append({
                "id": app["id"],
                "mode": app.get('target', {}).get('mode'),
                "company_info": company_info,
                "applicant": app["applicant"],
                "status": app["status"],
                "created_at": app["created_at"].isoformat(),
                "updated_at": app["updated_at"].isoformat()
            })
        
        return {"applications": result, "total": len(result)}
        
    except Exception as e:
        logger.error(f"Get applications error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Başvurular alınamadı"
        )

@api_router.post("/admin/applications/{application_id}/update")
async def update_application_status(
    application_id: str,
    request: ApplicationUpdateRequest,
    admin_user = Depends(get_admin_user)
):
    """Approve or reject corporate application"""
    try:
        # Find application
        application = await db.corporate_applications.find_one({"id": application_id})
        if not application:
            raise HTTPException(status_code=404, detail="Başvuru bulunamadı")
        
        if application["status"] != "pending":
            raise HTTPException(status_code=400, detail="Bu başvuru zaten işlenmiş")
        
        # Update application status
        update_data = {
            "status": request.status,
            "updated_at": datetime.now(timezone.utc),
            "reviewer_id": admin_user["username"],
            "notes": request.notes
        }
        
        await db.corporate_applications.update_one(
            {"id": application_id},
            {"$set": update_data}
        )
        
        # If approved, create user and assign role
        if request.status == "approved":
            # Create user
            user_data = {
                "id": str(uuid.uuid4()),
                "full_name": application["applicant"]["full_name"],
                "phone": application["applicant"]["phone"],
                "email": application["applicant"].get("email"),
                "password_hash": application["applicant"]["password_hash"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            await db.users.insert_one(user_data)
            
            # Determine company and role
            company_id = None
            role = None
            
            if application["target"]["mode"] == "existing":
                company_id = application["target"]["company_id"]
                # Get company to determine role type
                company = await db.companies.find_one({"id": company_id})
                if company:
                    role = f"{company['type']}1"  # Assign level 1 role
            
            elif application["target"]["mode"] == "new":
                # Create new company
                company_payload = application["target"]["new_company_payload"]
                company_data = {
                    "id": str(uuid.uuid4()),
                    "type": application["target"]["company_type"],
                    "name": company_payload["name"],
                    "slug": create_turkce_slug(company_payload["name"]),
                    "address": {"text": company_payload.get("address")},
                    "phone": company_payload.get("contact_phone"),
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                    "counts": {"individual": 0, "corporate": 1}
                }
                
                await db.companies.insert_one(company_data)
                company_id = company_data["id"]
                role = f"{company_data['type']}Owner"  # Make them owner of new company
            
            # Assign role
            if company_id and role:
                role_data = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_data["id"],
                    "company_id": company_id,
                    "role": role,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                
                await db.role_assignments.insert_one(role_data)
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": f"APPLICATION_{request.status.upper()}",
            "admin_user": admin_user["username"],
            "meta": {
                "application_id": application_id,
                "applicant_phone": application["applicant"]["phone"],
                "notes": request.notes
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {
            "success": True,
            "message": f"Başvuru {request.status} olarak işaretlendi"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update application error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Başvuru güncellenemedi"
        )

# ... Continue with remaining admin endpoints (companies, etc.)
@api_router.get("/admin/companies")
async def get_admin_companies(
    type: Optional[CompanyType] = None,
    active: Optional[bool] = None,
    search: str = "",
    limit: int = 50,
    offset: int = 0,
    admin_user = Depends(get_admin_user)
):
    """Get companies for admin management"""
    try:
        filter_query = {}
        
        if type:
            filter_query["type"] = type
        
        if active is not None:
            filter_query["is_active"] = active
        
        if search:
            filter_query["name"] = {"$regex": search, "$options": "i"}
        
        companies = await db.companies.find(filter_query).sort("created_at", -1).skip(offset).limit(limit).to_list(None)
        
        # Get user counts for each company
        result = []
        for company in companies:
            user_count = await db.role_assignments.count_documents({
                "company_id": company["id"],
                "is_active": True
            })
            
            company_data = {
                "id": company["id"],
                "name": company["name"],
                "slug": company["slug"],
                "type": company["type"],
                "phone": company.get("phone"),
                "address": company.get("address"),
                "is_active": company["is_active"],
                "created_at": company["created_at"].isoformat(),
                "user_count": user_count,
                "ratings": company.get("ratings")
            }
            
            result.append(company_data)
        
        total = await db.companies.count_documents(filter_query)
        
        return {
            "companies": result,
            "total": total,
            "has_more": len(result) == limit
        }
        
    except Exception as e:
        logger.error(f"Get companies error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Şirketler alınamadı"
        )

@api_router.put("/admin/companies/{company_id}")
async def update_company(
    company_id: str,
    request: CompanyUpdateRequest,
    admin_user = Depends(get_admin_user)
):
    """Update company details"""
    try:
        # Find company
        company = await db.companies.find_one({"id": company_id})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Prepare update data
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        if request.name is not None:
            update_data["name"] = request.name
            update_data["slug"] = create_turkce_slug(request.name)
        
        if request.phone is not None:
            update_data["phone"] = request.phone
        
        if request.address is not None:
            update_data["address"] = request.address
        
        if request.is_active is not None:
            update_data["is_active"] = request.is_active
        
        # Update company
        await db.companies.update_one(
            {"id": company_id},
            {"$set": update_data}
        )
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "COMPANY_UPDATED",
            "admin_user": admin_user["username"],
            "company_id": company_id,
            "meta": {
                "changes": {k: v for k, v in update_data.items() if k != "updated_at"}
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {
            "success": True,
            "message": "Şirket bilgileri güncellendi"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update company error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Şirket güncellenemedi"
        )

@api_router.get("/admin/companies/{company_id}/details")
async def get_company_details(
    company_id: str,
    admin_user = Depends(get_admin_user)
):
    """Get detailed company information"""
    try:
        # Get company
        company = await db.companies.find_one({"id": company_id})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Get users and roles
        roles = await db.role_assignments.find({"company_id": company_id}).to_list(None)
        users_data = []
        
        for role in roles:
            user = await db.users.find_one({"id": role["user_id"]})
            if user:
                users_data.append({
                    "id": user["id"],
                    "full_name": user["full_name"],
                    "phone": user["phone"],
                    "email": user.get("email"),
                    "role": role["role"],
                    "is_active": role["is_active"],
                    "last_login_at": user.get("last_login_at")
                })
        
        # Get recent audit logs for this company
        recent_logs = await db.audit_logs.find(
            {"company_id": company_id}
        ).sort("created_at", -1).limit(20).to_list(None)
        
        return {
            "company": {
                "id": company["id"],
                "name": company["name"],
                "slug": company["slug"],
                "type": company["type"],
                "phone": company.get("phone"),
                "address": company.get("address"),
                "is_active": company["is_active"],
                "created_at": company["created_at"].isoformat(),
                "updated_at": company["updated_at"].isoformat(),
                "ratings": company.get("ratings"),
                "counts": company.get("counts")
            },
            "users": users_data,
            "recent_logs": [
                {
                    "type": log["type"],
                    "meta": log.get("meta", {}),
                    "created_at": log["created_at"].isoformat()
                }
                for log in recent_logs
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get company details error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Şirket detayları alınamadı"
        )

# Include router
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    if redis_available and redis_client:
        await redis_client.close()