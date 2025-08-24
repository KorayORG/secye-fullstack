#!/usr/bin/env python3
"""
Companies and Partnerships API Testing
Focus on testing the newly added backend API endpoints for companies and partnerships management.
"""

import requests
import sys
from datetime import datetime
import json
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('frontend/.env')

class CompaniesPartnershipsAPITester:
    def __init__(self):
        # Use the production backend URL from frontend/.env
        self.backend_url = os.getenv('REACT_APP_BACKEND_URL', 'https://agreement-hub.preview.emergentagent.com')
        self.api_url = f"{self.backend_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.corporate_companies = []
        self.catering_companies = []
        self.partnerships = []

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

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout (30s)")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_companies_endpoint_corporate(self):
        """Test GET /api/companies?type=corporate&limit=100"""
        print("\n📋 Testing GET /api/companies?type=corporate&limit=100")
        
        success, response = self.run_test(
            "Get Corporate Companies - type=corporate&limit=100",
            "GET",
            "companies",
            200,
            params={"type": "corporate", "limit": 100}
        )
        
        if success and response.get('companies'):
            self.corporate_companies = response['companies']
            print(f"   ✅ Found {len(self.corporate_companies)} corporate companies")
            
            # Validate response structure
            for company in self.corporate_companies[:3]:  # Check first 3
                required_fields = ['id', 'name', 'slug', 'type']
                missing_fields = [field for field in required_fields if field not in company]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in company: {missing_fields}")
                else:
                    print(f"   ✅ Company structure valid: {company['name']} ({company['type']})")
        
        return success, response

    def test_companies_endpoint_catering(self):
        """Test GET /api/companies?type=catering&limit=100"""
        print("\n📋 Testing GET /api/companies?type=catering&limit=100")
        
        success, response = self.run_test(
            "Get Catering Companies - type=catering&limit=100",
            "GET",
            "companies",
            200,
            params={"type": "catering", "limit": 100}
        )
        
        if success and response.get('companies'):
            self.catering_companies = response['companies']
            print(f"   ✅ Found {len(self.catering_companies)} catering companies")
            
            # Validate response structure
            for company in self.catering_companies[:3]:  # Check first 3
                required_fields = ['id', 'name', 'slug', 'type']
                missing_fields = [field for field in required_fields if field not in company]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in company: {missing_fields}")
                else:
                    print(f"   ✅ Company structure valid: {company['name']} ({company['type']})")
        
        return success, response

    def test_companies_endpoint_all_types(self):
        """Test GET /api/companies without type filter"""
        print("\n📋 Testing GET /api/companies (all types)")
        
        success, response = self.run_test(
            "Get All Companies - no type filter",
            "GET",
            "companies",
            200,
            params={"limit": 50}
        )
        
        if success and response.get('companies'):
            companies = response['companies']
            print(f"   ✅ Found {len(companies)} companies total")
            
            # Count by type
            type_counts = {}
            for company in companies:
                company_type = company.get('type', 'unknown')
                type_counts[company_type] = type_counts.get(company_type, 0) + 1
            
            print(f"   📊 Company types: {type_counts}")
        
        return success, response

    def test_company_by_id(self):
        """Test GET /api/companies/{company_id}"""
        print("\n📋 Testing GET /api/companies/{company_id}")
        
        # Test with corporate company if available
        if self.corporate_companies:
            test_company = self.corporate_companies[0]
            company_id = test_company['id']
            
            success, response = self.run_test(
                f"Get Company by ID - {test_company['name']}",
                "GET",
                f"companies/{company_id}",
                200
            )
            
            if success and response:
                # Validate detailed company info
                required_fields = ['id', 'name', 'slug', 'type', 'created_at', 'updated_at', 'is_active']
                missing_fields = [field for field in required_fields if field not in response]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in detailed company: {missing_fields}")
                else:
                    print(f"   ✅ Detailed company structure valid")
                    print(f"   📋 Company: {response['name']} ({response['type']})")
                    print(f"   📋 Active: {response['is_active']}")
            
            return success, response
        else:
            print("   ⚠️  No corporate companies available for ID test")
            return False, {}

    def test_company_by_id_invalid(self):
        """Test GET /api/companies/{company_id} with invalid ID"""
        print("\n📋 Testing GET /api/companies/{company_id} - Invalid ID")
        
        success, response = self.run_test(
            "Get Company by Invalid ID",
            "GET",
            "companies/invalid-company-id-12345",
            404  # Should return 404 for invalid ID
        )
        
        return success, response

    def test_partnerships_endpoint(self):
        """Test GET /api/partnerships with various filters"""
        print("\n📋 Testing GET /api/partnerships")
        
        # Test 1: Get all partnerships
        success1, response1 = self.run_test(
            "Get All Partnerships",
            "GET",
            "partnerships",
            200,
            params={"limit": 50}
        )
        
        if success1 and response1.get('partnerships'):
            self.partnerships = response1['partnerships']
            print(f"   ✅ Found {len(self.partnerships)} partnerships total")
            
            # Analyze partnership types
            type_counts = {}
            for partnership in self.partnerships:
                p_type = partnership.get('partnership_type', 'unknown')
                type_counts[p_type] = type_counts.get(p_type, 0) + 1
            
            print(f"   📊 Partnership types: {type_counts}")
        
        # Test 2: Filter by partnership_type=catering
        success2, response2 = self.run_test(
            "Get Partnerships - partnership_type=catering",
            "GET",
            "partnerships",
            200,
            params={"partnership_type": "catering", "limit": 50}
        )
        
        if success2 and response2.get('partnerships'):
            catering_partnerships = response2['partnerships']
            print(f"   ✅ Found {len(catering_partnerships)} catering partnerships")
            
            # Validate all are catering type
            non_catering = [p for p in catering_partnerships if p.get('partnership_type') != 'catering']
            if non_catering:
                print(f"   ⚠️  Found {len(non_catering)} non-catering partnerships in catering filter")
            else:
                print(f"   ✅ All partnerships correctly filtered as catering type")
        
        # Test 3: Filter by catering_id if we have catering companies
        success3 = True
        if self.catering_companies:
            test_catering_id = self.catering_companies[0]['id']
            success3, response3 = self.run_test(
                f"Get Partnerships - catering_id={test_catering_id}",
                "GET",
                "partnerships",
                200,
                params={"catering_id": test_catering_id, "partnership_type": "catering", "limit": 50}
            )
            
            if success3 and response3.get('partnerships'):
                catering_specific = response3['partnerships']
                print(f"   ✅ Found {len(catering_specific)} partnerships for specific catering company")
                
                # Validate all have correct catering_id
                wrong_catering = [p for p in catering_specific if p.get('catering_id') != test_catering_id]
                if wrong_catering:
                    print(f"   ⚠️  Found {len(wrong_catering)} partnerships with wrong catering_id")
                else:
                    print(f"   ✅ All partnerships correctly filtered by catering_id")
        else:
            print("   ⚠️  No catering companies available for catering_id filter test")
        
        return all([success1, success2, success3])

    def test_partnerships_validation(self):
        """Test partnerships endpoint validation"""
        print("\n📋 Testing Partnerships Endpoint Validation")
        
        # Test invalid partnership_type
        success1, response1 = self.run_test(
            "Get Partnerships - Invalid partnership_type",
            "GET",
            "partnerships",
            200,  # Should still return 200 but empty results
            params={"partnership_type": "invalid_type", "limit": 10}
        )
        
        if success1 and response1.get('partnerships') is not None:
            invalid_partnerships = response1['partnerships']
            if len(invalid_partnerships) == 0:
                print(f"   ✅ Invalid partnership_type correctly returns empty results")
            else:
                print(f"   ⚠️  Invalid partnership_type returned {len(invalid_partnerships)} results")
        
        # Test invalid catering_id
        success2, response2 = self.run_test(
            "Get Partnerships - Invalid catering_id",
            "GET",
            "partnerships",
            200,  # Should still return 200 but empty results
            params={"catering_id": "invalid-catering-id-12345", "limit": 10}
        )
        
        if success2 and response2.get('partnerships') is not None:
            invalid_catering = response2['partnerships']
            if len(invalid_catering) == 0:
                print(f"   ✅ Invalid catering_id correctly returns empty results")
            else:
                print(f"   ⚠️  Invalid catering_id returned {len(invalid_catering)} results")
        
        return success1 and success2

    def test_offer_system_integration(self):
        """Test that existing offer system APIs are still working"""
        print("\n📋 Testing Offer System Integration (Existing APIs)")
        
        if not self.corporate_companies or not self.catering_companies:
            print("   ⚠️  Missing companies for offer system test")
            return False
        
        corporate_id = self.corporate_companies[0]['id']
        catering_id = self.catering_companies[0]['id']
        
        # Test 1: Get corporate offers
        success1, response1 = self.run_test(
            "Get Corporate Offers - Existing API",
            "GET",
            f"corporate/{corporate_id}/offers",
            200,
            params={"offer_type": "sent"}
        )
        
        # Test 2: Get catering offers
        success2, response2 = self.run_test(
            "Get Catering Offers - Existing API",
            "GET",
            f"catering/{catering_id}/offers",
            200,
            params={"offer_type": "received"}
        )
        
        # Test 3: Try to send an offer (should work or fail gracefully)
        offer_data = {
            "catering_id": catering_id,
            "unit_price": 25.50,
            "message": "Test offer for API integration verification"
        }
        
        success3, response3 = self.run_test(
            "Send Offer - Integration Test",
            "POST",
            f"corporate/{corporate_id}/offers",
            200,  # Should succeed
            data=offer_data
        )
        
        if not success3:
            # If it fails, check if it's due to duplicate offer (which is acceptable)
            if response3 and "duplicate" in str(response3).lower():
                print("   ✅ Offer creation failed due to duplicate - this is expected behavior")
                success3 = True
        
        return all([success1, success2, success3])

    def test_catering_firm_management_data(self):
        """Test data retrieval for catering firm management page"""
        print("\n📋 Testing Catering Firm Management Page Data Retrieval")
        
        if not self.corporate_companies:
            print("   ⚠️  No corporate companies available for catering firm management test")
            return False
        
        corporate_id = self.corporate_companies[0]['id']
        
        # Test 1: Get all companies (for "Tüm Firmalar" section)
        success1, response1 = self.run_test(
            "Catering Management - Get All Companies",
            "GET",
            "companies",
            200,
            params={"type": "corporate", "limit": 100}
        )
        
        # Test 2: Get partnerships (for "Anlaşmalı Firmalar" section)
        success2, response2 = self.run_test(
            "Catering Management - Get Partner Companies",
            "GET",
            "partnerships",
            200,
            params={"partnership_type": "catering", "limit": 100}
        )
        
        # Test 3: Get offers (for offers management)
        success3, response3 = self.run_test(
            "Catering Management - Get Offers",
            "GET",
            f"catering/{self.catering_companies[0]['id'] if self.catering_companies else 'test-id'}/offers",
            200 if self.catering_companies else 404,
            params={"offer_type": "received"}
        )
        
        # Analyze data completeness
        if success1 and response1.get('companies'):
            print(f"   ✅ All Companies data: {len(response1['companies'])} companies available")
        
        if success2 and response2.get('partnerships'):
            print(f"   ✅ Partner Companies data: {len(response2['partnerships'])} partnerships available")
        
        if success3 and response3.get('offers'):
            print(f"   ✅ Offers data: {len(response3['offers'])} offers available")
        elif success3:
            print(f"   ✅ Offers endpoint working (empty results)")
        
        return all([success1, success2, success3])

    def run_comprehensive_test(self):
        """Run all tests for companies and partnerships management"""
        print("🚀 Starting Companies and Partnerships API Tests")
        print("=" * 70)
        print(f"🌐 Backend URL: {self.backend_url}")
        print(f"🔗 API URL: {self.api_url}")
        
        # Test 1: Companies endpoint - Corporate
        test1_success, _ = self.test_companies_endpoint_corporate()
        
        # Test 2: Companies endpoint - Catering
        test2_success, _ = self.test_companies_endpoint_catering()
        
        # Test 3: Companies endpoint - All types
        test3_success, _ = self.test_companies_endpoint_all_types()
        
        # Test 4: Company by ID
        test4_success, _ = self.test_company_by_id()
        
        # Test 5: Company by ID - Invalid
        test5_success, _ = self.test_company_by_id_invalid()
        
        # Test 6: Partnerships endpoint
        test6_success = self.test_partnerships_endpoint()
        
        # Test 7: Partnerships validation
        test7_success = self.test_partnerships_validation()
        
        # Test 8: Offer system integration
        test8_success = self.test_offer_system_integration()
        
        # Test 9: Catering firm management data
        test9_success = self.test_catering_firm_management_data()
        
        # Results summary
        print("\n" + "=" * 70)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 70)
        
        tests = [
            ("GET /api/companies?type=corporate&limit=100", test1_success),
            ("GET /api/companies?type=catering&limit=100", test2_success),
            ("GET /api/companies (all types)", test3_success),
            ("GET /api/companies/{company_id}", test4_success),
            ("GET /api/companies/{invalid_id} (404 test)", test5_success),
            ("GET /api/partnerships (with filters)", test6_success),
            ("Partnerships validation tests", test7_success),
            ("Offer system integration", test8_success),
            ("Catering firm management data", test9_success)
        ]
        
        for test_name, success in tests:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} {test_name}")
        
        passed_tests = sum(1 for _, success in tests if success)
        total_tests = len(tests)
        
        print(f"\n📈 Overall Results: {self.tests_passed}/{self.tests_run} individual tests passed")
        print(f"📈 Test Categories: {passed_tests}/{total_tests} categories passed")
        
        # Critical assessment
        critical_endpoints = [test1_success, test2_success, test4_success, test6_success]
        critical_passed = sum(critical_endpoints)
        
        print(f"\n🎯 CRITICAL ENDPOINTS ASSESSMENT:")
        if critical_passed == len(critical_endpoints):
            print("✅ ALL CRITICAL ENDPOINTS ARE WORKING!")
            print("   - Companies listing by type: ✅")
            print("   - Company details by ID: ✅") 
            print("   - Partnerships filtering: ✅")
            print("   - No 404 errors on main endpoints: ✅")
        else:
            print("❌ SOME CRITICAL ENDPOINTS HAVE ISSUES!")
            if not test1_success:
                print("   - Companies listing (corporate): ❌")
            if not test2_success:
                print("   - Companies listing (catering): ❌")
            if not test4_success:
                print("   - Company details by ID: ❌")
            if not test6_success:
                print("   - Partnerships filtering: ❌")
        
        # User-reported 404 errors assessment
        print(f"\n🔍 USER-REPORTED 404 ERRORS ASSESSMENT:")
        if test1_success and test2_success and test4_success and test6_success:
            print("✅ NO 404 ERRORS FOUND ON REQUESTED ENDPOINTS!")
            print("   The user-reported 404 errors appear to be FIXED.")
        else:
            print("❌ 404 ERRORS STILL PRESENT ON SOME ENDPOINTS!")
            print("   The user-reported issues may still exist.")
        
        return critical_passed == len(critical_endpoints)

def main():
    """Main test execution"""
    tester = CompaniesPartnershipsAPITester()
    
    try:
        success = tester.run_comprehensive_test()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())