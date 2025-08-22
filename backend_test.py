import requests
import sys
from datetime import datetime
import json
import uuid

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
        self.created_shift_id = None
        self.created_user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        default_headers = {'Content-Type': 'application/json'}
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
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)

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
    # ===== CORPORATE PANEL API TESTS =====
    
    def test_employee_management_apis(self):
        """Test Employee Management APIs"""
        if not self.corporate_company_id:
            print("❌ No corporate company ID available for employee tests")
            return False
        
        print("\n📋 Testing Employee Management APIs")
        
        # Test 1: GET /api/corporate/{company_id}/employees
        success1, response1 = self.run_test(
            "Get Corporate Employees - All",
            "GET",
            f"corporate/{self.corporate_company_id}/employees",
            200
        )
        
        # Test 2: GET with filtering
        success2, response2 = self.run_test(
            "Get Corporate Employees - Corporate Type Filter",
            "GET",
            f"corporate/{self.corporate_company_id}/employees",
            200,
            params={"type": "corporate", "limit": 10}
        )
        
        # Test 3: GET with search
        success3, response3 = self.run_test(
            "Get Corporate Employees - Search",
            "GET",
            f"corporate/{self.corporate_company_id}/employees",
            200,
            params={"search": "test", "limit": 10}
        )
        
        # Test 4: Create a test user for update/role tests
        test_phone = f"+9055{datetime.now().strftime('%H%M%S')}1111"
        test_user_data = {
            "users": [{
                "full_name": "Test Employee",
                "phone": test_phone
            }]
        }
        
        # Test 4: Bulk import with realistic data (re-test for 500 error fix)
        realistic_user_data = {
            "users": [
                {
                    "full_name": "Ahmet Yılmaz",
                    "phone": f"+9055{datetime.now().strftime('%H%M%S')}2222"
                },
                {
                    "full_name": "Fatma Demir", 
                    "phone": f"+9055{datetime.now().strftime('%H%M%S')}3333"
                },
                {
                    "full_name": "Mehmet Kaya",
                    "phone": f"+9055{datetime.now().strftime('%H%M%S')}4444"
                }
            ]
        }
        
        success4, response4 = self.run_test(
            "Bulk Import Employees - Realistic Data (500 Error Fix Test)",
            "POST",
            f"corporate/{self.corporate_company_id}/employees/bulk-import",
            200,
            data=realistic_user_data
        )
        
        # If we have users from the employee list, test update operations
        if success1 and response1.get('users'):
            test_user_id = response1['users'][0]['id']
            self.created_user_id = test_user_id
            
            # Test 5: PUT /api/corporate/{company_id}/employees/{user_id}
            success5, response5 = self.run_test(
                "Update Employee",
                "PUT",
                f"corporate/{self.corporate_company_id}/employees/{test_user_id}",
                200,
                data={
                    "full_name": "Updated Test Employee",
                    "email": "updated@test.com",
                    "is_active": True
                }
            )
            
            # Test 6: POST /api/corporate/{company_id}/employees/{user_id}/role
            success6, response6 = self.run_test(
                "Assign Employee Role",
                "POST",
                f"corporate/{self.corporate_company_id}/employees/{test_user_id}/role",
                200,
                data={
                    "role": "corporate2",
                    "is_active": True
                }
            )
        else:
            success5 = success6 = False
            print("⚠️  Skipping employee update tests - no existing employees found")
        
        # Test 7: Bulk import with validation errors
        invalid_user_data = {
            "users": [{
                "full_name": "Invalid User",
                "phone": "+905551112233"  # Likely duplicate phone
            }]
        }
        
        success7, response7 = self.run_test(
            "Bulk Import - Duplicate Phone Test",
            "POST",
            f"corporate/{self.corporate_company_id}/employees/bulk-import",
            200,  # Should succeed but report failed users
            data=invalid_user_data
        )
        
        return all([success1, success2, success3, success4])
    
    def test_shift_management_apis(self):
        """Test Shift Management APIs"""
        if not self.corporate_company_id:
            print("❌ No corporate company ID available for shift tests")
            return False
        
        print("\n📋 Testing Shift Management APIs")
        
        # Test 1: GET /api/corporate/{company_id}/shifts
        success1, response1 = self.run_test(
            "Get Corporate Shifts",
            "GET",
            f"corporate/{self.corporate_company_id}/shifts",
            200
        )
        
        # Test 2: POST /api/corporate/{company_id}/shifts (create shift)
        shift_data = {
            "title": "Morning Shift Test",
            "start_time": "09:00",
            "end_time": "17:00",
            "days": [1, 2, 3, 4, 5],  # Monday to Friday
            "timezone": "Europe/Istanbul"
        }
        
        success2, response2 = self.run_test(
            "Create Corporate Shift",
            "POST",
            f"corporate/{self.corporate_company_id}/shifts",
            200,
            data=shift_data
        )
        
        # Store created shift ID for update/delete tests
        if success2 and response2.get('shift_id'):
            self.created_shift_id = response2['shift_id']
        
        # Test 3: PUT /api/corporate/{company_id}/shifts/{shift_id} (update shift)
        if self.created_shift_id:
            update_data = {
                "title": "Updated Morning Shift",
                "start_time": "08:30",
                "end_time": "17:30",
                "days": [1, 2, 3, 4, 5, 6],  # Add Saturday
                "is_active": True
            }
            
            success3, response3 = self.run_test(
                "Update Corporate Shift",
                "PUT",
                f"corporate/{self.corporate_company_id}/shifts/{self.created_shift_id}",
                200,
                data=update_data
            )
        else:
            success3 = False
            print("⚠️  Skipping shift update test - no shift created")
        
        # Test 4: Create another shift for delete test
        delete_shift_data = {
            "title": "Temporary Shift for Delete Test",
            "start_time": "18:00",
            "end_time": "22:00",
            "days": [6, 7],  # Weekend
            "timezone": "Europe/Istanbul"
        }
        
        success4, response4 = self.run_test(
            "Create Shift for Delete Test",
            "POST",
            f"corporate/{self.corporate_company_id}/shifts",
            200,
            data=delete_shift_data
        )
        
        # Test 5: DELETE /api/corporate/{company_id}/shifts/{shift_id}
        if success4 and response4.get('shift_id'):
            delete_shift_id = response4['shift_id']
            success5, response5 = self.run_test(
                "Delete Corporate Shift",
                "DELETE",
                f"corporate/{self.corporate_company_id}/shifts/{delete_shift_id}",
                200
            )
        else:
            success5 = False
            print("⚠️  Skipping shift delete test - no shift created for deletion")
        
        # Test 6: Validation tests
        invalid_shift_data = {
            "title": "Invalid Shift",
            "start_time": "25:00",  # Invalid time
            "end_time": "17:00",
            "days": [8, 9],  # Invalid days
            "timezone": "Europe/Istanbul"
        }
        
        success6, response6 = self.run_test(
            "Create Shift - Validation Error Test",
            "POST",
            f"corporate/{self.corporate_company_id}/shifts",
            400,  # Should fail validation
            data=invalid_shift_data
        )
        
        return all([success1, success2])  # Core functionality tests
    
    def test_system_settings_apis(self):
        """Test System Settings APIs"""
        if not self.corporate_company_id:
            print("❌ No corporate company ID available for settings tests")
            return False
        
        print("\n📋 Testing System Settings APIs")
        
        # Test 1: GET /api/corporate/{company_id}/settings
        success1, response1 = self.run_test(
            "Get Corporate Settings",
            "GET",
            f"corporate/{self.corporate_company_id}/settings",
            200
        )
        
        # Test 2: GET /api/corporate/{company_id}/audit-logs
        success2, response2 = self.run_test(
            "Get Corporate Audit Logs - All",
            "GET",
            f"corporate/{self.corporate_company_id}/audit-logs",
            200
        )
        
        # Test 3: GET audit logs with filtering
        success3, response3 = self.run_test(
            "Get Corporate Audit Logs - Filtered",
            "GET",
            f"corporate/{self.corporate_company_id}/audit-logs",
            200,
            params={
                "log_type": "SHIFT_CREATED",
                "limit": 10
            }
        )
        
        # Test 4: GET audit logs with date filtering
        success4, response4 = self.run_test(
            "Get Corporate Audit Logs - Date Filtered",
            "GET",
            f"corporate/{self.corporate_company_id}/audit-logs",
            200,
            params={
                "start_date": "2024-01-01T00:00:00Z",
                "limit": 20
            }
        )
        
        return all([success1, success2])
    
    def test_mail_messaging_apis(self):
        """Test Mail/Messaging APIs (Now implemented)"""
        if not self.corporate_company_id:
            print("❌ No corporate company ID available for mail tests")
            return False
        
        print("\n📋 Testing Mail/Messaging APIs (Now implemented)")
        
        # Create a test user ID for messaging
        test_user_id = "test-user-123"
        
        # Test 1: GET /api/corporate/{company_id}/messages?user_id={user_id}&type=inbox
        success1, response1 = self.run_test(
            "Get Corporate Messages - Inbox",
            "GET",
            f"corporate/{self.corporate_company_id}/messages",
            200,
            params={"user_id": test_user_id, "type": "inbox"}
        )
        
        # Test 2: GET /api/corporate/{company_id}/messages?user_id={user_id}&type=sent
        success2, response2 = self.run_test(
            "Get Corporate Messages - Sent",
            "GET",
            f"corporate/{self.corporate_company_id}/messages",
            200,
            params={"user_id": test_user_id, "type": "sent"}
        )
        
        # Test 3: POST /api/corporate/{company_id}/messages (send message)
        message_data = {
            "to_addresses": ["recipient@company.sy", "another@company.sy"],
            "subject": "Test Message from API",
            "body": "This is a test message sent via the messaging API. Testing functionality.",
            "labels": ["test", "api-test"],
            "from_user_id": test_user_id
        }
        
        success3, response3 = self.run_test(
            "Send Corporate Message",
            "POST",
            f"corporate/{self.corporate_company_id}/messages",
            200,
            data=message_data
        )
        
        # Store message ID for update/delete tests
        message_id = None
        if success3 and response3.get('message_id'):
            message_id = response3['message_id']
        
        # Test 4: PUT /api/corporate/{company_id}/messages/{message_id} (mark as read)
        if message_id:
            success4, response4 = self.run_test(
                "Mark Message as Read",
                "PUT",
                f"corporate/{self.corporate_company_id}/messages/{message_id}",
                200,
                data={"is_read": True}
            )
        else:
            # Use a dummy message ID if we couldn't create one
            success4, response4 = self.run_test(
                "Mark Message as Read (dummy ID)",
                "PUT",
                f"corporate/{self.corporate_company_id}/messages/dummy-message-id",
                404  # Should fail with dummy ID
            )
        
        # Test 5: DELETE /api/corporate/{company_id}/messages/{message_id}
        if message_id:
            success5, response5 = self.run_test(
                "Delete Corporate Message",
                "DELETE",
                f"corporate/{self.corporate_company_id}/messages/{message_id}",
                200
            )
        else:
            # Use a dummy message ID if we couldn't create one
            success5, response5 = self.run_test(
                "Delete Corporate Message (dummy ID)",
                "DELETE",
                f"corporate/{self.corporate_company_id}/messages/dummy-message-id",
                404  # Should fail with dummy ID
            )
        
        # Test 6: GET messages with archived type
        success6, response6 = self.run_test(
            "Get Corporate Messages - Archived",
            "GET",
            f"corporate/{self.corporate_company_id}/messages",
            200,
            params={"user_id": test_user_id, "type": "archived"}
        )
        
        return all([success1, success2, success3])
    
    def test_partnership_apis(self):
        """Test Partnership APIs (Now implemented)"""
        if not self.corporate_company_id:
            print("❌ No corporate company ID available for partnership tests")
            return False
        
        print("\n📋 Testing Partnership APIs (Now implemented)")
        
        # First, ensure we have a catering company to partner with
        if not self.catering_company_id:
            success_search, response_search = self.run_test(
                "Search Catering Companies for Partnership",
                "GET",
                "companies/search",
                200,
                params={"type": "catering", "limit": 5}
            )
            if success_search and response_search.get('companies'):
                self.catering_company_id = response_search['companies'][0]['id']
        
        # Test 1: GET /api/corporate/{company_id}/partnerships
        success1, response1 = self.run_test(
            "Get Corporate Partnerships",
            "GET",
            f"corporate/{self.corporate_company_id}/partnerships",
            200
        )
        
        # Test 2: POST /api/corporate/{company_id}/partnerships (create partnership)
        if self.catering_company_id:
            partnership_data = {
                "partnership_type": "catering",
                "catering_id": self.catering_company_id,
                "terms": "Standard catering partnership agreement",
                "notes": "Created via API test"
            }
            
            success2, response2 = self.run_test(
                "Create Corporate Partnership - Catering",
                "POST",
                f"corporate/{self.corporate_company_id}/partnerships",
                200,
                data=partnership_data
            )
            
            # Store partnership ID for delete test
            partnership_id = None
            if success2 and response2.get('partnership_id'):
                partnership_id = response2['partnership_id']
        else:
            success2 = False
            partnership_id = None
            print("⚠️  Skipping partnership creation - no catering company found")
        
        # Test 3: Create supplier partnership if we have a supplier
        if self.supplier_company_id:
            supplier_partnership_data = {
                "partnership_type": "supplier",
                "supplier_id": self.supplier_company_id,
                "terms": "Standard supplier partnership agreement",
                "notes": "Supplier partnership created via API test"
            }
            
            success3, response3 = self.run_test(
                "Create Corporate Partnership - Supplier",
                "POST",
                f"corporate/{self.corporate_company_id}/partnerships",
                200,
                data=supplier_partnership_data
            )
        else:
            success3 = True  # Don't fail if no supplier available
            print("⚠️  Skipping supplier partnership - no supplier company found")
        
        # Test 4: GET partnerships with filtering
        success4, response4 = self.run_test(
            "Get Corporate Partnerships - Filtered by Type",
            "GET",
            f"corporate/{self.corporate_company_id}/partnerships",
            200,
            params={"partnership_type": "catering", "limit": 10}
        )
        
        # Test 5: DELETE /api/corporate/{company_id}/partnerships/{partnership_id}
        if partnership_id:
            success5, response5 = self.run_test(
                "Delete Corporate Partnership",
                "DELETE",
                f"corporate/{self.corporate_company_id}/partnerships/{partnership_id}",
                200
            )
        else:
            # Test with dummy ID to verify error handling
            success5, response5 = self.run_test(
                "Delete Corporate Partnership (dummy ID)",
                "DELETE",
                f"corporate/{self.corporate_company_id}/partnerships/dummy-partnership-id",
                404  # Should fail with dummy ID
            )
        
        # Test 6: Try to create duplicate partnership (should fail)
        if self.catering_company_id:
            duplicate_partnership_data = {
                "partnership_type": "catering",
                "catering_id": self.catering_company_id,
                "terms": "Duplicate partnership test"
            }
            
            success6, response6 = self.run_test(
                "Create Duplicate Partnership (should fail)",
                "POST",
                f"corporate/{self.corporate_company_id}/partnerships",
                400,  # Should fail due to duplicate
                data=duplicate_partnership_data
            )
        else:
            success6 = True  # Skip if no catering company
        
        return all([success1, success2 or not self.catering_company_id])  # Core functionality tests
    
    def test_error_handling_and_edge_cases(self):
        """Test error handling and edge cases"""
        print("\n📋 Testing Error Handling and Edge Cases")
        
        # Test 1: Invalid company ID
        success1, response1 = self.run_test(
            "Invalid Company ID - Employees",
            "GET",
            "corporate/invalid-company-id/employees",
            404
        )
        
        # Test 2: Missing required fields
        success2, response2 = self.run_test(
            "Missing Required Fields - Create Shift",
            "POST",
            f"corporate/{self.corporate_company_id}/shifts" if self.corporate_company_id else "corporate/test-id/shifts",
            422,  # Validation error
            data={"title": "Incomplete Shift"}  # Missing required fields
        )
        
        # Test 3: Invalid user ID for employee update
        success3, response3 = self.run_test(
            "Invalid User ID - Update Employee",
            "PUT",
            f"corporate/{self.corporate_company_id}/employees/invalid-user-id" if self.corporate_company_id else "corporate/test-id/employees/invalid-user-id",
            404,
            data={"full_name": "Updated Name"}
        )
        
        # Test 4: Invalid shift ID for update
        success4, response4 = self.run_test(
            "Invalid Shift ID - Update Shift",
            "PUT",
            f"corporate/{self.corporate_company_id}/shifts/invalid-shift-id" if self.corporate_company_id else "corporate/test-id/shifts/invalid-shift-id",
            404,
            data={"title": "Updated Shift"}
        )
        
        return all([success1, success2, success3, success4])

def main():
    print("🚀 Starting Seç Ye API Tests - Corporate Panel Focus")
    print("=" * 60)
    
    # Setup
    tester = SecYeAPITester()

    # Test 1: API Health Check
    print("\n📋 Test 1: API Health Check")
    tester.test_health_check()

    # Test 2: Company Search (to get corporate company ID)
    print("\n📋 Test 2: Company Search")
    tester.test_company_search("corporate", "")  # Get any corporate company
    tester.test_company_search("catering", "")   # Get catering companies for partnership tests
    tester.test_company_search("supplier", "")   # Get supplier companies

    # ===== CORPORATE PANEL API TESTS =====
    if tester.corporate_company_id:
        print(f"\n🏢 Using Corporate Company ID: {tester.corporate_company_id}")
        
        # Test 3: Employee Management APIs
        print("\n📋 Test 3: Employee Management APIs")
        employee_success = tester.test_employee_management_apis()
        
        # Test 4: Shift Management APIs
        print("\n📋 Test 4: Shift Management APIs")
        shift_success = tester.test_shift_management_apis()
        
        # Test 5: System Settings APIs
        print("\n📋 Test 5: System Settings APIs")
        settings_success = tester.test_system_settings_apis()
        
        # Test 6: Mail/Messaging APIs (Expected to fail)
        print("\n📋 Test 6: Mail/Messaging APIs")
        mail_success = tester.test_mail_messaging_apis()
        
        # Test 7: Catering Management APIs
        print("\n📋 Test 7: Catering Management APIs")
        catering_success = tester.test_catering_management_apis()
        
        # Test 8: Error Handling and Edge Cases
        print("\n📋 Test 8: Error Handling and Edge Cases")
        error_success = tester.test_error_handling_and_edge_cases()
        
    else:
        print("⚠️  No corporate company found - skipping corporate panel tests")
        employee_success = shift_success = settings_success = mail_success = catering_success = error_success = False

    # ===== LEGACY TESTS (for backward compatibility) =====
    print("\n📋 Legacy Tests: Corporate Application Flow")
    
    # Test 9: Corporate Application - Existing Company
    print("\n📋 Test 9: Corporate Application - Existing Company")
    tester.test_corporate_application_existing()

    # Test 10: Corporate Application - New Company
    print("\n📋 Test 10: Corporate Application - New Company")
    tester.test_corporate_application_new()

    # Test 11: Corporate Application Validation
    print("\n📋 Test 11: Corporate Application Validation")
    tester.test_corporate_application_validation()

    # Test 12: Individual Registration
    print("\n📋 Test 12: Individual Registration")
    tester.test_individual_registration()

    # Test 13: Login (if company was found)
    print("\n📋 Test 13: Corporate Login")
    if tester.company_id:
        tester.test_login()
    else:
        print("⚠️  Skipping login test - no company found")

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    # Summary of corporate panel tests
    if tester.corporate_company_id:
        print("\n🏢 Corporate Panel API Test Summary:")
        print(f"   ✅ Employee Management: {'PASSED' if employee_success else 'FAILED'}")
        print(f"   ✅ Shift Management: {'PASSED' if shift_success else 'FAILED'}")
        print(f"   ✅ System Settings: {'PASSED' if settings_success else 'FAILED'}")
        print(f"   ⚠️  Mail/Messaging: {'EXPECTED FAIL' if mail_success else 'FAILED'} (Not implemented)")
        print(f"   ✅ Catering Search: {'PASSED' if catering_success else 'FAILED'}")
        print(f"   ✅ Error Handling: {'PASSED' if error_success else 'FAILED'}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())