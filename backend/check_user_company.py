import os
from dotenv import load_dotenv
from pymongo import MongoClient

# .env dosyasını yükle
load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017")
DB_NAME = os.environ.get("DB_NAME", "secyedb")

# Kontrol edilecek ID'ler
USER_ID = "fe20bd75-bbe7-47f0-b4c1-80f073348e3d"
COMPANY_ID = "b16cf400-a69c-4763-be02-2bdde874795b"

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

log = []

def check_user():
    user = db.users.find_one({"id": USER_ID, "is_active": True})
    if user:
        log.append(f"User bulundu: {user['full_name']} ({user['id']})")
    else:
        log.append("User bulunamadı veya aktif değil.")

def check_company():
    company = db.companies.find_one({"id": COMPANY_ID, "is_active": True})
    if company:
        log.append(f"Company bulundu: {company['name']} ({company['id']})")
    else:
        log.append("Company bulunamadı veya aktif değil.")

def check_role_assignment():
    role = db.role_assignments.find_one({"user_id": USER_ID, "company_id": COMPANY_ID, "is_active": True})
    if role:
        log.append(f"Role assignment bulundu: {role['role']}")
    else:
        log.append("Role assignment bulunamadı veya aktif değil.")

if __name__ == "__main__":
    check_user()
    check_company()
    check_role_assignment()
    with open("check_user_company.log", "w", encoding="utf-8") as f:
        for line in log:
            print(line)
            f.write(line + "\\n")
    for user in db.users.find():
        print(user)
    for company in db.companies.find():
        print(company)
    for role in db.role_assignments.find():
        print(role)