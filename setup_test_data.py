#!/usr/bin/env python3
"""
Setup test data for individual user login system testing
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone
from argon2 import PasswordHasher
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

async def setup_test_data():
    """Setup test companies and users for testing"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    ph = PasswordHasher()
    
    print("🔧 Setting up test data for individual user login system...")
    
    # Create test corporate companies
    companies = [
        {
            "id": "test-corp-1",
            "type": "corporate",
            "name": "Test Corporate Company 1",
            "slug": "test-corporate-1",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": "test-corp-2", 
            "type": "corporate",
            "name": "Test Corporate Company 2",
            "slug": "test-corporate-2",
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    # Insert companies
    for company in companies:
        existing = await db.companies.find_one({"id": company["id"]})
        if not existing:
            await db.companies.insert_one(company)
            print(f"✅ Created company: {company['name']} (ID: {company['id']})")
        else:
            print(f"ℹ️  Company already exists: {company['name']} (ID: {company['id']})")
    
    # Create test users with company memberships
    users = [
        {
            "id": "test-user-1",
            "full_name": "Test Individual User 1",
            "phone": "+905551111111",
            "password_hash": ph.hash("1234"),
            "company_ids": ["test-corp-1"],  # Member of first company only
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": "test-user-2",
            "full_name": "Test Individual User 2", 
            "phone": "+905552222222",
            "password_hash": ph.hash("1234"),
            "company_ids": ["test-corp-2"],  # Member of second company only
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": "test-user-multi",
            "full_name": "Test Multi-Company User",
            "phone": "+905553333333", 
            "password_hash": ph.hash("1234"),
            "company_ids": ["test-corp-1", "test-corp-2"],  # Member of both companies
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    # Insert users
    for user in users:
        existing = await db.users.find_one({"id": user["id"]})
        if not existing:
            await db.users.insert_one(user)
            print(f"✅ Created user: {user['full_name']} (ID: {user['id']}, Phone: {user['phone']})")
            print(f"   Company memberships: {user['company_ids']}")
        else:
            print(f"ℹ️  User already exists: {user['full_name']} (ID: {user['id']})")
    
    print("\n🎯 Test data setup complete!")
    print("Available test accounts:")
    print("- Phone: +905551111111, Password: 1234, Company: test-corp-1")
    print("- Phone: +905552222222, Password: 1234, Company: test-corp-2") 
    print("- Phone: +905553333333, Password: 1234, Companies: test-corp-1, test-corp-2")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_test_data())