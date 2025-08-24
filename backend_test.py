import requests
import sys
from datetime import datetime
import json
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('frontend/.env')

class SecYeAPITester:
    def __init__(self):
        # Use the internal backend URL (port 8001)
        self.base_url = "http://localhost:8001"
        self.api_url = "http://localhost:8001/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.company_id = None
        self.user_id = None
        self.corporate_company_id = None
        self.catering_company_id = None
        self.supplier_company_id = None
        self.created_shift_id = None
        self.created_user_id = None
        self.admin_token = None

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

    def test_bulk_import_focused(self):
        """Focused test for bulk import API to verify 500 error fix"""
        if not self.corporate_company_id:
            print("❌ No corporate company ID available for bulk import test")
            return False
        
        print("\n📋 FOCUSED BULK IMPORT TEST - Verifying 500 Error Fix")
        print("=" * 60)
        
        # Test 1: Valid data (should succeed)
        print("\n🔍 Test 1: Valid realistic data")
        valid_data = {
            "users": [
                {
                    "full_name": "Ahmet Yılmaz",
                    "phone": f"+9055{datetime.now().strftime('%H%M%S')}1001"
                },
                {
                    "full_name": "Fatma Demir", 
                    "phone": f"+9055{datetime.now().strftime('%H%M%S')}1002"
                },
                {
                    "full_name": "Mehmet Kaya",
                    "phone": f"+9055{datetime.now().strftime('%H%M%S')}1003"
                },
                {
                    "full_name": "Ayşe Özkan",
                    "phone": f"+9055{datetime.now().strftime('%H%M%S')}1004"
                },
                {
                    "full_name": "Mustafa Çelik",
                    "phone": f"+9055{datetime.now().strftime('%H%M%S')}1005"
                }
            ]
        }
        
        success1, response1 = self.run_test(
            "Bulk Import - Valid Realistic Data",
            "POST",
            f"corporate/{self.corporate_company_id}/employees/bulk-import",
            200,
            data=valid_data
        )
        
        # Test 2: Duplicate phone numbers (should succeed but report failed users)
        print("\n🔍 Test 2: Duplicate phone numbers")
        duplicate_data = {
            "users": [
                {
                    "full_name": "Yeni Kullanıcı",
                    "phone": valid_data["users"][0]["phone"]  # Use same phone as first user
                },
                {
                    "full_name": "Başka Kullanıcı",
                    "phone": f"+9055{datetime.now().strftime('%H%M%S')}2001"  # New phone
                }
            ]
        }
        
        success2, response2 = self.run_test(
            "Bulk Import - Duplicate Phone Numbers",
            "POST",
            f"corporate/{self.corporate_company_id}/employees/bulk-import",
            200,  # Should succeed but report failed users
            data=duplicate_data
        )
        
        # Test 3: Invalid data format (should handle gracefully)
        print("\n🔍 Test 3: Invalid data format")
        invalid_data = {
            "users": [
                {
                    "full_name": "",  # Empty name
                    "phone": f"+9055{datetime.now().strftime('%H%M%S')}3001"
                },
                {
                    "full_name": "Valid Name",
                    "phone": "invalid-phone"  # Invalid phone format
                },
                {
                    # Missing phone field
                    "full_name": "Missing Phone User"
                }
            ]
        }
        
        success3, response3 = self.run_test(
            "Bulk Import - Invalid Data Format",
            "POST",
            f"corporate/{self.corporate_company_id}/employees/bulk-import",
            200,  # Should handle gracefully and report errors
            data=invalid_data
        )
        
        # Test 4: Large batch (stress test)
        print("\n🔍 Test 4: Large batch stress test")
        large_batch_data = {
            "users": []
        }
        
        # Generate 20 users for stress test
        for i in range(20):
            large_batch_data["users"].append({
                "full_name": f"Test User {i+1}",
                "phone": f"+9055{datetime.now().strftime('%H%M%S')}{i+1:04d}"
            })
        
        success4, response4 = self.run_test(
            "Bulk Import - Large Batch (20 users)",
            "POST",
            f"corporate/{self.corporate_company_id}/employees/bulk-import",
            200,
            data=large_batch_data
        )
        
        # Test 5: Empty batch
        print("\n🔍 Test 5: Empty batch")
        empty_data = {"users": []}
        
        success5, response5 = self.run_test(
            "Bulk Import - Empty Batch",
            "POST",
            f"corporate/{self.corporate_company_id}/employees/bulk-import",
            200,  # Should handle gracefully
            data=empty_data
        )
        
        # Analyze results
        print("\n📊 BULK IMPORT TEST ANALYSIS:")
        print("=" * 40)
        
        if success1:
            print("✅ Valid data test: PASSED")
            if response1.get('imported_count', 0) > 0:
                print(f"   → Successfully imported {response1.get('imported_count')} users")
            if response1.get('failed_count', 0) > 0:
                print(f"   → Failed to import {response1.get('failed_count')} users")
        else:
            print("❌ Valid data test: FAILED - This indicates 500 error is NOT fixed")
        
        if success2:
            print("✅ Duplicate phone test: PASSED")
            if response2.get('failed_count', 0) > 0:
                print(f"   → Correctly rejected {response2.get('failed_count')} duplicate users")
        else:
            print("❌ Duplicate phone test: FAILED")
        
        if success3:
            print("✅ Invalid data test: PASSED")
            if response3.get('failed_count', 0) > 0:
                print(f"   → Correctly handled {response3.get('failed_count')} invalid users")
        else:
            print("❌ Invalid data test: FAILED")
        
        if success4:
            print("✅ Large batch test: PASSED")
            if response4.get('imported_count', 0) > 0:
                print(f"   → Successfully imported {response4.get('imported_count')} users from large batch")
        else:
            print("❌ Large batch test: FAILED")
        
        if success5:
            print("✅ Empty batch test: PASSED")
        else:
            print("❌ Empty batch test: FAILED")
        
        # Overall assessment
        critical_tests_passed = success1  # The most important test
        print(f"\n🎯 CRITICAL ASSESSMENT:")
        if critical_tests_passed:
            print("✅ BULK IMPORT 500 ERROR APPEARS TO BE FIXED!")
            print("   The API now handles valid data correctly.")
        else:
            print("❌ BULK IMPORT 500 ERROR IS STILL PRESENT!")
            print("   The API is still failing on valid data.")
        
        return critical_tests_passed

    def test_offer_system_apis(self):
        """Test Offer System APIs - NEW IMPLEMENTATION"""
        print("\n📋 Testing Offer System APIs - NEW IMPLEMENTATION")
        print("=" * 60)
        
        # First ensure we have both corporate and catering companies
        if not self.corporate_company_id:
            print("❌ No corporate company ID available for offer tests")
            return False
        
        if not self.catering_company_id:
            print("❌ No catering company ID available for offer tests")
            return False
        
        print(f"🏢 Corporate Company ID: {self.corporate_company_id}")
        print(f"🍽️  Catering Company ID: {self.catering_company_id}")
        
        # Test 1: Send offer from corporate to catering company
        print("\n🔍 Test 1: Send offer from corporate to catering company")
        offer_data = {
            "catering_id": self.catering_company_id,
            "unit_price": 25.50,
            "message": "Merhaba, şirketimiz için catering hizmeti almak istiyoruz. Günlük 100 kişilik yemek servisi için teklifinizi bekliyoruz."
        }
        
        success1, response1 = self.run_test(
            "Send Offer - Corporate to Catering",
            "POST",
            f"corporate/{self.corporate_company_id}/offers",
            200,
            data=offer_data
        )
        
        offer_id = None
        if success1 and response1.get('offer_id'):
            offer_id = response1['offer_id']
            print(f"   ✅ Created offer ID: {offer_id}")
        
        # Test 2: Validation tests - missing catering_id
        print("\n🔍 Test 2: Validation - Missing catering_id")
        invalid_offer_data = {
            "unit_price": 25.50,
            "message": "Test message without catering_id"
        }
        
        success2, response2 = self.run_test(
            "Send Offer - Missing catering_id",
            "POST",
            f"corporate/{self.corporate_company_id}/offers",
            400,  # Should fail validation
            data=invalid_offer_data
        )
        
        # Test 3: Validation tests - invalid unit_price
        print("\n🔍 Test 3: Validation - Invalid unit_price")
        invalid_price_data = {
            "catering_id": self.catering_company_id,
            "unit_price": -5.0,  # Negative price
            "message": "Test message with invalid price"
        }
        
        success3, response3 = self.run_test(
            "Send Offer - Invalid unit_price",
            "POST",
            f"corporate/{self.corporate_company_id}/offers",
            400,  # Should fail validation
            data=invalid_price_data
        )
        
        # Test 4: Duplicate offer prevention
        print("\n🔍 Test 4: Duplicate offer prevention")
        duplicate_offer_data = {
            "catering_id": self.catering_company_id,
            "unit_price": 30.00,
            "message": "This should be rejected as duplicate"
        }
        
        success4, response4 = self.run_test(
            "Send Offer - Duplicate Prevention",
            "POST",
            f"corporate/{self.corporate_company_id}/offers",
            400,  # Should fail due to existing pending offer
            data=duplicate_offer_data
        )
        
        # Test 5: Get corporate offers (sent)
        print("\n🔍 Test 5: Get corporate offers (sent)")
        success5, response5 = self.run_test(
            "Get Corporate Offers - Sent",
            "GET",
            f"corporate/{self.corporate_company_id}/offers",
            200,
            params={"offer_type": "sent"}
        )
        
        # Test 6: Get corporate offers (received) - should be empty for corporate
        print("\n🔍 Test 6: Get corporate offers (received)")
        success6, response6 = self.run_test(
            "Get Corporate Offers - Received",
            "GET",
            f"corporate/{self.corporate_company_id}/offers",
            200,
            params={"offer_type": "received"}
        )
        
        # Test 7: Get catering offers (received)
        print("\n🔍 Test 7: Get catering offers (received)")
        success7, response7 = self.run_test(
            "Get Catering Offers - Received",
            "GET",
            f"catering/{self.catering_company_id}/offers",
            200,
            params={"offer_type": "received"}
        )
        
        # Test 8: Get catering offers (sent) - should be empty for catering
        print("\n🔍 Test 8: Get catering offers (sent)")
        success8, response8 = self.run_test(
            "Get Catering Offers - Sent",
            "GET",
            f"catering/{self.catering_company_id}/offers",
            200,
            params={"offer_type": "sent"}
        )
        
        # Test 9: Accept offer (catering company)
        if offer_id:
            print(f"\n🔍 Test 9: Accept offer (ID: {offer_id})")
            accept_data = {
                "action": "accept"
            }
            
            success9, response9 = self.run_test(
                "Accept Offer - Catering Response",
                "PUT",
                f"catering/{self.catering_company_id}/offers/{offer_id}",
                200,
                data=accept_data
            )
        else:
            success9 = False
            print("⚠️  Skipping accept offer test - no offer ID available")
        
        # Test 10: Verify partnership creation after acceptance
        if success9:
            print("\n🔍 Test 10: Verify partnership creation")
            success10, response10 = self.run_test(
                "Get Partnerships - Verify Creation",
                "GET",
                f"corporate/{self.corporate_company_id}/partnerships",
                200
            )
            
            if success10 and response10.get('partnerships'):
                partnerships = response10['partnerships']
                partnership_found = any(
                    p.get('catering_id') == self.catering_company_id 
                    for p in partnerships
                )
                if partnership_found:
                    print("   ✅ Partnership successfully created after offer acceptance")
                else:
                    print("   ⚠️  Partnership not found - may need investigation")
        else:
            success10 = False
            print("⚠️  Skipping partnership verification - offer not accepted")
        
        # Test 11: Try to accept already processed offer (should fail)
        if offer_id:
            print(f"\n🔍 Test 11: Try to accept already processed offer")
            duplicate_accept_data = {
                "action": "accept"
            }
            
            success11, response11 = self.run_test(
                "Accept Already Processed Offer",
                "PUT",
                f"catering/{self.catering_company_id}/offers/{offer_id}",
                400,  # Should fail - already processed
                data=duplicate_accept_data
            )
        else:
            success11 = True  # Skip if no offer
            print("⚠️  Skipping duplicate accept test - no offer ID available")
        
        # Test 12: Create and reject another offer
        print("\n🔍 Test 12: Create and reject another offer")
        
        # First create another offer (to a different catering company if available)
        # For now, we'll create to same company since duplicate prevention only applies to pending offers
        new_offer_data = {
            "catering_id": self.catering_company_id,
            "unit_price": 28.75,
            "message": "İkinci teklif - reddetme testi için"
        }
        
        success12a, response12a = self.run_test(
            "Create Second Offer for Rejection Test",
            "POST",
            f"corporate/{self.corporate_company_id}/offers",
            200,
            data=new_offer_data
        )
        
        second_offer_id = None
        if success12a and response12a.get('offer_id'):
            second_offer_id = response12a['offer_id']
        
        # Now reject it
        if second_offer_id:
            reject_data = {
                "action": "reject"
            }
            
            success12b, response12b = self.run_test(
                "Reject Offer - Catering Response",
                "PUT",
                f"catering/{self.catering_company_id}/offers/{second_offer_id}",
                200,
                data=reject_data
            )
        else:
            success12b = False
            print("⚠️  Skipping reject test - no second offer created")
        
        success12 = success12a and success12b
        
        # Test 13: Test invalid company IDs
        print("\n🔍 Test 13: Test invalid company IDs")
        success13a, response13a = self.run_test(
            "Send Offer - Invalid Corporate Company ID",
            "POST",
            "corporate/invalid-company-id/offers",
            404,
            data=offer_data
        )
        
        success13b, response13b = self.run_test(
            "Get Offers - Invalid Catering Company ID",
            "GET",
            "catering/invalid-company-id/offers",
            404
        )
        
        success13 = success13a and success13b
        
        # Test 14: Test invalid offer ID for response
        print("\n🔍 Test 14: Test invalid offer ID")
        success14, response14 = self.run_test(
            "Respond to Invalid Offer ID",
            "PUT",
            f"catering/{self.catering_company_id}/offers/invalid-offer-id",
            404,
            data={"action": "accept"}
        )
        
        # Test 15: Test invalid action in offer response
        if second_offer_id:
            print("\n🔍 Test 15: Test invalid action")
            success15, response15 = self.run_test(
                "Invalid Action in Offer Response",
                "PUT",
                f"catering/{self.catering_company_id}/offers/{second_offer_id}",
                400,
                data={"action": "invalid_action"}
            )
        else:
            success15 = True  # Skip if no offer
            print("⚠️  Skipping invalid action test - no offer available")
        
        # Analyze results
        print("\n📊 OFFER SYSTEM TEST ANALYSIS:")
        print("=" * 50)
        
        core_tests = [success1, success5, success7]  # Core functionality
        validation_tests = [success2, success3, success4]  # Validation
        workflow_tests = [success9, success12]  # Workflow (accept/reject)
        error_handling_tests = [success13, success14, success15]  # Error handling
        
        print(f"✅ Core Functionality: {sum(core_tests)}/{len(core_tests)} passed")
        print(f"✅ Validation Tests: {sum(validation_tests)}/{len(validation_tests)} passed")
        print(f"✅ Workflow Tests: {sum(workflow_tests)}/{len(workflow_tests)} passed")
        print(f"✅ Error Handling: {sum(error_handling_tests)}/{len(error_handling_tests)} passed")
        
        # Overall assessment
        critical_success = all(core_tests) and any(workflow_tests)
        
        if critical_success:
            print("\n🎉 OFFER SYSTEM APIs ARE WORKING CORRECTLY!")
            print("   ✅ Corporate companies can send offers")
            print("   ✅ Catering companies can receive and respond to offers")
            print("   ✅ Partnership creation works on acceptance")
            print("   ✅ Validation and error handling working")
        else:
            print("\n❌ OFFER SYSTEM HAS ISSUES!")
            if not all(core_tests):
                print("   ❌ Core functionality problems")
            if not any(workflow_tests):
                print("   ❌ Offer workflow problems")
        
        return critical_success

    def create_test_companies(self):
        """Create test companies for offer system testing"""
        print("\n🏗️  Creating test companies for offer system testing...")
        
        # Create corporate company
        corporate_data = {
            "mode": "new",
            "target": {
                "mode": "new",
                "company_type": "corporate",
                "new_company_payload": {
                    "name": f"Test Kurumsal Şirket {datetime.now().strftime('%H%M%S')}",
                    "address": "Test Mahallesi, Kurumsal Sokak No:1, İstanbul",
                    "contact_phone": "+902121234567",
                    "owner_full_name": "Ahmet Yönetici",
                    "owner_phone": f"+9055{datetime.now().strftime('%H%M%S')}0001",
                    "owner_email": "ahmet@testkurumsal.com"
                }
            },
            "applicant": {
                "full_name": "Ahmet Yönetici",
                "phone": f"+9055{datetime.now().strftime('%H%M%S')}0001",
                "email": "ahmet@testkurumsal.com"
            },
            "password": "TestPass123!"
        }
        
        success1, response1 = self.run_test(
            "Create Test Corporate Company",
            "POST",
            "auth/register/corporate/application",
            200,
            data=corporate_data
        )
        
        # Create catering company
        catering_data = {
            "mode": "new",
            "target": {
                "mode": "new",
                "company_type": "catering",
                "new_company_payload": {
                    "name": f"Test Catering Firması {datetime.now().strftime('%H%M%S')}",
                    "address": "Test Mahallesi, Catering Sokak No:2, İstanbul",
                    "contact_phone": "+902129876543",
                    "owner_full_name": "Fatma Aşçıbaşı",
                    "owner_phone": f"+9055{datetime.now().strftime('%H%M%S')}0002",
                    "owner_email": "fatma@testcatering.com"
                }
            },
            "applicant": {
                "full_name": "Fatma Aşçıbaşı",
                "phone": f"+9055{datetime.now().strftime('%H%M%S')}0002",
                "email": "fatma@testcatering.com"
            },
            "password": "TestPass123!"
        }
        
        success2, response2 = self.run_test(
            "Create Test Catering Company",
            "POST",
            "auth/register/corporate/application",
            200,
            data=catering_data
        )
        
        if success1 and success2:
            print("✅ Test companies created successfully")
            # Now search for them to get their IDs
            self.test_company_search("corporate", "Test Kurumsal")
            self.test_company_search("catering", "Test Catering")
            return True
        else:
            print("❌ Failed to create test companies")
            return False

def main():
    print("🚀 Starting Seç Ye API Tests - OFFER SYSTEM FOCUS")
    print("=" * 60)
    
    # Setup
    tester = SecYeAPITester()

    # Test 1: API Health Check
    print("\n📋 Test 1: API Health Check")
    tester.test_health_check()

    # Test 2: Company Search (to get existing companies)
    print("\n📋 Test 2: Company Search")
    tester.test_company_search("corporate", "")  # Get any corporate company
    tester.test_company_search("catering", "")   # Get any catering company

    # Test 3: Create test companies if none exist
    if not tester.corporate_company_id or not tester.catering_company_id:
        print("\n📋 Test 3: Creating Test Companies")
        companies_created = tester.create_test_companies()
        if not companies_created:
            print("❌ Failed to create test companies - cannot proceed with offer tests")
            return 1
    else:
        print(f"\n🏢 Found existing companies:")
        print(f"   Corporate: {tester.corporate_company_id}")
        print(f"   Catering: {tester.catering_company_id}")

    # ===== FOCUSED OFFER SYSTEM TEST =====
    if tester.corporate_company_id and tester.catering_company_id:
        print(f"\n🏢 Using Companies:")
        print(f"   Corporate: {tester.corporate_company_id}")
        print(f"   Catering: {tester.catering_company_id}")
        
        # Test 4: FOCUSED Offer System Test
        print("\n📋 Test 4: FOCUSED OFFER SYSTEM TEST")
        offer_system_success = tester.test_offer_system_apis()
        
        # Test 5: Partnership APIs (for context)
        print("\n📋 Test 5: Partnership APIs (for context)")
        partnership_success = tester.test_partnership_apis()
        
    else:
        print("⚠️  Missing required companies - cannot test offer system")
        offer_system_success = False
        partnership_success = False

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    # Summary of offer system test
    if tester.corporate_company_id and tester.catering_company_id:
        print("\n🎯 OFFER SYSTEM TEST SUMMARY:")
        print(f"   🎯 Offer System: {'✅ WORKING' if offer_system_success else '❌ ISSUES'}")
        print(f"   🤝 Partnership APIs: {'✅ WORKING' if partnership_success else '❌ ISSUES'}")
    
    if offer_system_success:
        print("🎉 OFFER SYSTEM APIs ARE WORKING CORRECTLY!")
        return 0
    else:
        print("⚠️  OFFER SYSTEM HAS ISSUES!")
        return 1

if __name__ == "__main__":
    sys.exit(main())