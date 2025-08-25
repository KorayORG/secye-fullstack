import requests
import sys
from datetime import datetime
import json

class AdminAPITester:
    def __init__(self, base_url="https://foodsupply-sys.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.application_id = None
        self.company_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if self.admin_token:
            default_headers['Authorization'] = f'Bearer {self.admin_token}'
        
        # Merge with custom headers
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        if params:
            print(f"   Params: {params}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)

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

    def test_admin_login(self):
        """Test admin login with master credentials"""
        success, response = self.run_test(
            "Master Admin Login",
            "POST",
            "admin/login",
            200,
            data={
                "username": "oL-;&&hG(QZr~nn|4_*tA4U$j;NH9?E$ApqxQH1'Qc,kBzjHNrpEV;E.^q:%.Zn",
                "password": "!}%bKW|^?q'MwBJU>TlV`NAe9-G-+nP/WLtx79)KmKyCimBdAj5v7R=FxDjU|`v"
            }
        )
        
        if success and response.get('token'):
            self.admin_token = response['token']
            print(f"   ✅ Admin token obtained: {self.admin_token[:20]}...")
        
        return success, response

    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        success, response = self.run_test(
            "Admin Login - Invalid Credentials",
            "POST",
            "admin/login",
            401,
            data={
                "username": "invalid_user",
                "password": "invalid_pass"
            }
        )
        return success, response

    def test_admin_dashboard(self):
        """Test admin dashboard stats"""
        if not self.admin_token:
            print("❌ No admin token available for dashboard test")
            return False, {}
            
        success, response = self.run_test(
            "Admin Dashboard Stats",
            "GET",
            "admin/dashboard",
            200
        )
        
        if success and response:
            print(f"   📊 Dashboard Stats:")
            print(f"      Active Companies: {response.get('active_companies', 0)}")
            print(f"      Inactive Companies: {response.get('inactive_companies', 0)}")
            print(f"      Total Companies: {response.get('total_companies', 0)}")
            print(f"      Pending Applications: {response.get('pending_applications', 0)}")
            print(f"      Total Users: {response.get('total_users', 0)}")
            print(f"      Recent Applications: {len(response.get('recent_applications', []))}")
        
        return success, response

    def test_admin_applications_list(self):
        """Test getting applications list"""
        if not self.admin_token:
            print("❌ No admin token available for applications test")
            return False, {}
            
        success, response = self.run_test(
            "Admin Applications List",
            "GET",
            "admin/applications",
            200
        )
        
        if success and response.get('applications'):
            applications = response['applications']
            print(f"   📋 Found {len(applications)} applications")
            
            # Store first pending application for update test
            for app in applications:
                if app.get('status') == 'pending':
                    self.application_id = app['id']
                    print(f"   📝 Found pending application: {self.application_id}")
                    break
        
        return success, response

    def test_admin_applications_filtered(self):
        """Test getting filtered applications"""
        if not self.admin_token:
            print("❌ No admin token available for filtered applications test")
            return False, {}
            
        # Test pending applications
        success1, response1 = self.run_test(
            "Admin Applications - Pending Only",
            "GET",
            "admin/applications",
            200,
            params={"status": "pending"}
        )
        
        # Test approved applications
        success2, response2 = self.run_test(
            "Admin Applications - Approved Only",
            "GET",
            "admin/applications",
            200,
            params={"status": "approved"}
        )
        
        return success1 and success2, {}

    def test_admin_application_approve(self):
        """Test approving an application"""
        if not self.admin_token:
            print("❌ No admin token available for application approval test")
            return False, {}
            
        if not self.application_id:
            print("❌ No pending application ID available for approval test")
            return False, {}
            
        success, response = self.run_test(
            "Admin Application Approval",
            "POST",
            f"admin/applications/{self.application_id}/update",
            200,
            data={
                "status": "approved",
                "notes": "Test approval by admin API test"
            }
        )
        return success, response

    def test_admin_companies_list(self):
        """Test getting companies list"""
        if not self.admin_token:
            print("❌ No admin token available for companies test")
            return False, {}
            
        success, response = self.run_test(
            "Admin Companies List",
            "GET",
            "admin/companies",
            200
        )
        
        if success and response.get('companies'):
            companies = response['companies']
            print(f"   🏢 Found {len(companies)} companies")
            
            # Store first company for detail test
            if companies:
                self.company_id = companies[0]['id']
                print(f"   🏢 First company: {companies[0]['name']} (ID: {self.company_id})")
        
        return success, response

    def test_admin_companies_filtered(self):
        """Test getting filtered companies"""
        if not self.admin_token:
            print("❌ No admin token available for filtered companies test")
            return False, {}
            
        # Test by type
        success1, response1 = self.run_test(
            "Admin Companies - Corporate Only",
            "GET",
            "admin/companies",
            200,
            params={"type": "corporate"}
        )
        
        # Test by active status
        success2, response2 = self.run_test(
            "Admin Companies - Active Only",
            "GET",
            "admin/companies",
            200,
            params={"active": True}
        )
        
        # Test search
        success3, response3 = self.run_test(
            "Admin Companies - Search",
            "GET",
            "admin/companies",
            200,
            params={"search": "A"}
        )
        
        return success1 and success2 and success3, {}

    def test_admin_company_details(self):
        """Test getting company details"""
        if not self.admin_token:
            print("❌ No admin token available for company details test")
            return False, {}
            
        if not self.company_id:
            print("❌ No company ID available for details test")
            return False, {}
            
        success, response = self.run_test(
            "Admin Company Details",
            "GET",
            f"admin/companies/{self.company_id}/details",
            200
        )
        
        if success and response:
            company = response.get('company', {})
            users = response.get('users', [])
            logs = response.get('recent_logs', [])
            
            print(f"   🏢 Company: {company.get('name')}")
            print(f"   👥 Users: {len(users)}")
            print(f"   📝 Recent Logs: {len(logs)}")
        
        return success, response

    def test_admin_company_update(self):
        """Test updating company details"""
        if not self.admin_token:
            print("❌ No admin token available for company update test")
            return False, {}
            
        if not self.company_id:
            print("❌ No company ID available for update test")
            return False, {}
            
        success, response = self.run_test(
            "Admin Company Update",
            "PUT",
            f"admin/companies/{self.company_id}",
            200,
            data={
                "phone": "+902121234567",
                "address": {"text": "Updated test address"}
            }
        )
        return success, response

    def test_unauthorized_access(self):
        """Test unauthorized access to admin endpoints"""
        # Temporarily remove token
        original_token = self.admin_token
        self.admin_token = None
        
        success1, _ = self.run_test(
            "Unauthorized Dashboard Access",
            "GET",
            "admin/dashboard",
            401
        )
        
        success2, _ = self.run_test(
            "Unauthorized Applications Access",
            "GET",
            "admin/applications",
            401
        )
        
        # Restore token
        self.admin_token = original_token
        
        return success1 and success2, {}

    def test_invalid_token_access(self):
        """Test invalid token access to admin endpoints"""
        # Temporarily set invalid token
        original_token = self.admin_token
        self.admin_token = "invalid.token.here"
        
        success, _ = self.run_test(
            "Invalid Token Dashboard Access",
            "GET",
            "admin/dashboard",
            401
        )
        
        # Restore token
        self.admin_token = original_token
        
        return success, {}

def main():
    print("🚀 Starting Admin API Tests - Master Admin Panel")
    print("=" * 60)
    
    # Setup
    tester = AdminAPITester()

    # Test 1: Admin Login
    print("\n📋 Test 1: Master Admin Login")
    tester.test_admin_login()

    # Test 2: Invalid Admin Login
    print("\n📋 Test 2: Invalid Admin Login")
    tester.test_admin_login_invalid()

    # Test 3: Admin Dashboard
    print("\n📋 Test 3: Admin Dashboard Stats")
    tester.test_admin_dashboard()

    # Test 4: Applications List
    print("\n📋 Test 4: Admin Applications List")
    tester.test_admin_applications_list()

    # Test 5: Filtered Applications
    print("\n📋 Test 5: Filtered Applications")
    tester.test_admin_applications_filtered()

    # Test 6: Application Approval (if pending application exists)
    print("\n📋 Test 6: Application Approval")
    if tester.application_id:
        tester.test_admin_application_approve()
    else:
        print("⚠️  Skipping application approval test - no pending applications found")

    # Test 7: Companies List
    print("\n📋 Test 7: Admin Companies List")
    tester.test_admin_companies_list()

    # Test 8: Filtered Companies
    print("\n📋 Test 8: Filtered Companies")
    tester.test_admin_companies_filtered()

    # Test 9: Company Details
    print("\n📋 Test 9: Company Details")
    if tester.company_id:
        tester.test_admin_company_details()
    else:
        print("⚠️  Skipping company details test - no companies found")

    # Test 10: Company Update
    print("\n📋 Test 10: Company Update")
    if tester.company_id:
        tester.test_admin_company_update()
    else:
        print("⚠️  Skipping company update test - no companies found")

    # Test 11: Unauthorized Access
    print("\n📋 Test 11: Unauthorized Access")
    tester.test_unauthorized_access()

    # Test 12: Invalid Token Access
    print("\n📋 Test 12: Invalid Token Access")
    tester.test_invalid_token_access()

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Admin API Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All admin API tests passed!")
        return 0
    else:
        print("⚠️  Some admin API tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())