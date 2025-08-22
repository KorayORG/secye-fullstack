from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union, Literal
from datetime import datetime, timezone, timedelta
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

class LoginResponse(BaseModel):
    success: bool
    user_id: str
    redirect_url: Optional[str] = None
    message: str

class CompanySearchResponse(BaseModel):
    companies: List[Dict[str, Any]]
    has_more: bool

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

# Include router
app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    if redis_available and redis_client:
        await redis_client.close()