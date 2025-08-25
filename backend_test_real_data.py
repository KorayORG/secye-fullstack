import requests
import sys
from datetime import datetime
import json

class RealDataAPITester:
    def __init__(self, base_url="https://order-stats-fix.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.corporate_company_id = None
        self.catering_company_id = None
        self.supplier_company_id = None
        self.test_user_id = None

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

    def test_api_health(self):
        """Test API health check"""
        return self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )

    def collect_company_ids(self):
        """Collect company IDs for different types"""
        print("\n🔍 Collecting Company IDs for Dashboard Tests...")
        
        # Get corporate companies
        success, response = self.run_test(
            "Get Corporate Companies",
            "GET",
            "companies/search",
            200,
            params={"type": "corporate", "limit": 5}
        )
        if success and response.get('companies'):
            self.corporate_company_id = response['companies'][0]['id']
            print(f"   ✅ Corporate Company ID: {self.corporate_company_id}")

        # Get catering companies
        success, response = self.run_test(
            "Get Catering Companies",
            "GET",
            "companies/search",
            200,
            params={"type": "catering", "limit": 5}
        )
        if success and response.get('companies'):
            self.catering_company_id = response['companies'][0]['id']
            print(f"   ✅ Catering Company ID: {self.catering_company_id}")

        # Get supplier companies
        success, response = self.run_test(
            "Get Supplier Companies",
            "GET",
            "companies/search",
            200,
            params={"type": "supplier", "limit": 5}
        )
        if success and response.get('companies'):
            self.supplier_company_id = response['companies'][0]['id']
            print(f"   ✅ Supplier Company ID: {self.supplier_company_id}")

    def test_user_profile_api(self):
        """Test user profile API - NEW REAL DATA API"""
        if not self.corporate_company_id:
            print("❌ No corporate company ID available for user profile test")
            return False, {}
        
        # Use a test user ID - in real scenario this would come from login
        test_user_id = "test-user-id-123"
        
        success, response = self.run_test(
            "User Profile API - Real Database Data",
            "GET",
            "user/profile",
            200,
            params={"user_id": test_user_id, "company_id": self.corporate_company_id}
        )
        
        if success and response:
            # Check for real data indicators (no mock/hardcoded values)
            print("   🔍 Checking for real database data...")
            
            # Check if response contains real user data structure
            expected_fields = ['id', 'full_name', 'phone', 'company', 'role', 'is_active']
            missing_fields = [field for field in expected_fields if field not in response]
            
            if missing_fields:
                print(f"   ⚠️  Missing expected fields: {missing_fields}")
            else:
                print("   ✅ All expected user profile fields present")
                
            # Check for mock data indicators
            mock_indicators = ['mock', 'test', 'placeholder', 'hardcoded', 'fake', 'sample']
            full_name = response.get('full_name', '').lower()
            company_name = response.get('company', {}).get('name', '').lower()
            
            has_mock_data = any(indicator in full_name or indicator in company_name for indicator in mock_indicators)
            if has_mock_data:
                print(f"   ❌ MOCK DATA DETECTED in user profile: {response}")
                return False, response
            else:
                print("   ✅ No mock data indicators found in user profile")
        
        return success, response

    def test_corporate_dashboard_api(self):
        """Test corporate dashboard API - NEW REAL DATA API"""
        if not self.corporate_company_id:
            print("❌ No corporate company ID available for dashboard test")
            return False, {}
        
        success, response = self.run_test(
            "Corporate Dashboard API - Real Database Data",
            "GET",
            f"corporate/{self.corporate_company_id}/dashboard",
            200
        )
        
        if success and response:
            print("   🔍 Checking corporate dashboard for real database data...")
            
            # Check expected dashboard fields
            expected_fields = ['individual_users', 'corporate_users', 'total_preferences', 'active_shifts', 'recent_activities']
            missing_fields = [field for field in expected_fields if field not in response]
            
            if missing_fields:
                print(f"   ⚠️  Missing expected dashboard fields: {missing_fields}")
                return False, response
            else:
                print("   ✅ All expected corporate dashboard fields present")
            
            # Check for realistic data (not obviously mock)
            individual_users = response.get('individual_users', 0)
            corporate_users = response.get('corporate_users', 0)
            
            # Check if numbers are realistic (not obvious test values like 999, 123, etc.)
            if individual_users == 999 or corporate_users == 999:
                print(f"   ❌ MOCK DATA DETECTED: Suspicious test values in dashboard")
                return False, response
            
            print(f"   ✅ Dashboard shows: {individual_users} individual users, {corporate_users} corporate users")
            
            # Check recent activities structure
            recent_activities = response.get('recent_activities', [])
            if isinstance(recent_activities, list):
                print(f"   ✅ Recent activities is a list with {len(recent_activities)} items")
            else:
                print(f"   ❌ Recent activities should be a list, got: {type(recent_activities)}")
                return False, response
        
        return success, response

    def test_catering_dashboard_api(self):
        """Test catering dashboard API - NEW REAL DATA API"""
        if not self.catering_company_id:
            print("❌ No catering company ID available for dashboard test")
            return False, {}
        
        success, response = self.run_test(
            "Catering Dashboard API - Real Database Data",
            "GET",
            f"catering/{self.catering_company_id}/dashboard",
            200
        )
        
        if success and response:
            print("   🔍 Checking catering dashboard for real database data...")
            
            # Check expected dashboard fields
            expected_fields = ['rating', 'served_individuals', 'total_preferences', 'partner_corporates', 'recent_activities']
            missing_fields = [field for field in expected_fields if field not in response]
            
            if missing_fields:
                print(f"   ⚠️  Missing expected dashboard fields: {missing_fields}")
                return False, response
            else:
                print("   ✅ All expected catering dashboard fields present")
            
            # Check for realistic rating (0.0 to 5.0)
            rating = response.get('rating', 0)
            if rating > 5.0 or rating < 0.0:
                print(f"   ❌ Invalid rating value: {rating}")
                return False, response
            
            print(f"   ✅ Catering dashboard shows rating: {rating}")
            
            # Check recent activities structure
            recent_activities = response.get('recent_activities', [])
            if isinstance(recent_activities, list):
                print(f"   ✅ Recent activities is a list with {len(recent_activities)} items")
            else:
                print(f"   ❌ Recent activities should be a list, got: {type(recent_activities)}")
                return False, response
        
        return success, response

    def test_supplier_dashboard_api(self):
        """Test supplier dashboard API - NEW REAL DATA API"""
        if not self.supplier_company_id:
            print("❌ No supplier company ID available for dashboard test")
            return False, {}
        
        success, response = self.run_test(
            "Supplier Dashboard API - Real Database Data",
            "GET",
            f"supplier/{self.supplier_company_id}/dashboard",
            200
        )
        
        if success and response:
            print("   🔍 Checking supplier dashboard for real database data...")
            
            # Check expected dashboard fields
            expected_fields = ['total_orders', 'product_variety', 'recent_orders', 'partner_caterings', 'recent_activities']
            missing_fields = [field for field in expected_fields if field not in response]
            
            if missing_fields:
                print(f"   ⚠️  Missing expected dashboard fields: {missing_fields}")
                return False, response
            else:
                print("   ✅ All expected supplier dashboard fields present")
            
            # Check for realistic numbers
            total_orders = response.get('total_orders', 0)
            product_variety = response.get('product_variety', 0)
            
            print(f"   ✅ Supplier dashboard shows: {total_orders} total orders, {product_variety} products")
            
            # Check recent activities structure
            recent_activities = response.get('recent_activities', [])
            if isinstance(recent_activities, list):
                print(f"   ✅ Recent activities is a list with {len(recent_activities)} items")
            else:
                print(f"   ❌ Recent activities should be a list, got: {type(recent_activities)}")
                return False, response
        
        return success, response

    def test_data_integrity(self):
        """Test that all data comes from database, not hardcoded"""
        print("\n🔍 Testing Data Integrity - No Mock/Hardcoded Data...")
        
        all_tests_passed = True
        
        # Test multiple company searches to ensure variety
        for company_type in ['corporate', 'catering', 'supplier']:
            success, response = self.run_test(
                f"Data Integrity Check - {company_type.title()} Companies",
                "GET",
                "companies/search",
                200,
                params={"type": company_type, "limit": 10}
            )
            
            if success and response.get('companies'):
                companies = response['companies']
                company_names = [c.get('name', '').lower() for c in companies]
                
                # Check for obvious mock data patterns
                mock_patterns = ['test', 'mock', 'sample', 'demo', 'placeholder', 'fake']
                mock_companies = [name for name in company_names if any(pattern in name for pattern in mock_patterns)]
                
                if mock_companies:
                    print(f"   ⚠️  Found potential mock companies in {company_type}: {mock_companies}")
                else:
                    print(f"   ✅ No obvious mock data found in {company_type} companies")
                
                # Check for variety (not all same name pattern)
                unique_prefixes = set(name.split()[0] if name.split() else name for name in company_names)
                if len(unique_prefixes) < len(companies) * 0.5:  # At least 50% should have different prefixes
                    print(f"   ⚠️  Low variety in {company_type} company names - possible generated data")
                else:
                    print(f"   ✅ Good variety in {company_type} company names")
            else:
                print(f"   ❌ Failed to get {company_type} companies for integrity check")
                all_tests_passed = False
        
        return all_tests_passed, {}

def main():
    print("🚀 Starting Real Database Data API Tests")
    print("=" * 60)
    print("Testing that all mock/hardcoded data has been replaced with real database data")
    print("=" * 60)
    
    # Setup
    tester = RealDataAPITester()

    # Test 1: API Health Check
    print("\n📋 Test 1: API Health Check")
    tester.test_api_health()

    # Test 2: Collect Company IDs
    print("\n📋 Test 2: Collect Company IDs for Dashboard Tests")
    tester.collect_company_ids()

    # Test 3: User Profile API (NEW)
    print("\n📋 Test 3: User Profile API - Real Database Data")
    tester.test_user_profile_api()

    # Test 4: Corporate Dashboard API (NEW)
    print("\n📋 Test 4: Corporate Dashboard API - Real Database Data")
    tester.test_corporate_dashboard_api()

    # Test 5: Catering Dashboard API (NEW)
    print("\n📋 Test 5: Catering Dashboard API - Real Database Data")
    tester.test_catering_dashboard_api()

    # Test 6: Supplier Dashboard API (NEW)
    print("\n📋 Test 6: Supplier Dashboard API - Real Database Data")
    tester.test_supplier_dashboard_api()

    # Test 7: Data Integrity Check
    print("\n📋 Test 7: Data Integrity - No Mock/Hardcoded Data")
    tester.test_data_integrity()

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Real Data Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All real data tests passed! No mock/hardcoded data detected.")
        return 0
    else:
        print("⚠️  Some real data tests failed - mock/hardcoded data may still exist")
        return 1

if __name__ == "__main__":
    sys.exit(main())