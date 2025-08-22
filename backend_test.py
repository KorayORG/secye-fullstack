import requests
import sys
from datetime import datetime
import json

class SecYeAPITester:
    def __init__(self, base_url="https://corpfood-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.company_id = None
        self.user_id = None
        self.corporate_company_id = None
        self.catering_company_id = None
        self.supplier_company_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        if params:
            print(f"   Params: {params}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            print(f"   Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error Response: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test API health check"""
        return self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )

    def test_company_search(self, company_type="corporate", query=""):
        """Test company search API and collect company IDs"""
        success, response = self.run_test(
            f"Company Search - {company_type} - {query if query else 'all'}",
            "GET",
            "companies/search",
            200,
            params={"type": company_type, "query": query}
        )
        
        if success and response.get('companies'):
            companies = response['companies']
            if companies:
                # Store company IDs by type for dashboard tests
                if company_type == "corporate" and not self.corporate_company_id:
                    self.corporate_company_id = companies[0]['id']
                    self.company_id = companies[0]['id']  # For backward compatibility
                    print(f"   Found corporate company: {companies[0]['name']} (ID: {self.corporate_company_id})")
                elif company_type == "catering" and not self.catering_company_id:
                    self.catering_company_id = companies[0]['id']
                    print(f"   Found catering company: {companies[0]['name']} (ID: {self.catering_company_id})")
                elif company_type == "supplier" and not self.supplier_company_id:
                    self.supplier_company_id = companies[0]['id']
                    print(f"   Found supplier company: {companies[0]['name']} (ID: {self.supplier_company_id})")
        
        return success, response

    def test_login(self, phone="+905551112233", password="12345678", company_type="corporate"):
        """Test login API"""
        if not self.company_id:
            print("❌ No company ID available for login test")
            return False, {}
            
        success, response = self.run_test(
            "Corporate Login",
            "POST",
            "auth/login",
            200,
            data={
                "phone": phone,
                "password": password,
                "company_type": company_type,
                "company_id": self.company_id
            }
        )
        return success, response

    def test_corporate_application_existing(self):
        """Test corporate application for existing company"""
        if not self.company_id:
            print("❌ No company ID available for corporate application test")
            return False, {}
            
        test_phone = f"+9055{datetime.now().strftime('%H%M%S')}1234"
        
        success, response = self.run_test(
            "Corporate Application - Existing Company",
            "POST",
            "auth/register/corporate/application",
            200,
            data={
                "mode": "existing",
                "target": {
                    "mode": "existing",
                    "company_id": self.company_id
                },
                "applicant": {
                    "full_name": "Test Yetkili",
                    "phone": test_phone,
                    "email": "test@example.com"
                },
                "password": "TestPass123!"
            }
        )
        return success, response

    def test_corporate_application_new(self):
        """Test corporate application for new company"""
        test_phone = f"+9055{datetime.now().strftime('%H%M%S')}5678"
        
        success, response = self.run_test(
            "Corporate Application - New Company",
            "POST",
            "auth/register/corporate/application",
            200,
            data={
                "mode": "new",
                "target": {
                    "mode": "new",
                    "company_type": "corporate",
                    "new_company_payload": {
                        "name": f"Test Şirket {datetime.now().strftime('%H%M%S')}",
                        "address": "Test Mahallesi, Test Sokak No:1, İstanbul",
                        "contact_phone": "+902121234567",
                        "owner_full_name": "Test Sahibi",
                        "owner_phone": test_phone,
                        "owner_email": "owner@testcompany.com"
                    }
                },
                "applicant": {
                    "full_name": "Test Sahibi",
                    "phone": test_phone,
                    "email": "owner@testcompany.com"
                },
                "password": "TestPass123!"
            }
        )
        return success, response

    def test_corporate_application_validation(self):
        """Test corporate application validation"""
        # Test missing phone
        success1, _ = self.run_test(
            "Corporate Application - Missing Phone",
            "POST",
            "auth/register/corporate/application",
            422,  # Validation error
            data={
                "mode": "existing",
                "target": {
                    "mode": "existing",
                    "company_id": self.company_id if self.company_id else "test-id"
                },
                "applicant": {
                    "full_name": "Test Yetkili",
                    "email": "test@example.com"
                    # Missing phone
                },
                "password": "TestPass123!"
            }
        )
        
        # Test duplicate phone (if we have a valid phone from previous test)
        test_phone = "+905551112233"  # Use a common test phone
        success2, _ = self.run_test(
            "Corporate Application - Duplicate Phone",
            "POST",
            "auth/register/corporate/application",
            400,  # Bad request for duplicate
            data={
                "mode": "existing",
                "target": {
                    "mode": "existing",
                    "company_id": self.company_id if self.company_id else "test-id"
                },
                "applicant": {
                    "full_name": "Test Yetkili",
                    "phone": test_phone,
                    "email": "test@example.com"
                },
                "password": "TestPass123!"
            }
        )
        
        return success1 or success2, {}  # At least one validation test should work

    def test_individual_registration(self):
        """Test individual registration"""
        if not self.company_id:
            print("❌ No company ID available for individual registration test")
            return False, {}
            
        test_phone = f"+9055{datetime.now().strftime('%H%M%S')}9999"
        
        success, response = self.run_test(
            "Individual Registration",
            "POST",
            "auth/register/individual",
            200,
            data={
                "full_name": "Test Bireysel",
                "phone": test_phone,
                "password": "TestPass123!",
                "company_type": "corporate",
                "company_id": self.company_id
            }
        )
        return success, response

def main():
    print("🚀 Starting Seç Ye API Tests - Corporate Application Focus")
    print("=" * 60)
    
    # Setup
    tester = SecYeAPITester()

    # Test 1: API Health Check
    print("\n📋 Test 1: API Health Check")
    tester.test_health_check()

    # Test 2: Company Search
    print("\n📋 Test 2: Company Search")
    tester.test_company_search("corporate", "A-Tech")

    # Test 3: Corporate Application - Existing Company
    print("\n📋 Test 3: Corporate Application - Existing Company")
    tester.test_corporate_application_existing()

    # Test 4: Corporate Application - New Company
    print("\n📋 Test 4: Corporate Application - New Company")
    tester.test_corporate_application_new()

    # Test 5: Corporate Application Validation
    print("\n📋 Test 5: Corporate Application Validation")
    tester.test_corporate_application_validation()

    # Test 6: Individual Registration
    print("\n📋 Test 6: Individual Registration")
    tester.test_individual_registration()

    # Test 7: Login (if company was found)
    print("\n📋 Test 7: Corporate Login")
    if tester.company_id:
        tester.test_login()
    else:
        print("⚠️  Skipping login test - no company found")

    # Additional company search tests
    print("\n📋 Test 8: Additional Company Searches")
    tester.test_company_search("corporate", "")  # Empty query
    tester.test_company_search("catering", "")   # Different type
    tester.test_company_search("supplier", "")   # Different type

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())