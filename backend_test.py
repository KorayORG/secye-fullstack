import requests
import sys
from datetime import datetime
import json

class SecYeAPITester:
    def __init__(self, base_url="https://foodpick-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.company_id = None

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

    def test_company_search(self, company_type="corporate", query="A-Tech"):
        """Test company search API"""
        success, response = self.run_test(
            f"Company Search - {company_type} - {query}",
            "GET",
            "companies/search",
            200,
            params={"type": company_type, "query": query}
        )
        
        if success and response.get('companies'):
            # Store the first company ID for login test
            companies = response['companies']
            if companies:
                self.company_id = companies[0]['id']
                print(f"   Found company: {companies[0]['name']} (ID: {self.company_id})")
        
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

def main():
    print("🚀 Starting Seç Ye API Tests")
    print("=" * 50)
    
    # Setup
    tester = SecYeAPITester()

    # Test 1: API Health Check
    print("\n📋 Test 1: API Health Check")
    tester.test_health_check()

    # Test 2: Company Search
    print("\n📋 Test 2: Company Search")
    tester.test_company_search("corporate", "A-Tech")

    # Test 3: Login (if company was found)
    print("\n📋 Test 3: Corporate Login")
    if tester.company_id:
        tester.test_login()
    else:
        print("⚠️  Skipping login test - no company found")

    # Additional company search tests
    print("\n📋 Test 4: Additional Company Searches")
    tester.test_company_search("corporate", "")  # Empty query
    tester.test_company_search("catering", "")   # Different type
    tester.test_company_search("supplier", "")   # Different type

    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())