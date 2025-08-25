#!/usr/bin/env python3
"""
Individual User Login System and Encrypted Routing APIs Test Suite

This test suite focuses on testing the new individual user login system with:
1. Login endpoint with proper company membership checking
2. Crypto encrypt/decrypt endpoints
3. Auth/verify-session endpoint
4. Individual user dashboard API
5. Tenant isolation security
"""

import requests
import sys
import json
import uuid
from datetime import datetime
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv('frontend/.env')

class IndividualUserTester:
    def __init__(self):
        # Use the backend URL from frontend/.env
        backend_url = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
        self.base_url = backend_url
        self.api_url = f"{backend_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test data storage
        self.test_user_id = None
        self.test_company_id = None
        self.test_phone = None
        self.test_password = "1234"
        self.encrypted_user_id = None
        self.encrypted_company_id = None
        self.login_redirect_url = None
        
        # Additional test companies for tenant isolation
        self.other_company_id = None
        self.other_user_id = None

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
                response = requests.get(url, headers=default_headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)

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

    def setup_test_data(self):
        """Setup test users and companies for testing"""
        print("\n🔧 Setting up test data...")
        
        # Find a corporate company for testing
        success, response = self.run_test(
            "Find Corporate Company",
            "GET",
            "companies/search",
            200,
            params={"type": "corporate", "limit": 1}
        )
        
        if success and response.get('companies'):
            self.test_company_id = response['companies'][0]['id']
            print(f"   Using company: {response['companies'][0]['name']} (ID: {self.test_company_id})")
        else:
            print("❌ No corporate company found for testing")
            return False
            
        # Find another company for tenant isolation testing
        success, response = self.run_test(
            "Find Another Corporate Company",
            "GET",
            "companies/search",
            200,
            params={"type": "corporate", "limit": 5}
        )
        
        if success and response.get('companies') and len(response['companies']) > 1:
            self.other_company_id = response['companies'][1]['id']
            print(f"   Using other company for isolation test: {response['companies'][1]['name']} (ID: {self.other_company_id})")
        
        # Generate unique test phone number
        timestamp = datetime.now().strftime('%H%M%S')
        self.test_phone = f"+9055{timestamp}1111"
        
        # Create test user with company membership
        test_user_data = {
            "full_name": "Test Individual User",
            "phone": self.test_phone,
            "password": self.test_password,
            "company_type": "corporate",
            "company_id": self.test_company_id
        }
        
        success, response = self.run_test(
            "Create Test Individual User",
            "POST",
            "auth/register/individual",
            200,
            data=test_user_data
        )
        
        if success:
            print("✅ Test user created successfully")
            return True
        else:
            print("❌ Failed to create test user")
            return False

    def test_crypto_encrypt_endpoint(self):
        """Test crypto encryption endpoint"""
        test_id = str(uuid.uuid4())
        
        success, response = self.run_test(
            "Crypto Encrypt Endpoint",
            "POST",
            "crypto/encrypt",
            200,
            data={"id": test_id}
        )
        
        if success and response.get('encrypted'):
            self.encrypted_test_id = response['encrypted']
            print(f"   Encrypted ID: {self.encrypted_test_id}")
            return True, response
        
        return False, {}

    def test_crypto_decrypt_endpoint(self):
        """Test crypto decryption endpoint"""
        if not hasattr(self, 'encrypted_test_id'):
            print("❌ No encrypted ID available for decryption test")
            return False, {}
            
        success, response = self.run_test(
            "Crypto Decrypt Endpoint",
            "POST",
            "crypto/decrypt",
            200,
            data={"encrypted": self.encrypted_test_id}
        )
        
        if success and response.get('decrypted'):
            print(f"   Decrypted ID: {response['decrypted']}")
            return True, response
        
        return False, {}

    def test_individual_login_with_membership_check(self):
        """Test individual user login with proper company membership checking"""
        if not self.test_phone or not self.test_company_id:
            print("❌ Test data not available for login test")
            return False, {}
            
        login_data = {
            "phone": self.test_phone,
            "password": self.test_password,
            "company_type": "corporate",
            "company_id": self.test_company_id
        }
        
        success, response = self.run_test(
            "Individual User Login with Company Membership Check",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success:
            self.test_user_id = response.get('user_id')
            self.login_redirect_url = response.get('redirect_url')
            
            # Extract encrypted IDs from redirect URL
            if self.login_redirect_url:
                url_parts = self.login_redirect_url.strip('/').split('/')
                if len(url_parts) >= 3:
                    self.encrypted_company_id = url_parts[0]
                    self.encrypted_user_id = url_parts[1]
                    print(f"   Encrypted Company ID: {self.encrypted_company_id}")
                    print(f"   Encrypted User ID: {self.encrypted_user_id}")
            
            return True, response
        
        return False, {}

    def test_login_without_company_membership(self):
        """Test login failure when user is not member of requested company"""
        if not self.test_phone or not self.other_company_id:
            print("❌ Test data not available for membership isolation test")
            return False, {}
            
        login_data = {
            "phone": self.test_phone,
            "password": self.test_password,
            "company_type": "corporate",
            "company_id": self.other_company_id  # User is NOT member of this company
        }
        
        success, response = self.run_test(
            "Login Failure - No Company Membership",
            "POST",
            "auth/login",
            403,  # Should fail with forbidden
            data=login_data
        )
        
        return success, response

    def test_session_verification(self):
        """Test auth/verify-session endpoint"""
        if not self.test_user_id or not self.test_company_id:
            print("❌ Test data not available for session verification test")
            return False, {}
            
        session_data = {
            "userId": self.test_user_id,
            "companyId": self.test_company_id
        }
        
        success, response = self.run_test(
            "Session Verification - Valid Session",
            "POST",
            "auth/verify-session",
            200,
            data=session_data
        )
        
        if success and response.get('valid') == True:
            print("✅ Session verification passed")
            return True, response
        else:
            print("❌ Session verification failed")
            return False, {}

    def test_session_verification_invalid_company(self):
        """Test session verification fails for invalid company"""
        if not self.test_user_id or not self.other_company_id:
            print("❌ Test data not available for invalid session verification test")
            return False, {}
            
        session_data = {
            "userId": self.test_user_id,
            "companyId": self.other_company_id  # User is NOT member of this company
        }
        
        success, response = self.run_test(
            "Session Verification - Invalid Company",
            "POST",
            "auth/verify-session",
            200,  # Endpoint returns 200 but valid=false
            data=session_data
        )
        
        if success and response.get('valid') == False:
            print("✅ Session verification correctly rejected invalid company")
            return True, response
        else:
            print("❌ Session verification should have failed for invalid company")
            return False, {}

    def test_individual_dashboard_api(self):
        """Test individual user dashboard API"""
        if not self.test_user_id or not self.test_company_id:
            print("❌ Test data not available for dashboard test")
            return False, {}
            
        success, response = self.run_test(
            "Individual User Dashboard API",
            "GET",
            f"individual/{self.test_company_id}/{self.test_user_id}/dashboard",
            200
        )
        
        if success:
            # Verify response structure
            required_fields = ['user', 'company', 'stats', 'recent_activities']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field: {field}")
                    return False, {}
            
            # Verify user data
            if response['user']['id'] != self.test_user_id:
                print(f"❌ User ID mismatch in dashboard response")
                return False, {}
                
            # Verify company data
            if response['company']['id'] != self.test_company_id:
                print(f"❌ Company ID mismatch in dashboard response")
                return False, {}
            
            print("✅ Dashboard API returned correct structure and data")
            return True, response
        
        return False, {}

    def test_dashboard_tenant_isolation(self):
        """Test that user cannot access dashboard for company they're not member of"""
        if not self.test_user_id or not self.other_company_id:
            print("❌ Test data not available for tenant isolation test")
            return False, {}
            
        success, response = self.run_test(
            "Dashboard Tenant Isolation - Should Fail",
            "GET",
            f"individual/{self.other_company_id}/{self.test_user_id}/dashboard",
            403  # Should fail with forbidden
        )
        
        return success, response

    def test_encrypted_url_decryption(self):
        """Test that encrypted URLs can be properly decrypted"""
        if not self.encrypted_user_id or not self.encrypted_company_id:
            print("❌ No encrypted IDs available for decryption test")
            return False, {}
            
        # Test decrypting company ID
        success1, response1 = self.run_test(
            "Decrypt Company ID from URL",
            "POST",
            "crypto/decrypt",
            200,
            data={"encrypted": self.encrypted_company_id}
        )
        
        # Test decrypting user ID
        success2, response2 = self.run_test(
            "Decrypt User ID from URL",
            "POST",
            "crypto/decrypt",
            200,
            data={"encrypted": self.encrypted_user_id}
        )
        
        if success1 and success2:
            decrypted_company_id = response1.get('decrypted')
            decrypted_user_id = response2.get('decrypted')
            
            if decrypted_company_id == self.test_company_id and decrypted_user_id == self.test_user_id:
                print("✅ Encrypted URL parameters correctly decrypted")
                return True, {"company_id": decrypted_company_id, "user_id": decrypted_user_id}
            else:
                print("❌ Decrypted IDs don't match original values")
                return False, {}
        
        return False, {}

    def run_all_tests(self):
        """Run all individual user login system tests"""
        print("🚀 Starting Individual User Login System and Encrypted Routing API Tests")
        print("=" * 80)
        
        # Setup test data
        if not self.setup_test_data():
            print("\n❌ Failed to setup test data. Aborting tests.")
            return
        
        # Test crypto endpoints
        print("\n📊 Testing Crypto Encrypt/Decrypt Endpoints")
        print("-" * 50)
        self.test_crypto_encrypt_endpoint()
        self.test_crypto_decrypt_endpoint()
        
        # Test login system
        print("\n🔐 Testing Individual User Login System")
        print("-" * 50)
        self.test_individual_login_with_membership_check()
        self.test_login_without_company_membership()
        
        # Test session verification
        print("\n🔍 Testing Session Verification")
        print("-" * 50)
        self.test_session_verification()
        self.test_session_verification_invalid_company()
        
        # Test individual dashboard
        print("\n📈 Testing Individual User Dashboard")
        print("-" * 50)
        self.test_individual_dashboard_api()
        self.test_dashboard_tenant_isolation()
        
        # Test encrypted URL handling
        print("\n🔒 Testing Encrypted URL Handling")
        print("-" * 50)
        self.test_encrypted_url_decryption()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 ALL TESTS PASSED! Individual user login system is working correctly.")
        else:
            print(f"\n⚠️  {self.tests_run - self.tests_passed} tests failed. Please review the issues above.")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = IndividualUserTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)