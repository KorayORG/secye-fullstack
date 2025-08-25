
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request, Response, UploadFile, File, Query
from bson import ObjectId
from fastapi.responses import StreamingResponse
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



# ===== ORDERS LIST API (CATERING & SUPPLIER) =====
@api_router.get("/orders")
async def get_orders(
    catering_id: Optional[str] = Query(None),
    supplier_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0)
):
    """
    Belirli bir catering veya tedarikçi şirketinin siparişlerini listeler.
    catering_id veya supplier_id parametrelerinden en az biri gereklidir.
    """
    try:
        if not catering_id and not supplier_id:
            raise HTTPException(status_code=400, detail="catering_id veya supplier_id gereklidir")

        filter_query = {}
        if catering_id:
            # Catering şirketi kontrolü
            catering = await db.companies.find_one({"id": catering_id, "type": "catering", "is_active": True})
            if not catering:
                raise HTTPException(status_code=404, detail="Catering firması bulunamadı")
            filter_query["catering_id"] = catering_id
        if supplier_id:
            # Tedarikçi şirketi kontrolü
            supplier = await db.companies.find_one({"id": supplier_id, "type": "supplier", "is_active": True})
            if not supplier:
                raise HTTPException(status_code=404, detail="Tedarikçi firması bulunamadı")
            filter_query["supplier_id"] = supplier_id
        if status and status != "all":
            filter_query["status"] = status

        orders = await db.orders.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        has_more = len(orders) > limit
        if has_more:
            orders = orders[:-1]

        # Şirket isimlerini ekle
        supplier_ids = list({order["supplier_id"] for order in orders})
        catering_ids = list({order["catering_id"] for order in orders})
        suppliers = {s["id"]: s for s in await db.companies.find({"id": {"$in": supplier_ids}}).to_list(None)}
        caterings = {c["id"]: c for c in await db.companies.find({"id": {"$in": catering_ids}}).to_list(None)}

        def serialize(obj):
            if isinstance(obj, ObjectId):
                return str(obj)
            if isinstance(obj, datetime):
                return obj.isoformat()
            return obj

        result_orders = []
        for order in orders:
            supplier = suppliers.get(order["supplier_id"])
            catering = caterings.get(order["catering_id"])
            order_serialized = {k: serialize(v) for k, v in order.items()}
            order_serialized["supplier_company_name"] = supplier["name"] if supplier else order["supplier_id"]
            order_serialized["buyer_company_name"] = catering["name"] if catering else order["catering_id"]
            order_serialized["created_at"] = serialize(order.get("created_at"))
            # items alanı yoksa boş dizi olarak ekle
            if "items" not in order_serialized:
                order_serialized["items"] = []
            result_orders.append(order_serialized)

        return {"orders": result_orders, "total": len(result_orders), "has_more": has_more}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get orders error: {e}")
        raise HTTPException(status_code=500, detail="Siparişler alınamadı")

# ===== ORDER UPDATE API =====
@api_router.patch("/orders/{order_id}")
async def update_order_status(order_id: str, request: dict):
    """
    Sipariş durumunu günceller
    """
    try:
        # Siparişi bul
        order = await db.orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
        
        # Güncelleme verilerini hazırla
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        if "status" in request:
            update_data["status"] = request["status"]
        
        if "notes" in request:
            update_data["notes"] = request["notes"]
        
        # Siparişi güncelle
        await db.orders.update_one(
            {"id": order_id},
            {"$set": update_data}
        )
        
        return {"success": True, "message": "Sipariş durumu güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update order error: {e}")
        raise HTTPException(status_code=500, detail="Sipariş güncellenemedi")

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
    # Contract duration fields
    duration_months: Optional[int] = 12  # Default 12 months
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Contract(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    partnership_id: str
    corporate_id: str
    catering_id: str
    unit_price: float
    start_date: datetime
    end_date: datetime
    duration_months: int
    status: Literal['active', 'expired', 'terminated', 'pending_termination'] = 'active'
    original_offer_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TerminationRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_id: str
    partnership_id: str
    requesting_company_id: str  # Who initiated the termination
    target_company_id: str      # Who needs to approve
    reason: str                 # Required reason
    message: str               # Required message
    status: Literal['pending', 'approved', 'rejected'] = 'pending'
    requested_termination_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None

# Supplier Product Models
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: str
    name: str
    description: str
    unit_type: Literal['kg', 'litre', 'adet', 'gram', 'ton', 'paket', 'kutu'] = 'adet'
    unit_price: float
    stock_quantity: int
    minimum_order_quantity: int = 1
    is_active: bool = True
    category: Optional[str] = None
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: str
    catering_id: str
    status: Literal['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'] = 'pending'
    total_amount: float
    delivery_address: Optional[str] = None
    delivery_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    confirmed_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

class OrderItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    product_id: str
    quantity: int
    unit_price: float
    total_price: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    """Get corporate employees with filtering - ONLY users associated with this company"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # CRITICAL FIX: First get ALL users who have ANY relationship with this company
        all_company_roles = await db.role_assignments.find({
            "company_id": company_id
        }).to_list(None)
        
        company_user_ids = list(set([role["user_id"] for role in all_company_roles]))
        
        if not company_user_ids:
            return EmployeeListResponse(users=[], total=0, has_more=False)
        
        # Build filter query - MUST restrict to company users only
        filter_query = {"id": {"$in": company_user_ids}}
        
        if type == "corporate":
            # Get users with corporate roles in THIS company
            corporate_roles = await db.role_assignments.find({
                "company_id": company_id,
                "role": {"$regex": "^corporate"},
                "is_active": True
            }).to_list(None)
            
            corporate_user_ids = [role["user_id"] for role in corporate_roles]
            filter_query["id"] = {"$in": corporate_user_ids}
        elif type == "individual":
            # Get users without corporate roles in THIS company
            corporate_roles = await db.role_assignments.find({
                "company_id": company_id,
                "role": {"$regex": "^corporate"}
            }).to_list(None)
            
            corporate_user_ids = [role["user_id"] for role in corporate_roles]
            # Still restrict to company users, but exclude those with corporate roles
            individual_user_ids = [uid for uid in company_user_ids if uid not in corporate_user_ids]
            filter_query["id"] = {"$in": individual_user_ids}
        
        if status:
            filter_query["is_active"] = status == "active"
        
        if search:
            search_conditions = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
            # Combine search with company restriction
            filter_query = {"$and": [{"id": {"$in": filter_query["id"]["$in"]}}, {"$or": search_conditions}]}
            if status:
                filter_query["$and"].append({"is_active": status == "active"})
        
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
        
        # Create Excel file with passwords (if any users were imported)
        if passwords:
            df = pd.DataFrame(passwords)
            excel_buffer = io.BytesIO()
            df.to_excel(excel_buffer, index=False, engine='openpyxl')
            excel_buffer.seek(0)
        else:
            excel_buffer = None
        
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

@api_router.get("/corporate/{company_id}/employees/excel-template")
async def get_corporate_excel_template(company_id: str):
    """Get Excel template for bulk employee import"""
    try:
        # Create a sample Excel file
        df = pd.DataFrame({
            "full_name": ["Ahmet Yılmaz", "Ayşe Demir"],
            "phone": ["+905551234567", "+905559876543"]
        })
        
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False, engine='openpyxl')
        excel_buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(excel_buffer.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=calisan_sablonu.xlsx"}
        )
        
    except Exception as e:
        logger.error(f"Excel template error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Excel şablonu oluşturulamadı"
        )

@api_router.post("/catering/{company_id}/employees/bulk-import")
async def bulk_import_catering_employees(
    company_id: str,
    request: BulkImportRequest
):
    """Bulk import catering employees from Excel data"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "catering", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Catering şirketi bulunamadı")
        
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
            download_url=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Catering bulk import error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Catering toplu içe aktarma başarısız"
        )

@api_router.get("/catering/{company_id}/employees/excel-template")
async def get_catering_excel_template(company_id: str):
    """Get Excel template for bulk catering employee import"""
    try:
        df = pd.DataFrame({
            "full_name": ["Mehmet Chef", "Zeynep Aşçıbaşı"],
            "phone": ["+905551234567", "+905559876543"]
        })
        
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False, engine='openpyxl')
        excel_buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(excel_buffer.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=catering_calisan_sablonu.xlsx"}
        )
        
    except Exception as e:
        logger.error(f"Catering Excel template error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Catering Excel şablonu oluşturulamadı"
        )

@api_router.post("/supplier/{company_id}/employees/bulk-import")
async def bulk_import_supplier_employees(
    company_id: str,
    request: BulkImportRequest
):
    """Bulk import supplier employees from Excel data"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "supplier", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Tedarikçi şirketi bulunamadı")
        
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
            download_url=None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Supplier bulk import error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tedarikçi toplu içe aktarma başarısız"
        )

@api_router.get("/supplier/{company_id}/employees/excel-template")
async def get_supplier_excel_template(company_id: str):
    """Get Excel template for bulk supplier employee import"""
    try:
        df = pd.DataFrame({
            "full_name": ["Ali Tedarikçi", "Fatma Depo"],
            "phone": ["+905551234567", "+905559876543"]
        })
        
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False, engine='openpyxl')
        excel_buffer.seek(0)
        
        return StreamingResponse(
            io.BytesIO(excel_buffer.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=supplier_calisan_sablonu.xlsx"}
        )
        
    except Exception as e:
        logger.error(f"Supplier Excel template error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tedarikçi Excel şablonu oluşturulamadı"
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

@api_router.put("/corporate/{company_id}/settings")
async def update_corporate_settings(company_id: str, request: CompanyUpdateRequest):
    """Update corporate system settings"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "corporate", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Prepare update data
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        if request.name:
            update_data["name"] = request.name
        
        if request.phone:
            update_data["phone"] = request.phone
            
        if request.address:
            update_data["address"] = request.address
        
        # Update company
        await db.companies.update_one(
            {"id": company_id},
            {"$set": update_data}
        )
        
        # Create audit log
        await db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "type": "COMPANY_UPDATED",
            "description": f"Şirket bilgileri güncellendi: {company['name']}",
            "meta": {"updated_fields": list(update_data.keys())},
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"success": True, "message": "Şirket ayarları güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ayarlar güncellenemedi"
        )

@api_router.get("/catering/{company_id}/settings")
async def get_catering_settings(company_id: str):
    """Get catering system settings"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "catering", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Catering şirketi bulunamadı")
        
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
        logger.error(f"Get catering settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Catering ayarları alınamadı"
        )

@api_router.put("/catering/{company_id}/settings")
async def update_catering_settings(company_id: str, request: CompanyUpdateRequest):
    """Update catering system settings"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "catering", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Catering şirketi bulunamadı")
        
        # Prepare update data
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        if request.name:
            update_data["name"] = request.name
        
        if request.phone:
            update_data["phone"] = request.phone
            
        if request.address:
            update_data["address"] = request.address
        
        # Update company
        await db.companies.update_one(
            {"id": company_id},
            {"$set": update_data}
        )
        
        # Create audit log
        await db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "type": "COMPANY_UPDATED",
            "description": f"Catering şirket bilgileri güncellendi: {company['name']}",
            "meta": {"updated_fields": list(update_data.keys())},
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"success": True, "message": "Catering ayarları güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update catering settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Catering ayarları güncellenemedi"
        )

@api_router.get("/supplier/{company_id}/settings")
async def get_supplier_settings(company_id: str):
    """Get supplier system settings"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "supplier", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Tedarikçi şirketi bulunamadı")
        
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
        logger.error(f"Get supplier settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tedarikçi ayarları alınamadı"
        )

@api_router.put("/supplier/{company_id}/settings")
async def update_supplier_settings(company_id: str, request: CompanyUpdateRequest):
    """Update supplier system settings"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "supplier", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Tedarikçi şirketi bulunamadı")
        
        # Prepare update data
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        if request.name:
            update_data["name"] = request.name
        
        if request.phone:
            update_data["phone"] = request.phone
            
        if request.address:
            update_data["address"] = request.address
        
        # Update company
        await db.companies.update_one(
            {"id": company_id},
            {"$set": update_data}
        )
        
        # Create audit log
        await db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "type": "COMPANY_UPDATED",
            "description": f"Tedarikçi şirket bilgileri güncellendi: {company['name']}",
            "meta": {"updated_fields": list(update_data.keys())},
            "created_at": datetime.now(timezone.utc)
        })
        
        return {"success": True, "message": "Tedarikçi ayarları güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update supplier settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tedarikçi ayarları güncellenemedi"
        )

@api_router.get("/catering/{company_id}/audit-logs")
async def get_catering_audit_logs(
    company_id: str,
    log_type: str = None,
    start_date: str = None,
    end_date: str = None,
    limit: int = 100,
    offset: int = 0
):
    """Get catering audit logs with filtering"""
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
                "meta": log.get("meta", {}),
                "actor_id": log.get("actor_id"),
                "created_at": log["created_at"].isoformat()
            })
        
        return {
            "logs": result_logs,
            "total": len(result_logs),
            "has_more": has_more
        }
        
    except Exception as e:
        logger.error(f"Get catering audit logs error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Catering audit logları alınamadı"
        )

@api_router.get("/supplier/{company_id}/audit-logs")
async def get_supplier_audit_logs(
    company_id: str,
    log_type: str = None,
    start_date: str = None,
    end_date: str = None,
    limit: int = 100,
    offset: int = 0
):
    """Get supplier audit logs with filtering"""
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
                "meta": log.get("meta", {}),
                "actor_id": log.get("actor_id"),
                "created_at": log["created_at"].isoformat()
            })
        
        return {
            "logs": result_logs,
            "total": len(result_logs),
            "has_more": has_more
        }
        
    except Exception as e:
        logger.error(f"Get supplier audit logs error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tedarikçi audit logları alınamadı"
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

# ===== MAIL/MESSAGING APIs =====
@api_router.get("/corporate/{company_id}/messages")
async def get_corporate_messages(
    company_id: str,
    user_id: str,
    type: str = "inbox",
    limit: int = 50,
    offset: int = 0
):
    """Get corporate messages for user"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Build filter query based on message type
        filter_query = {}
        
        if type == "inbox":
            # Messages sent TO this user
            filter_query["to_user_ids"] = user_id
        elif type == "sent":
            # Messages sent FROM this user  
            filter_query["from_user_id"] = user_id
        elif type == "archived":
            # Messages with archive label
            filter_query["$or"] = [
                {"to_user_ids": user_id, "labels": "archived"},
                {"from_user_id": user_id, "labels": "archived"}
            ]
        
        # Get messages
        messages = await db.messages.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(messages) > limit
        if has_more:
            messages = messages[:-1]
        
        # Format messages
        result_messages = []
        for msg in messages:
            result_messages.append({
                "id": msg["id"],
                "from_user_id": msg["from_user_id"],
                "from_address": msg["from_address"],
                "to_addresses": msg["to_addresses"],
                "subject": msg["subject"],
                "body": msg["body"],
                "labels": msg.get("labels", []),
                "read_by": msg.get("read_by", []),
                "attachments": msg.get("attachments", []),
                "created_at": msg["created_at"].isoformat()
            })
        
        return {
            "messages": result_messages,
            "total": len(result_messages),
            "has_more": has_more
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get messages error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Mesajlar alınamadı"
        )

@api_router.post("/corporate/{company_id}/messages")
async def send_corporate_message(
    company_id: str,
    request: MailCreateRequest
):
    """Send a message within corporate network"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Extract user IDs from addresses (simplified - in real impl would be more robust)
        to_user_ids = []
        for addr in request.to_addresses:
            # For now, assume format is "Name <user_id@company.sy>" or direct user_id
            if "@" in addr:
                user_id = addr.split("@")[0].split("<")[-1].strip()
            else:
                user_id = addr
            to_user_ids.append(user_id)
        
        # Create message
        message = {
            "id": str(uuid.uuid4()),
            "from_user_id": request.dict().get("from_user_id", "system"),
            "from_address": request.dict().get("from_user_id", "system"),
            "from_company_id": company_id,
            "to_user_ids": to_user_ids,
            "to_addresses": request.to_addresses,
            "to_company_ids": [company_id],
            "subject": request.subject,
            "body": request.body,
            "labels": request.labels or [],
            "read_by": [],
            "attachments": [],
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.messages.insert_one(message)
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "MAIL_SENT",
            "company_id": company_id,
            "user_id": request.dict().get("from_user_id"),
            "meta": {
                "message_id": message["id"],
                "to_count": len(to_user_ids),
                "subject": request.subject
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Mesaj başarıyla gönderildi", "message_id": message["id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Mesaj gönderilemedi"
        )

@api_router.put("/corporate/{company_id}/messages/{message_id}")
async def update_corporate_message(
    company_id: str,
    message_id: str,
    request: MailUpdateRequest
):
    """Update message (mark as read, add labels, etc.)"""
    try:
        # Verify message exists
        message = await db.messages.find_one({"id": message_id})
        if not message:
            raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
        
        # Prepare update data
        update_data = {}
        
        if request.labels is not None:
            update_data["labels"] = request.labels
        
        if request.is_read is not None and request.is_read:
            # Add user to read_by list if not already there
            read_by = message.get("read_by", [])
            # In a real implementation, we'd get the current user ID from auth
            # For now, we'll use a placeholder approach
            current_user_id = "current_user"  # This should come from auth context
            if current_user_id not in read_by:
                read_by.append(current_user_id)
            update_data["read_by"] = read_by
        
        if update_data:
            await db.messages.update_one(
                {"id": message_id},
                {"$set": update_data}
            )
        
        return {"success": True, "message": "Mesaj güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Mesaj güncellenemedi"
        )

@api_router.delete("/corporate/{company_id}/messages/{message_id}")
async def delete_corporate_message(
    company_id: str,
    message_id: str
):
    """Delete a message"""
    try:
        # Verify message exists
        message = await db.messages.find_one({"id": message_id})
        if not message:
            raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
        
        # In a real implementation, we might soft-delete or move to trash
        # For now, we'll hard delete
        await db.messages.delete_one({"id": message_id})
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "MAIL_DELETED",
            "company_id": company_id,
            "meta": {
                "message_id": message_id,
                "subject": message.get("subject", "")
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Mesaj silindi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Mesaj silinemedi"
        )

# ===== CATERING MESSAGE APIs =====
@api_router.get("/catering/{company_id}/messages")
async def get_catering_messages(
    company_id: str,
    user_id: str,
    type: str = "inbox",
    limit: int = 50,
    offset: int = 0
):
    """Get catering messages for user"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "catering", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Catering şirketi bulunamadı")
        
        # Build filter query based on message type
        filter_query = {}
        
        if type == "inbox":
            # Messages sent TO this user
            filter_query["to_user_ids"] = user_id
        elif type == "sent":
            # Messages sent FROM this user  
            filter_query["from_user_id"] = user_id
        elif type == "archived":
            # Messages with archive label
            filter_query["$or"] = [
                {"to_user_ids": user_id, "labels": "archived"},
                {"from_user_id": user_id, "labels": "archived"}
            ]
        
        # Get messages
        messages = await db.messages.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(messages) > limit
        if has_more:
            messages = messages[:-1]
        
        # Format messages
        result_messages = []
        for msg in messages:
            result_messages.append({
                "id": msg["id"],
                "from_user_id": msg["from_user_id"],
                "from_address": msg["from_address"],
                "to_addresses": msg["to_addresses"],
                "subject": msg["subject"],
                "body": msg["body"],
                "labels": msg.get("labels", []),
                "read_by": msg.get("read_by", []),
                "attachments": msg.get("attachments", []),
                "created_at": msg["created_at"].isoformat()
            })
        
        return {
            "messages": result_messages,
            "total": len(result_messages),
            "has_more": has_more
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get catering messages error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Catering mesajları alınamadı"
        )

@api_router.post("/catering/{company_id}/messages")
async def send_catering_message(
    company_id: str,
    request: MailCreateRequest,
    from_user_id: str = "system"
):
    """Send a message within catering network"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "catering", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Catering şirketi bulunamadı")
        
        # Extract user IDs from addresses
        to_user_ids = []
        for addr in request.to_addresses:
            if "@" in addr:
                user_id = addr.split("@")[0].split("<")[-1].strip()
            else:
                user_id = addr
            to_user_ids.append(user_id)
        
        # Create message
        message_id = str(uuid.uuid4())
        message = {
            "id": message_id,
            "from_user_id": from_user_id,
            "from_company_id": company_id,
            "from_address": f"{from_user_id}@catering.sy",
            "to_user_ids": to_user_ids,
            "to_addresses": request.to_addresses,
            "to_company_ids": [company_id],
            "subject": request.subject,
            "body": request.body,
            "labels": request.labels or [],
            "read_by": [],
            "attachments": [],
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.messages.insert_one(message)
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "MAIL_SENT",
            "company_id": company_id,
            "actor_id": from_user_id,
            "meta": {
                "message_id": message_id,
                "subject": request.subject,
                "recipient_count": len(to_user_ids)
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Catering mesajı gönderildi", "message_id": message_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send catering message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Catering mesajı gönderilemedi"
        )

@api_router.put("/catering/{company_id}/messages/{message_id}")
async def update_catering_message(
    company_id: str,
    message_id: str,
    request: MailUpdateRequest
):
    """Update a catering message"""
    try:
        # Verify message exists
        message = await db.messages.find_one({"id": message_id})
        if not message:
            raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
        
        # Prepare update data
        update_data = {}
        
        if request.labels is not None:
            update_data["labels"] = request.labels
        
        if request.is_read is not None and request.is_read:
            read_by = message.get("read_by", [])
            current_user_id = "current_user"
            if current_user_id not in read_by:
                read_by.append(current_user_id)
            update_data["read_by"] = read_by
        
        if update_data:
            await db.messages.update_one(
                {"id": message_id},
                {"$set": update_data}
            )
        
        return {"success": True, "message": "Catering mesajı güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update catering message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Catering mesajı güncellenemedi"
        )

@api_router.delete("/catering/{company_id}/messages/{message_id}")
async def delete_catering_message(
    company_id: str,
    message_id: str
):
    """Delete a catering message"""
    try:
        # Verify message exists
        message = await db.messages.find_one({"id": message_id})
        if not message:
            raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
        
        await db.messages.delete_one({"id": message_id})
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "MAIL_DELETED",
            "company_id": company_id,
            "meta": {
                "message_id": message_id,
                "subject": message.get("subject", "")
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Catering mesajı silindi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete catering message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Catering mesajı silinemedi"
        )

@api_router.get("/catering/{company_id}/employees")
async def get_catering_employees(
    company_id: str,
    type: UserType = None,
    status: str = None,
    search: str = "",
    limit: int = 50,
    offset: int = 0
):
    """Get catering employees with filtering - ONLY users associated with this company"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "catering", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Catering şirketi bulunamadı")
        
        # Get ALL users who have ANY relationship with this company
        all_company_roles = await db.role_assignments.find({
            "company_id": company_id
        }).to_list(None)
        
        company_user_ids = list(set([role["user_id"] for role in all_company_roles]))
        
        if not company_user_ids:
            return EmployeeListResponse(users=[], total=0, has_more=False)
        
        # Build filter query - MUST restrict to company users only
        filter_query = {"id": {"$in": company_user_ids}}
        
        if type == "corporate":
            # Get users with corporate roles in THIS company
            corporate_roles = await db.role_assignments.find({
                "company_id": company_id,
                "role": {"$regex": "^corporate"},
                "is_active": True
            }).to_list(None)
            
            corporate_user_ids = [role["user_id"] for role in corporate_roles]
            filter_query["id"] = {"$in": corporate_user_ids}
        elif type == "individual":
            # Get users without corporate roles in THIS company
            corporate_roles = await db.role_assignments.find({
                "company_id": company_id,
                "role": {"$regex": "^corporate"}
            }).to_list(None)
            
            corporate_user_ids = [role["user_id"] for role in corporate_roles]
            individual_user_ids = [uid for uid in company_user_ids if uid not in corporate_user_ids]
            filter_query["id"] = {"$in": individual_user_ids}
        
        if status:
            filter_query["is_active"] = status == "active"
        
        if search:
            search_conditions = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
            filter_query = {"$and": [{"id": {"$in": filter_query["id"]["$in"]}}, {"$or": search_conditions}]}
            if status:
                filter_query["$and"].append({"is_active": status == "active"})
        
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
        logger.error(f"Get catering employees error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Catering çalışanları alınamadı"
        )

# ===== SUPPLIER MESSAGE APIs =====
@api_router.get("/supplier/{company_id}/messages")
async def get_supplier_messages(
    company_id: str,
    user_id: str,
    type: str = "inbox",
    limit: int = 50,
    offset: int = 0
):
    """Get supplier messages for user"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "supplier", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Tedarikçi şirketi bulunamadı")
        
        # Build filter query based on message type
        filter_query = {}
        
        if type == "inbox":
            # Messages sent TO this user
            filter_query["to_user_ids"] = user_id
        elif type == "sent":
            # Messages sent FROM this user  
            filter_query["from_user_id"] = user_id
        elif type == "archived":
            # Messages with archive label
            filter_query["$or"] = [
                {"to_user_ids": user_id, "labels": "archived"},
                {"from_user_id": user_id, "labels": "archived"}
            ]
        
        # Get messages
        messages = await db.messages.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(messages) > limit
        if has_more:
            messages = messages[:-1]
        
        # Format messages
        result_messages = []
        for msg in messages:
            result_messages.append({
                "id": msg["id"],
                "from_user_id": msg["from_user_id"],
                "from_address": msg["from_address"],
                "to_addresses": msg["to_addresses"],
                "subject": msg["subject"],
                "body": msg["body"],
                "labels": msg.get("labels", []),
                "read_by": msg.get("read_by", []),
                "attachments": msg.get("attachments", []),
                "created_at": msg["created_at"].isoformat()
            })
        
        return {
            "messages": result_messages,
            "total": len(result_messages),
            "has_more": has_more
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get supplier messages error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tedarikçi mesajları alınamadı"
        )

@api_router.post("/supplier/{company_id}/messages")
async def send_supplier_message(
    company_id: str,
    request: MailCreateRequest,
    from_user_id: str = "system"
):
    """Send a message within supplier network"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "supplier", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Tedarikçi şirketi bulunamadı")
        
        # Extract user IDs from addresses
        to_user_ids = []
        for addr in request.to_addresses:
            if "@" in addr:
                user_id = addr.split("@")[0].split("<")[-1].strip()
            else:
                user_id = addr
            to_user_ids.append(user_id)
        
        # Create message
        message_id = str(uuid.uuid4())
        message = {
            "id": message_id,
            "from_user_id": from_user_id,
            "from_company_id": company_id,
            "from_address": f"{from_user_id}@supplier.sy",
            "to_user_ids": to_user_ids,
            "to_addresses": request.to_addresses,
            "to_company_ids": [company_id],
            "subject": request.subject,
            "body": request.body,
            "labels": request.labels or [],
            "read_by": [],
            "attachments": [],
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.messages.insert_one(message)
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "MAIL_SENT",
            "company_id": company_id,
            "actor_id": from_user_id,
            "meta": {
                "message_id": message_id,
                "subject": request.subject,
                "recipient_count": len(to_user_ids)
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Tedarikçi mesajı gönderildi", "message_id": message_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send supplier message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tedarikçi mesajı gönderilemedi"
        )

@api_router.put("/supplier/{company_id}/messages/{message_id}")
async def update_supplier_message(
    company_id: str,
    message_id: str,
    request: MailUpdateRequest
):
    """Update a supplier message"""
    try:
        # Verify message exists
        message = await db.messages.find_one({"id": message_id})
        if not message:
            raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
        
        # Prepare update data
        update_data = {}
        
        if request.labels is not None:
            update_data["labels"] = request.labels
        
        if request.is_read is not None and request.is_read:
            read_by = message.get("read_by", [])
            current_user_id = "current_user"
            if current_user_id not in read_by:
                read_by.append(current_user_id)
            update_data["read_by"] = read_by
        
        if update_data:
            await db.messages.update_one(
                {"id": message_id},
                {"$set": update_data}
            )
        
        return {"success": True, "message": "Tedarikçi mesajı güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update supplier message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tedarikçi mesajı güncellenemedi"
        )

@api_router.delete("/supplier/{company_id}/messages/{message_id}")
async def delete_supplier_message(
    company_id: str,
    message_id: str
):
    """Delete a supplier message"""
    try:
        # Verify message exists
        message = await db.messages.find_one({"id": message_id})
        if not message:
            raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
        
        await db.messages.delete_one({"id": message_id})
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "MAIL_DELETED",
            "company_id": company_id,
            "meta": {
                "message_id": message_id,
                "subject": message.get("subject", "")
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Tedarikçi mesajı silindi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete supplier message error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tedarikçi mesajı silinemedi"
        )

@api_router.get("/supplier/{company_id}/employees")
async def get_supplier_employees(
    company_id: str,
    type: UserType = None,
    status: str = None,
    search: str = "",
    limit: int = 50,
    offset: int = 0
):
    """Get supplier employees with filtering - ONLY users associated with this company"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "supplier", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Tedarikçi şirketi bulunamadı")
        
        # Get ALL users who have ANY relationship with this company
        all_company_roles = await db.role_assignments.find({
            "company_id": company_id
        }).to_list(None)
        
        company_user_ids = list(set([role["user_id"] for role in all_company_roles]))
        
        if not company_user_ids:
            return EmployeeListResponse(users=[], total=0, has_more=False)
        
        # Build filter query - MUST restrict to company users only
        filter_query = {"id": {"$in": company_user_ids}}
        
        if type == "corporate":
            # Get users with corporate roles in THIS company
            corporate_roles = await db.role_assignments.find({
                "company_id": company_id,
                "role": {"$regex": "^corporate"},
                "is_active": True
            }).to_list(None)
            
            corporate_user_ids = [role["user_id"] for role in corporate_roles]
            filter_query["id"] = {"$in": corporate_user_ids}
        elif type == "individual":
            # Get users without corporate roles in THIS company
            corporate_roles = await db.role_assignments.find({
                "company_id": company_id,
                "role": {"$regex": "^corporate"}
            }).to_list(None)
            
            corporate_user_ids = [role["user_id"] for role in corporate_roles]
            individual_user_ids = [uid for uid in company_user_ids if uid not in corporate_user_ids]
            filter_query["id"] = {"$in": individual_user_ids}
        
        if status:
            filter_query["is_active"] = status == "active"
        
        if search:
            search_conditions = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
            filter_query = {"$and": [{"id": {"$in": filter_query["id"]["$in"]}}, {"$or": search_conditions}]}
            if status:
                filter_query["$and"].append({"is_active": status == "active"})
        
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
        logger.error(f"Get supplier employees error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Tedarikçi çalışanları alınamadı"
        )

# ===== PARTNERSHIP APIs (FOR CATERING MANAGEMENT) =====
@api_router.get("/corporate/{company_id}/partnerships")
async def get_corporate_partnerships(
    company_id: str,
    partnership_type: str = None,
    limit: int = 50,
    offset: int = 0
):
    """Get corporate partnerships"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Build filter query
        filter_query = {"corporate_id": company_id, "is_active": True}
        
        if partnership_type:
            filter_query["partnership_type"] = partnership_type
        
        # Get partnerships
        partnerships = await db.partnerships.find(filter_query).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(partnerships) > limit
        if has_more:
            partnerships = partnerships[:-1]
        
        # Format partnerships
        result_partnerships = []
        for partnership in partnerships:
            result_partnerships.append({
                "id": partnership["id"],
                "corporate_id": partnership["corporate_id"],
                "catering_id": partnership.get("catering_id"),
                "supplier_id": partnership.get("supplier_id"),
                "partnership_type": partnership["partnership_type"],
                "is_active": partnership["is_active"],
                "created_at": partnership["created_at"].isoformat()
            })
        
        return {
            "partnerships": result_partnerships,
            "total": len(result_partnerships),
            "has_more": has_more
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get partnerships error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ortaklıklar alınamadı"
        )

@api_router.post("/corporate/{company_id}/partnerships")
async def create_corporate_partnership(
    company_id: str,
    request: dict  # Simple dict for flexibility
):
    """Create a new partnership"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Extract partnership data
        partnership_type = request.get("partnership_type", "catering")
        partner_id = request.get("catering_id") or request.get("supplier_id")
        
        if not partner_id:
            raise HTTPException(status_code=400, detail="Partner ID gerekli")
        
        # Check if partnership already exists
        existing = await db.partnerships.find_one({
            "corporate_id": company_id,
            f"{partnership_type}_id": partner_id,
            "is_active": True
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Ortaklık zaten mevcut")
        
        # Create partnership
        partnership = {
            "id": str(uuid.uuid4()),
            "corporate_id": company_id,
            "partnership_type": partnership_type,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Add partner-specific field
        partnership[f"{partnership_type}_id"] = partner_id
        
        await db.partnerships.insert_one(partnership)
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "PARTNERSHIP_CREATED",
            "company_id": company_id,
            "meta": {
                "partnership_id": partnership["id"],
                "partnership_type": partnership_type,
                "partner_id": partner_id
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Ortaklık oluşturuldu", "partnership_id": partnership["id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create partnership error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ortaklık oluşturulamadı"
        )

@api_router.delete("/corporate/{company_id}/partnerships/{partnership_id}")
async def delete_corporate_partnership(
    company_id: str,
    partnership_id: str
):
    """Delete/deactivate a partnership"""
    try:
        # Verify partnership exists
        partnership = await db.partnerships.find_one({"id": partnership_id, "corporate_id": company_id})
        if not partnership:
            raise HTTPException(status_code=404, detail="Ortaklık bulunamadı")
        
        # Soft delete by setting is_active to False
        await db.partnerships.update_one(
            {"id": partnership_id},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "PARTNERSHIP_DELETED",
            "company_id": company_id,
            "meta": {
                "partnership_id": partnership_id,
                "partnership_type": partnership.get("partnership_type")
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Ortaklık sonlandırıldı"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete partnership error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ortaklık sonlandırılamadı"
        )

# ===== OFFER SYSTEM APIs =====
@api_router.post("/corporate/{company_id}/offers")
async def send_offer_to_catering(
    company_id: str,
    request: dict
):
    """Send an offer to a catering company"""
    try:
        # Verify corporate company exists
        corporate_company = await db.companies.find_one({"id": company_id, "type": "corporate", "is_active": True})
        if not corporate_company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Extract offer data
        catering_id = request.get("catering_id")
        unit_price = request.get("unit_price")
        message = request.get("message", "")
        duration_months = request.get("duration_months", 12)  # Default 12 months
        
        if not catering_id:
            raise HTTPException(status_code=400, detail="Catering firma ID'si gerekli")
        if not unit_price or unit_price <= 0:
            raise HTTPException(status_code=400, detail="Geçerli birim fiyat gerekli")
        if duration_months not in [3, 6, 12, 24, 36]:
            raise HTTPException(status_code=400, detail="Geçersiz süre seçimi (3, 6, 12, 24, 36 ay)")
        
        # Verify catering company exists
        catering_company = await db.companies.find_one({"id": catering_id, "type": "catering", "is_active": True})
        if not catering_company:
            raise HTTPException(status_code=404, detail="Catering firması bulunamadı")
        
        # Check if there's already a pending offer between these companies
        existing_offer = await db.offers.find_one({
            "from_company_id": company_id,
            "to_company_id": catering_id,
            "status": "sent"
        })
        
        if existing_offer:
            raise HTTPException(status_code=400, detail="Bu catering firmasına zaten bekleyen bir teklifiniz var")
        
        # Calculate start and end dates
        start_date = datetime.now(timezone.utc)
        end_date = start_date + timedelta(days=duration_months * 30)  # Approximate month calculation
        
        # Create the offer
        offer = {
            "id": str(uuid.uuid4()),
            "from_company_id": company_id,
            "to_company_id": catering_id,
            "unit_price": float(unit_price),
            "message": message,
            "duration_months": duration_months,
            "start_date": start_date,
            "end_date": end_date,
            "status": "sent",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.offers.insert_one(offer)
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "OFFER_SENT",
            "company_id": company_id,
            "meta": {
                "offer_id": offer["id"],
                "to_company_id": catering_id,
                "unit_price": unit_price
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Teklif gönderildi", "offer_id": offer["id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send offer error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Teklif gönderilemedi"
        )

@api_router.get("/corporate/{company_id}/offers")
async def get_corporate_offers(
    company_id: str,
    offer_type: str = "sent",  # "sent" or "received"
    limit: int = 50,
    offset: int = 0
):
    """Get offers sent by or received by corporate company"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "corporate", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Build filter query
        if offer_type == "sent":
            filter_query = {"from_company_id": company_id}
        else:  # received
            filter_query = {"to_company_id": company_id}
        
        # Get offers
        offers = await db.offers.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(offers) > limit
        if has_more:
            offers = offers[:-1]
        
        # Get company details for each offer
        result_offers = []
        for offer in offers:
            # Get the other company details
            other_company_id = offer["to_company_id"] if offer_type == "sent" else offer["from_company_id"]
            other_company = await db.companies.find_one({"id": other_company_id})
            
            result_offers.append({
                "id": offer["id"],
                "from_company_id": offer["from_company_id"],
                "to_company_id": offer["to_company_id"],
                "unit_price": offer["unit_price"],
                "message": offer.get("message", ""),
                "duration_months": offer.get("duration_months", 12),
                "start_date": offer.get("start_date").isoformat() if offer.get("start_date") else None,
                "end_date": offer.get("end_date").isoformat() if offer.get("end_date") else None,
                "status": offer["status"],
                "created_at": offer["created_at"].isoformat(),
                "updated_at": offer["updated_at"].isoformat(),
                "other_company": {
                    "id": other_company["id"],
                    "name": other_company["name"],
                    "type": other_company["type"]
                } if other_company else None
            })
        
        return {
            "offers": result_offers,
            "total": len(result_offers),
            "has_more": has_more,
            "offer_type": offer_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get corporate offers error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Teklifler alınamadı"
        )

@api_router.get("/catering/{company_id}/offers")
async def get_catering_offers(
    company_id: str,
    offer_type: str = "received",  # "sent" or "received"
    limit: int = 50,
    offset: int = 0
):
    """Get offers sent by or received by catering company"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "catering", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Catering firması bulunamadı")
        
        # Build filter query
        if offer_type == "received":
            filter_query = {"to_company_id": company_id}
        else:  # sent
            filter_query = {"from_company_id": company_id}
        
        # Get offers
        offers = await db.offers.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(offers) > limit
        if has_more:
            offers = offers[:-1]
        
        # Get company details for each offer
        result_offers = []
        for offer in offers:
            # Get the other company details
            other_company_id = offer["from_company_id"] if offer_type == "received" else offer["to_company_id"]
            other_company = await db.companies.find_one({"id": other_company_id})
            
            result_offers.append({
                "id": offer["id"],
                "from_company_id": offer["from_company_id"],
                "to_company_id": offer["to_company_id"],
                "unit_price": offer["unit_price"],
                "message": offer.get("message", ""),
                "duration_months": offer.get("duration_months", 12),
                "start_date": offer.get("start_date").isoformat() if offer.get("start_date") else None,
                "end_date": offer.get("end_date").isoformat() if offer.get("end_date") else None,
                "status": offer["status"],
                "created_at": offer["created_at"].isoformat(),
                "updated_at": offer["updated_at"].isoformat(),
                "other_company": {
                    "id": other_company["id"],
                    "name": other_company["name"],
                    "type": other_company["type"]
                } if other_company else None
            })
        
        return {
            "offers": result_offers,
            "total": len(result_offers),
            "has_more": has_more,
            "offer_type": offer_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get catering offers error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Teklifler alınamadı"
        )

@api_router.put("/catering/{company_id}/offers/{offer_id}")
async def respond_to_offer(
    company_id: str,
    offer_id: str,
    request: dict
):
    """Accept or reject an offer (catering company response)"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": "catering", "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Catering firması bulunamadı")
        
        # Get the offer
        offer = await db.offers.find_one({"id": offer_id, "to_company_id": company_id})
        if not offer:
            raise HTTPException(status_code=404, detail="Teklif bulunamadı")
        
        if offer["status"] != "sent":
            raise HTTPException(status_code=400, detail="Bu teklif zaten yanıtlanmış")
        
        # Extract response data
        action = request.get("action")  # "accept" or "reject"
        
        if action not in ["accept", "reject"]:
            raise HTTPException(status_code=400, detail="Geçersiz aksiyon")
        
        # Update offer status
        new_status = "accepted" if action == "accept" else "rejected"
        await db.offers.update_one(
            {"id": offer_id},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # If accepted, create partnership and contract
        if action == "accept":
            partnership_id = str(uuid.uuid4())
            partnership = {
                "id": partnership_id,
                "corporate_id": offer["from_company_id"],
                "catering_id": company_id,
                "partnership_type": "catering",
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "offer_id": offer_id  # Reference to the accepted offer
            }
            
            # Check if partnership already exists (shouldn't happen but safety check)
            existing_partnership = await db.partnerships.find_one({
                "corporate_id": offer["from_company_id"],
                "catering_id": company_id,
                "is_active": True
            })
            
            if not existing_partnership:
                await db.partnerships.insert_one(partnership)
                
                # Create contract with duration from offer
                start_date = offer.get("start_date", datetime.now(timezone.utc))
                end_date = offer.get("end_date")
                duration_months = offer.get("duration_months", 12)
                
                # If end_date not in offer, calculate it
                if not end_date:
                    end_date = start_date + timedelta(days=duration_months * 30)
                
                contract = {
                    "id": str(uuid.uuid4()),
                    "partnership_id": partnership_id,
                    "corporate_id": offer["from_company_id"],
                    "catering_id": company_id,
                    "unit_price": offer["unit_price"],
                    "start_date": start_date,
                    "end_date": end_date,
                    "duration_months": duration_months,
                    "status": "active",
                    "original_offer_id": offer_id,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                
                await db.contracts.insert_one(contract)
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": f"OFFER_{action.upper()}ED",
            "company_id": company_id,
            "meta": {
                "offer_id": offer_id,
                "from_company_id": offer["from_company_id"],
                "unit_price": offer["unit_price"]
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        message = "Teklif kabul edildi" if action == "accept" else "Teklif reddedildi"
        return {"success": True, "message": message}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Respond to offer error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Teklif yanıtlanamadı"
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
        # DEBUG: Log incoming request and loaded env variables
        print("[DEBUG] ADMIN LOGIN REQUEST username:", request.username)
        print("[DEBUG] ADMIN LOGIN REQUEST password:", request.password)
        print("[DEBUG] ENV MASTER_ADMIN_USERNAME:", os.environ.get('MASTER_ADMIN_USERNAME'))
        print("[DEBUG] ENV MASTER_ADMIN_PASSWORD:", os.environ.get('MASTER_ADMIN_PASSWORD'))
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


# ===== CONTRACT MANAGEMENT APIs =====
@api_router.get("/partnerships/{partnership_id}/contract")
async def get_contract_by_partnership(partnership_id: str):
    """Get contract details for a partnership"""
    try:
        # Get the contract
        contract = await db.contracts.find_one({"partnership_id": partnership_id})
        if not contract:
            raise HTTPException(status_code=404, detail="Anlaşma bulunamadı")
        
        # Get partnership details
        partnership = await db.partnerships.find_one({"id": partnership_id})
        if not partnership:
            raise HTTPException(status_code=404, detail="Ortaklık bulunamadı")
        
        # Get company details
        corporate_company = await db.companies.find_one({"id": contract["corporate_id"]})
        catering_company = await db.companies.find_one({"id": contract["catering_id"]})
        
        return {
            "contract": {
                "id": contract["id"],
                "partnership_id": contract["partnership_id"],
                "corporate_id": contract["corporate_id"],
                "catering_id": contract["catering_id"],
                "unit_price": contract["unit_price"],
                "start_date": contract["start_date"].isoformat(),
                "end_date": contract["end_date"].isoformat(),
                "duration_months": contract["duration_months"],
                "status": contract["status"],
                "created_at": contract["created_at"].isoformat(),
                "updated_at": contract["updated_at"].isoformat(),
                "corporate_company": {
                    "id": corporate_company["id"],
                    "name": corporate_company["name"]
                } if corporate_company else None,
                "catering_company": {
                    "id": catering_company["id"],
                    "name": catering_company["name"]
                } if catering_company else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get contract error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Anlaşma bilgileri alınamadı"
        )

@api_router.get("/{company_type}/{company_id}/contracts")
async def get_company_contracts(
    company_type: str,
    company_id: str,
    status_filter: str = "active",
    limit: int = 50,
    offset: int = 0
):
    """Get contracts for a company (corporate or catering)"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": company_type, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Build filter query based on company type
        filter_query = {"status": status_filter} if status_filter != "all" else {}
        
        if company_type == "corporate":
            filter_query["corporate_id"] = company_id
        elif company_type == "catering":
            filter_query["catering_id"] = company_id
        else:
            raise HTTPException(status_code=400, detail="Geçersiz şirket tipi")
        
        # Get contracts
        contracts = await db.contracts.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(contracts) > limit
        if has_more:
            contracts = contracts[:-1]
        
        # Get company details for each contract
        result_contracts = []
        for contract in contracts:
            # Get the other company details
            other_company_id = contract["catering_id"] if company_type == "corporate" else contract["corporate_id"]
            other_company = await db.companies.find_one({"id": other_company_id})
            
            result_contracts.append({
                "id": contract["id"],
                "partnership_id": contract["partnership_id"],
                "corporate_id": contract["corporate_id"],
                "catering_id": contract["catering_id"],
                "unit_price": contract["unit_price"],
                "start_date": contract["start_date"].isoformat(),
                "end_date": contract["end_date"].isoformat(),
                "duration_months": contract["duration_months"],
                "status": contract["status"],
                "created_at": contract["created_at"].isoformat(),
                "updated_at": contract["updated_at"].isoformat(),
                "other_company": {
                    "id": other_company["id"],
                    "name": other_company["name"],
                    "type": other_company["type"]
                } if other_company else None,
                "days_remaining": (contract["end_date"] - datetime.now(timezone.utc)).days if contract["status"] == "active" else 0
            })
        
        return {
            "contracts": result_contracts,
            "total": len(result_contracts),
            "has_more": has_more,
            "status_filter": status_filter
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get company contracts error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Anlaşmalar alınamadı"
        )


# ===== TERMINATION REQUEST APIs =====
@api_router.post("/{company_type}/{company_id}/termination-requests")
async def create_termination_request(
    company_type: str,
    company_id: str,
    request: dict
):
    """Create a termination request"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": company_type, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Extract termination request data
        partnership_id = request.get("partnership_id")
        reason = request.get("reason", "").strip()
        message = request.get("message", "").strip()
        termination_date = request.get("termination_date")
        
        if not partnership_id:
            raise HTTPException(status_code=400, detail="Ortaklık ID'si gerekli")
        if not reason:
            raise HTTPException(status_code=400, detail="Fesih nedeni zorunludur")
        if not message:
            raise HTTPException(status_code=400, detail="Fesih mesajı zorunludur")
        
        # Get partnership and contract
        partnership = await db.partnerships.find_one({"id": partnership_id, "is_active": True})
        if not partnership:
            raise HTTPException(status_code=404, detail="Ortaklık bulunamadı")
        
        contract = await db.contracts.find_one({"partnership_id": partnership_id, "status": "active"})
        if not contract:
            raise HTTPException(status_code=404, detail="Aktif anlaşma bulunamadı")
        
        # Verify requesting company is part of this partnership
        if company_type == "corporate" and partnership["corporate_id"] != company_id:
            raise HTTPException(status_code=403, detail="Bu ortaklık üzerinde yetkınız yok")
        elif company_type == "catering" and partnership["catering_id"] != company_id:
            raise HTTPException(status_code=403, detail="Bu ortaklık üzerinde yetkıniz yok")
        
        # Determine target company
        if company_type == "corporate":
            target_company_id = partnership["catering_id"]
        else:
            target_company_id = partnership["corporate_id"]
        
        # Check if there's already a pending termination request
        existing_request = await db.termination_requests.find_one({
            "partnership_id": partnership_id,
            "status": "pending"
        })
        
        if existing_request:
            raise HTTPException(status_code=400, detail="Bu ortaklık için zaten bekleyen bir fesih talebi var")
        
        # Parse termination date
        requested_termination_date = None
        if termination_date:
            try:
                requested_termination_date = datetime.fromisoformat(termination_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Geçersiz fesih tarihi formatı")
        
        # Create termination request
        termination_request = {
            "id": str(uuid.uuid4()),
            "contract_id": contract["id"],
            "partnership_id": partnership_id,
            "requesting_company_id": company_id,
            "target_company_id": target_company_id,
            "reason": reason,
            "message": message,
            "status": "pending",
            "requested_termination_date": requested_termination_date,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.termination_requests.insert_one(termination_request)
        
        # Update contract status
        await db.contracts.update_one(
            {"id": contract["id"]},
            {
                "$set": {
                    "status": "pending_termination",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "TERMINATION_REQUEST_CREATED",
            "company_id": company_id,
            "meta": {
                "termination_request_id": termination_request["id"],
                "partnership_id": partnership_id,
                "target_company_id": target_company_id,
                "reason": reason
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Fesih talebi gönderildi", "termination_request_id": termination_request["id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create termination request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fesih talebi oluşturulamadı"
        )

@api_router.get("/{company_type}/{company_id}/termination-requests")
async def get_termination_requests(
    company_type: str,
    company_id: str,
    request_type: str = "received",  # "sent" or "received"
    limit: int = 50,
    offset: int = 0
):
    """Get termination requests for a company"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": company_type, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Build filter query
        if request_type == "sent":
            filter_query = {"requesting_company_id": company_id}
        else:  # received
            filter_query = {"target_company_id": company_id}
        
        # Get termination requests
        termination_requests = await db.termination_requests.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(termination_requests) > limit
        if has_more:
            termination_requests = termination_requests[:-1]
        
        # Get company and partnership details for each request
        result_requests = []
        for request_item in termination_requests:
            # Get the other company details
            other_company_id = request_item["target_company_id"] if request_type == "sent" else request_item["requesting_company_id"]
            other_company = await db.companies.find_one({"id": other_company_id})
            
            # Get partnership details
            partnership = await db.partnerships.find_one({"id": request_item["partnership_id"]})
            
            result_requests.append({
                "id": request_item["id"],
                "contract_id": request_item["contract_id"],
                "partnership_id": request_item["partnership_id"],
                "requesting_company_id": request_item["requesting_company_id"],
                "target_company_id": request_item["target_company_id"],
                "reason": request_item["reason"],
                "message": request_item["message"],
                "status": request_item["status"],
                "requested_termination_date": request_item.get("requested_termination_date").isoformat() if request_item.get("requested_termination_date") else None,
                "created_at": request_item["created_at"].isoformat(),
                "updated_at": request_item["updated_at"].isoformat(),
                "approved_at": request_item.get("approved_at").isoformat() if request_item.get("approved_at") else None,
                "other_company": {
                    "id": other_company["id"],
                    "name": other_company["name"],
                    "type": other_company["type"]
                } if other_company else None,
                "partnership": {
                    "id": partnership["id"],
                    "partnership_type": partnership["partnership_type"]
                } if partnership else None
            })
        
        return {
            "termination_requests": result_requests,
            "total": len(result_requests),
            "has_more": has_more,
            "request_type": request_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get termination requests error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fesih talepleri alınamadı"
        )

@api_router.put("/{company_type}/{company_id}/termination-requests/{request_id}")
async def respond_to_termination_request(
    company_type: str,
    company_id: str,
    request_id: str,
    request: dict
):
    """Approve or reject a termination request"""
    try:
        # Verify company exists
        company = await db.companies.find_one({"id": company_id, "type": company_type, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        # Get the termination request
        termination_request = await db.termination_requests.find_one({"id": request_id, "target_company_id": company_id})
        if not termination_request:
            raise HTTPException(status_code=404, detail="Fesih talebi bulunamadı")
        
        if termination_request["status"] != "pending":
            raise HTTPException(status_code=400, detail="Bu fesih talebi zaten yanıtlanmış")
        
        # Extract response data
        action = request.get("action")  # "approve" or "reject"
        
        if action not in ["approve", "reject"]:
            raise HTTPException(status_code=400, detail="Geçersiz aksiyon")
        
        # Update termination request status
        new_status = "approved" if action == "approve" else "rejected"
        update_data = {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if action == "approve":
            update_data["approved_at"] = datetime.now(timezone.utc)
            update_data["approved_by"] = company_id
        
        await db.termination_requests.update_one(
            {"id": request_id},
            {"$set": update_data}
        )
        
        # If approved, terminate the contract and partnership
        if action == "approve":
            # Update contract status
            await db.contracts.update_one(
                {"id": termination_request["contract_id"]},
                {
                    "$set": {
                        "status": "terminated",
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Deactivate partnership
            await db.partnerships.update_one(
                {"id": termination_request["partnership_id"]},
                {
                    "$set": {
                        "is_active": False,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        else:
            # If rejected, revert contract status to active
            await db.contracts.update_one(
                {"id": termination_request["contract_id"]},
                {
                    "$set": {
                        "status": "active",
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": f"TERMINATION_REQUEST_{action.upper()}ED",
            "company_id": company_id,
            "meta": {
                "termination_request_id": request_id,
                "partnership_id": termination_request["partnership_id"],
                "requesting_company_id": termination_request["requesting_company_id"]
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        message = "Fesih talebi onaylandı" if action == "approve" else "Fesih talebi reddedildi"
        return {"success": True, "message": message}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Respond to termination request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Fesih talebi yanıtlanamadı"
        )


# ===== SUPPLIER PRODUCT MANAGEMENT APIs =====
@api_router.get("/supplier/{supplier_id}/products")
async def get_supplier_products(
    supplier_id: str,
    category: str = None,
    is_active: bool = None,
    limit: int = 50,
    offset: int = 0
):
    """Get products for a supplier"""
    try:
        # Verify supplier exists
        supplier = await db.companies.find_one({"id": supplier_id, "type": "supplier", "is_active": True})
        if not supplier:
            raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
        
        # Build filter query
        filter_query = {"supplier_id": supplier_id}
        
        if category:
            filter_query["category"] = category
        if is_active is not None:
            filter_query["is_active"] = is_active
        
        # Get products
        products = await db.products.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(products) > limit
        if has_more:
            products = products[:-1]
        
        # Format products
        result_products = []
        for product in products:
            result_products.append({
                "id": product["id"],
                "supplier_id": product["supplier_id"],
                "name": product["name"],
                "description": product["description"],
                "unit_type": product["unit_type"],
                "unit_price": product["unit_price"],
                "stock_quantity": product["stock_quantity"],
                "minimum_order_quantity": product["minimum_order_quantity"],
                "is_active": product["is_active"],
                "category": product.get("category"),
                "image_url": product.get("image_url"),
                "created_at": product["created_at"].isoformat(),
                "updated_at": product["updated_at"].isoformat()
            })
        
        return {
            "products": result_products,
            "total": len(result_products),
            "has_more": has_more
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get supplier products error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ürünler alınamadı"
        )

@api_router.post("/supplier/{supplier_id}/products")
async def create_supplier_product(
    supplier_id: str,
    request: dict
):
    """Create a new product for supplier"""
    try:
        # Verify supplier exists
        supplier = await db.companies.find_one({"id": supplier_id, "type": "supplier", "is_active": True})
        if not supplier:
            raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
        
        # Validate required fields
        required_fields = ["name", "description", "unit_type", "unit_price", "stock_quantity"]
        for field in required_fields:
            if field not in request or not request[field]:
                raise HTTPException(status_code=400, detail=f"{field} alanı zorunludur")
        
        if request["unit_price"] <= 0:
            raise HTTPException(status_code=400, detail="Birim fiyat 0'dan büyük olmalıdır")
        
        if request["stock_quantity"] < 0:
            raise HTTPException(status_code=400, detail="Stok miktarı negatif olamaz")
        
        # Create product
        product = {
            "id": str(uuid.uuid4()),
            "supplier_id": supplier_id,
            "name": request["name"],
            "description": request["description"],
            "unit_type": request["unit_type"],
            "unit_price": float(request["unit_price"]),
            "stock_quantity": int(request["stock_quantity"]),
            "minimum_order_quantity": int(request.get("minimum_order_quantity", 1)),
            "is_active": True,
            "category": request.get("category"),
            "image_url": request.get("image_url"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.products.insert_one(product)
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "PRODUCT_CREATED",
            "company_id": supplier_id,
            "meta": {
                "product_id": product["id"],
                "product_name": product["name"]
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Ürün oluşturuldu", "product_id": product["id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create product error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ürün oluşturulamadı"
        )

@api_router.put("/supplier/{supplier_id}/products/{product_id}")
async def update_supplier_product(
    supplier_id: str,
    product_id: str,
    request: dict
):
    """Update a supplier product"""
    try:
        # Verify product exists and belongs to supplier
        product = await db.products.find_one({"id": product_id, "supplier_id": supplier_id})
        if not product:
            raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        
        # Prepare update data
        update_data = {"updated_at": datetime.now(timezone.utc)}
        
        if "name" in request:
            update_data["name"] = request["name"]
        if "description" in request:
            update_data["description"] = request["description"]
        if "unit_type" in request:
            update_data["unit_type"] = request["unit_type"]
        if "unit_price" in request:
            if request["unit_price"] <= 0:
                raise HTTPException(status_code=400, detail="Birim fiyat 0'dan büyük olmalıdır")
            update_data["unit_price"] = float(request["unit_price"])
        if "stock_quantity" in request:
            if request["stock_quantity"] < 0:
                raise HTTPException(status_code=400, detail="Stok miktarı negatif olamaz")
            update_data["stock_quantity"] = int(request["stock_quantity"])
        if "minimum_order_quantity" in request:
            update_data["minimum_order_quantity"] = int(request["minimum_order_quantity"])
        if "is_active" in request:
            update_data["is_active"] = bool(request["is_active"])
        if "category" in request:
            update_data["category"] = request["category"]
        if "image_url" in request:
            update_data["image_url"] = request["image_url"]
        
        # Update product
        await db.products.update_one(
            {"id": product_id},
            {"$set": update_data}
        )
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "PRODUCT_UPDATED",
            "company_id": supplier_id,
            "meta": {
                "product_id": product_id,
                "product_name": product["name"]
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Ürün güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update product error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ürün güncellenemedi"
        )

@api_router.delete("/supplier/{supplier_id}/products/{product_id}")
async def delete_supplier_product(
    supplier_id: str,
    product_id: str
):
    """Delete (deactivate) a supplier product"""
    try:
        # Verify product exists and belongs to supplier
        product = await db.products.find_one({"id": product_id, "supplier_id": supplier_id})
        if not product:
            raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        
        # Soft delete by setting is_active to False
        await db.products.update_one(
            {"id": product_id},
            {
                "$set": {
                    "is_active": False,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "PRODUCT_DELETED",
            "company_id": supplier_id,
            "meta": {
                "product_id": product_id,
                "product_name": product["name"]
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Ürün silindi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete product error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ürün silinemedi"
        )

# ===== SUPPLIER ORDER MANAGEMENT APIs =====
@api_router.get("/supplier/{supplier_id}/orders")
async def get_supplier_orders(
    supplier_id: str,
    status_filter: str = None,
    limit: int = 50,
    offset: int = 0
):
    """Get orders for a supplier"""
    try:
        # Verify supplier exists
        supplier = await db.companies.find_one({"id": supplier_id, "type": "supplier", "is_active": True})
        if not supplier:
            raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
        
        # Build filter query
        filter_query = {"supplier_id": supplier_id}
        
        if status_filter:
            filter_query["status"] = status_filter
        
        # Get orders
        orders = await db.orders.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(orders) > limit
        if has_more:
            orders = orders[:-1]
        
        # Get order details with catering company info and items
        result_orders = []
        for order in orders:
            # Get catering company info
            catering_company = await db.companies.find_one({"id": order["catering_id"]})
            
            # Get order items
            order_items = await db.order_items.find({"order_id": order["id"]}).to_list(None)
            items_with_products = []
            
            for item in order_items:
                product = await db.products.find_one({"id": item["product_id"]})
                items_with_products.append({
                    "id": item["id"],
                    "product_id": item["product_id"],
                    "product_name": product["name"] if product else "Bilinmeyen Ürün",
                    "product_unit_type": product["unit_type"] if product else "adet",
                    "quantity": item["quantity"],
                    "unit_price": item["unit_price"],
                    "total_price": item["total_price"]
                })
            
            result_orders.append({
                "id": order["id"],
                "supplier_id": order["supplier_id"],
                "catering_id": order["catering_id"],
                "catering_company_name": catering_company["name"] if catering_company else "Bilinmeyen Firma",
                "status": order["status"],
                "total_amount": order["total_amount"],
                "delivery_address": order.get("delivery_address"),
                "delivery_date": order.get("delivery_date").isoformat() if order.get("delivery_date") else None,
                "notes": order.get("notes"),
                "created_at": order["created_at"].isoformat(),
                "updated_at": order["updated_at"].isoformat(),
                "confirmed_at": order.get("confirmed_at").isoformat() if order.get("confirmed_at") else None,
                "delivered_at": order.get("delivered_at").isoformat() if order.get("delivered_at") else None,
                "items": items_with_products
            })
        
        return {
            "orders": result_orders,
            "total": len(result_orders),
            "has_more": has_more
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get supplier orders error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Siparişler alınamadı"
        )

@api_router.get("/supplier/{supplier_id}/stats")
async def get_supplier_stats(
    supplier_id: str,
    period: str = "1_month"  # "1_day", "1_week", "1_month", "1_year"
):
    """Get supplier statistics for different periods"""
    try:
        # Verify supplier exists
        supplier = await db.companies.find_one({"id": supplier_id, "type": "supplier", "is_active": True})
        if not supplier:
            raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
        
        # Calculate date range
        now = datetime.now(timezone.utc)
        if period == "1_day":
            start_date = now - timedelta(days=1)
        elif period == "1_week":
            start_date = now - timedelta(weeks=1)
        elif period == "1_month":
            start_date = now - timedelta(days=30)
        elif period == "1_year":
            start_date = now - timedelta(days=365)
        else:
            raise HTTPException(status_code=400, detail="Geçersiz dönem")
        
        # Get orders in period
        orders_in_period = await db.orders.find({
            "supplier_id": supplier_id,
            "created_at": {"$gte": start_date}
        }).to_list(None)
        
        # Calculate stats
        total_orders = len(orders_in_period)
        total_revenue = sum(order["total_amount"] for order in orders_in_period)
        delivered_orders = len([o for o in orders_in_period if o["status"] == "delivered"])
        pending_orders = len([o for o in orders_in_period if o["status"] == "pending"])
        
        # Get product count
        total_products = await db.products.count_documents({"supplier_id": supplier_id, "is_active": True})
        
        # Get low stock products
        low_stock_products = await db.products.find({
            "supplier_id": supplier_id,
            "is_active": True,
            "stock_quantity": {"$lt": 10}
        }).to_list(None)
        
        return {
            "period": period,
            "total_orders": total_orders,
            "total_revenue": total_revenue,
            "delivered_orders": delivered_orders,
            "pending_orders": pending_orders,
            "total_products": total_products,
            "low_stock_products": len(low_stock_products),
            "low_stock_items": [
                {
                    "id": product["id"],
                    "name": product["name"],
                    "stock_quantity": product["stock_quantity"]
                }
                for product in low_stock_products
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get supplier stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="İstatistikler alınamadı"
        )

@api_router.put("/supplier/{supplier_id}/orders/{order_id}")
async def update_supplier_order_status(
    supplier_id: str,
    order_id: str,
    request: dict
):
    """Update order status"""
    try:
        # Verify order exists and belongs to supplier
        order = await db.orders.find_one({"id": order_id, "supplier_id": supplier_id})
        if not order:
            raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
        
        new_status = request.get("status")
        if new_status not in ["pending", "confirmed", "preparing", "delivered", "cancelled"]:
            raise HTTPException(status_code=400, detail="Geçersiz durum")
        
        # Update order
        update_data = {
            "status": new_status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if new_status == "confirmed":
            update_data["confirmed_at"] = datetime.now(timezone.utc)
        elif new_status == "delivered":
            update_data["delivered_at"] = datetime.now(timezone.utc)
        
        await db.orders.update_one(
            {"id": order_id},
            {"$set": update_data}
        )
        
        # Log the action
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "ORDER_STATUS_UPDATED",
            "company_id": supplier_id,
            "meta": {
                "order_id": order_id,
                "new_status": new_status
            },
            "created_at": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(audit_log)
        
        return {"success": True, "message": "Sipariş durumu güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update order status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Sipariş durumu güncellenemedi"
        )

from fastapi import Body
# ===== CATERING SUPPLIER SHOPPING APIs =====
@api_router.post("/catering/{catering_id}/suppliers/{supplier_id}/orders")
async def create_order_for_catering_supplier(
    catering_id: str,
    supplier_id: str,
    request: dict = Body(...)
):
    """Catering şirketi için tedarikçiden sipariş oluştur"""
    try:
        # Catering ve tedarikçi kontrolü
        catering = await db.companies.find_one({"id": catering_id, "type": "catering", "is_active": True})
        if not catering:
            raise HTTPException(status_code=404, detail="Catering firması bulunamadı")
        supplier = await db.companies.find_one({"id": supplier_id, "type": "supplier", "is_active": True})
        if not supplier:
            raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")

        items = request.get("items", [])
        notes = request.get("notes", "")
        if not items or not isinstance(items, list):
            raise HTTPException(status_code=400, detail="Sipariş ürünleri eksik veya hatalı")

        # Sipariş kalemlerini ve toplam tutarı hazırla
        order_items = []
        total_amount = 0.0
        for item in items:
            product_id = item.get("product_id")
            quantity = item.get("quantity")
            if not product_id or not quantity or quantity <= 0:
                raise HTTPException(status_code=400, detail="Ürün veya miktar hatalı")
            product = await db.products.find_one({"id": product_id, "supplier_id": supplier_id, "is_active": True})
            if not product:
                raise HTTPException(status_code=404, detail=f"Ürün bulunamadı: {product_id}")
            unit_price = product["unit_price"]
            total_price = unit_price * quantity
            total_amount += total_price
            order_items.append({
                "id": str(uuid.uuid4()),
                "product_id": product_id,
                "quantity": quantity,
                "unit_price": unit_price,
                "total_price": total_price
            })

        order_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        order_doc = {
            "id": order_id,
            "supplier_id": supplier_id,
            "catering_id": catering_id,
            "status": "pending",
            "total_amount": total_amount,
            "notes": notes,
            "created_at": now,
            "updated_at": now
        }
        await db.orders.insert_one(order_doc)
        for item in order_items:
            item_doc = dict(item)
            item_doc["order_id"] = order_id
            await db.order_items.insert_one(item_doc)

        # Log
        audit_log = {
            "id": str(uuid.uuid4()),
            "type": "ORDER_CREATED",
            "company_id": catering_id,
            "meta": {
                "order_id": order_id,
                "supplier_id": supplier_id,
                "total_amount": total_amount
            },
            "created_at": now
        }
        await db.audit_logs.insert_one(audit_log)

        return {"success": True, "message": "Sipariş başarıyla oluşturuldu", "order_id": order_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create order error: {e}")
        raise HTTPException(status_code=500, detail="Sipariş oluşturulamadı")
@api_router.get("/catering/{catering_id}/suppliers/{supplier_id}/products")
async def get_supplier_products_for_catering(
    catering_id: str,
    supplier_id: str,
    category: str = None,
    search: str = "",
    limit: int = 50,
    offset: int = 0
):
    """Get supplier products for catering company shopping"""
    try:
        # Verify catering company exists
        catering = await db.companies.find_one({"id": catering_id, "type": "catering", "is_active": True})
        if not catering:
            raise HTTPException(status_code=404, detail="Catering firması bulunamadı")
        
        # Verify supplier exists
        supplier = await db.companies.find_one({"id": supplier_id, "type": "supplier", "is_active": True})
        if not supplier:
            raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
        
        # Build filter query
        filter_query = {"supplier_id": supplier_id, "is_active": True}
        
        if category:
            filter_query["category"] = category
        if search:
            filter_query["name"] = {"$regex": search, "$options": "i"}
        
        # Get products
        products = await db.products.find(filter_query).sort("name", 1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(products) > limit
        if has_more:
            products = products[:-1]
        
        # Format products
        result_products = []
        for product in products:
            result_products.append({
                "id": product["id"],
                "supplier_id": product["supplier_id"],
                "name": product["name"],
                "description": product["description"],
                "unit_type": product["unit_type"],
                "unit_price": product["unit_price"],
                "stock_quantity": product["stock_quantity"],
                "minimum_order_quantity": product["minimum_order_quantity"],
                "category": product.get("category"),
                "image_url": product.get("image_url")
            })
        
        return {
            "supplier_info": {
                "id": supplier["id"],
                "name": supplier["name"],
                "address": supplier.get("address"),
                "phone": supplier.get("phone")
            },
            "products": result_products,
            "total": len(result_products),
            "has_more": has_more
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get supplier products for catering error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ürünler alınamadı"
        )

# ===== GENERAL COMPANIES & PARTNERSHIPS APIs =====
@api_router.get("/companies")
async def get_companies(
    type: str = None,
    limit: int = 100,
    offset: int = 0,
    search: str = ""
):
    """Get companies by type with optional search"""
    try:
        # Build filter query
        filter_query = {"is_active": True}
        
        if type:
            if type not in ['corporate', 'catering', 'supplier']:
                raise HTTPException(status_code=400, detail="Geçersiz şirket tipi")
            filter_query["type"] = type
        
        if search:
            filter_query["name"] = {"$regex": search, "$options": "i"}
        
        # Get companies
        companies = await db.companies.find(filter_query).sort("name", 1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(companies) > limit
        if has_more:
            companies = companies[:-1]
        
        # Format companies
        result_companies = []
        for company in companies:
            result_companies.append({
                "id": company["id"],
                "name": company["name"],
                "slug": company["slug"],
                "type": company["type"],
                "phone": company.get("phone"),
                "address": company.get("address"),
                "created_at": company["created_at"].isoformat(),
                "ratings": company.get("ratings"),
                "counts": company.get("counts")
            })
        
        return {
            "companies": result_companies,
            "total": len(result_companies),
            "has_more": has_more
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get companies error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Şirketler alınamadı"
        )

@api_router.get("/companies/{company_id}")
async def get_company_by_id(company_id: str):
    """Get company details by ID"""
    try:
        # Get company
        company = await db.companies.find_one({"id": company_id, "is_active": True})
        if not company:
            raise HTTPException(status_code=404, detail="Şirket bulunamadı")
        
        return {
            "id": company["id"],
            "name": company["name"],
            "slug": company["slug"],
            "type": company["type"],
            "phone": company.get("phone"),
            "address": company.get("address"),
            "created_at": company["created_at"].isoformat(),
            "updated_at": company["updated_at"].isoformat(),
            "ratings": company.get("ratings"),
            "counts": company.get("counts"),
            "is_active": company["is_active"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get company by ID error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Şirket bilgileri alınamadı"
        )

@api_router.get("/partnerships")
async def get_partnerships(
    catering_id: str = None,
    corporate_id: str = None,
    supplier_id: str = None,
    partnership_type: str = None,
    limit: int = 50,
    offset: int = 0
):
    """Get partnerships with filtering"""
    try:
        # Build filter query
        filter_query = {"is_active": True}
        
        if catering_id:
            filter_query["catering_id"] = catering_id
        if corporate_id:
            filter_query["corporate_id"] = corporate_id
        if supplier_id:
            filter_query["supplier_id"] = supplier_id
        if partnership_type:
            filter_query["partnership_type"] = partnership_type
        
        # Get partnerships
        partnerships = await db.partnerships.find(filter_query).sort("created_at", -1).skip(offset).limit(limit + 1).to_list(None)
        
        has_more = len(partnerships) > limit
        if has_more:
            partnerships = partnerships[:-1]
        
        # Format partnerships
        result_partnerships = []
        for partnership in partnerships:
            result_partnerships.append({
                "id": partnership["id"],
                "corporate_id": partnership.get("corporate_id"),
                "catering_id": partnership.get("catering_id"),
                "supplier_id": partnership.get("supplier_id"),
                "partnership_type": partnership["partnership_type"],
                "is_active": partnership["is_active"],
                "created_at": partnership["created_at"].isoformat(),
                "updated_at": partnership["updated_at"].isoformat()
            })
        
        return {
            "partnerships": result_partnerships,
            "total": len(result_partnerships),
            "has_more": has_more
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get partnerships error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ortaklıklar alınamadı"
        )

# Include router
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    if redis_available and redis_client:
        await redis_client.close()