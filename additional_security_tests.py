#!/usr/bin/env python3
"""
Additional security tests for individual user login system
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

class SecurityTester:
    def __init__(self):
        backend_url = os.getenv('REACT_APP_BACKEND_URL', 'http://localhost:8001')
        self.base_url = backend_url
        self.api_url = f"{backend_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

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
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)

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

    def test_multi_company_user_login(self):
        """Test user with multiple company memberships"""
        # Test login to first company
        success1, response1 = self.run_test(
            "Multi-Company User Login - Company 1",
            "POST",
            "auth/login",
            200,
            data={
                "phone": "+905553333333",
                "password": "1234",
                "company_type": "corporate",
                "company_id": "test-corp-1"
            }
        )
        
        # Test login to second company
        success2, response2 = self.run_test(
            "Multi-Company User Login - Company 2",
            "POST",
            "auth/login",
            200,
            data={
                "phone": "+905553333333",
                "password": "1234",
                "company_type": "corporate",
                "company_id": "test-corp-2"
            }
        )
        
        return success1 and success2

    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        # Wrong password
        success1, response1 = self.run_test(
            "Login with Wrong Password",
            "POST",
            "auth/login",
            401,
            data={
                "phone": "+905551111111",
                "password": "wrong",
                "company_type": "corporate",
                "company_id": "test-corp-1"
            }
        )
        
        # Non-existent phone
        success2, response2 = self.run_test(
            "Login with Non-existent Phone",
            "POST",
            "auth/login",
            401,
            data={
                "phone": "+905559999999",
                "password": "1234",
                "company_type": "corporate",
                "company_id": "test-corp-1"
            }
        )
        
        return success1 and success2

    def test_crypto_edge_cases(self):
        """Test crypto endpoints with edge cases"""
        # Empty string encryption
        success1, response1 = self.run_test(
            "Encrypt Empty String",
            "POST",
            "crypto/encrypt",
            200,
            data={"id": ""}
        )
        
        # Invalid encrypted data
        success2, response2 = self.run_test(
            "Decrypt Invalid Data",
            "POST",
            "crypto/decrypt",
            500,  # Should fail
            data={"encrypted": "invalid-data"}
        )
        
        # Missing field
        success3, response3 = self.run_test(
            "Decrypt Missing Field",
            "POST",
            "crypto/decrypt",
            400,
            data={}
        )
        
        return success1 and success2 and success3

    def test_session_verification_edge_cases(self):
        """Test session verification with edge cases"""
        # Missing userId
        success1, response1 = self.run_test(
            "Session Verification - Missing userId",
            "POST",
            "auth/verify-session",
            200,  # Returns valid: false
            data={"companyId": "test-corp-1"}
        )
        
        # Missing companyId
        success2, response2 = self.run_test(
            "Session Verification - Missing companyId",
            "POST",
            "auth/verify-session",
            200,  # Returns valid: false
            data={"userId": "test-user-1"}
        )
        
        # Non-existent user
        success3, response3 = self.run_test(
            "Session Verification - Non-existent User",
            "POST",
            "auth/verify-session",
            200,  # Returns valid: false
            data={"userId": "non-existent", "companyId": "test-corp-1"}
        )
        
        # Check that all returned valid: false
        valid1 = response1.get('valid', True) == False if success1 else False
        valid2 = response2.get('valid', True) == False if success2 else False
        valid3 = response3.get('valid', True) == False if success3 else False
        
        return success1 and success2 and success3 and valid1 and valid2 and valid3

    def test_dashboard_access_edge_cases(self):
        """Test dashboard access with edge cases"""
        # Non-existent user
        success1, response1 = self.run_test(
            "Dashboard Access - Non-existent User",
            "GET",
            "individual/test-corp-1/non-existent-user/dashboard",
            404
        )
        
        # Non-existent company
        success2, response2 = self.run_test(
            "Dashboard Access - Non-existent Company",
            "GET",
            "individual/non-existent-company/test-user-1/dashboard",
            404
        )
        
        return success1 and success2

    def test_company_type_mismatch(self):
        """Test login with wrong company type"""
        success, response = self.run_test(
            "Login with Wrong Company Type",
            "POST",
            "auth/login",
            404,  # Company not found
            data={
                "phone": "+905551111111",
                "password": "1234",
                "company_type": "catering",  # Wrong type
                "company_id": "test-corp-1"
            }
        )
        
        return success

    def run_all_tests(self):
        """Run all additional security tests"""
        print("🔒 Starting Additional Security Tests for Individual User Login System")
        print("=" * 80)
        
        print("\n👥 Testing Multi-Company User Access")
        print("-" * 50)
        self.test_multi_company_user_login()
        
        print("\n🚫 Testing Invalid Credentials")
        print("-" * 50)
        self.test_invalid_credentials()
        
        print("\n🔐 Testing Crypto Edge Cases")
        print("-" * 50)
        self.test_crypto_edge_cases()
        
        print("\n🔍 Testing Session Verification Edge Cases")
        print("-" * 50)
        self.test_session_verification_edge_cases()
        
        print("\n📊 Testing Dashboard Access Edge Cases")
        print("-" * 50)
        self.test_dashboard_access_edge_cases()
        
        print("\n🏢 Testing Company Type Mismatch")
        print("-" * 50)
        self.test_company_type_mismatch()
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 ADDITIONAL SECURITY TESTS SUMMARY")
        print("=" * 80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 ALL ADDITIONAL SECURITY TESTS PASSED!")
        else:
            print(f"\n⚠️  {self.tests_run - self.tests_passed} tests failed.")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = SecurityTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)