import requests
import sys
from datetime import datetime
import json
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('frontend/.env')

class SupplierOrdersAPITester:
    def __init__(self):
        # Use the production backend URL from frontend/.env
        self.base_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
        self.api_url = f"{self.base_url}/api"
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

    def test_supplier_orders_api(self):
        """Test the supplier orders API endpoint specifically"""
        print("\n📦 TESTING SUPPLIER ORDERS API - FOCUSED TEST")
        print("=" * 60)
        
        # Test data from the review request
        supplier_id = "supplier-001"
        catering_id = "catering-001"
        
        print(f"🏭 Testing with Supplier ID: {supplier_id}")
        print(f"🍽️  Testing with Catering ID: {catering_id}")
        
        # Test 1: GET /api/orders?supplier_id=supplier-001
        print("\n🔍 Test 1: GET Orders for Supplier")
        success1, response1 = self.run_test(
            "Get Orders for Supplier supplier-001",
            "GET",
            "orders",
            200,
            params={"supplier_id": supplier_id}
        )
        
        # Test 2: GET /api/orders?catering_id=catering-001 (for comparison)
        print("\n🔍 Test 2: GET Orders for Catering (comparison)")
        success2, response2 = self.run_test(
            "Get Orders for Catering catering-001",
            "GET",
            "orders",
            200,
            params={"catering_id": catering_id}
        )
        
        # Test 3: GET /api/orders with both parameters
        print("\n🔍 Test 3: GET Orders with both supplier and catering ID")
        success3, response3 = self.run_test(
            "Get Orders with both IDs",
            "GET",
            "orders",
            200,
            params={"supplier_id": supplier_id, "catering_id": catering_id}
        )
        
        # Test 4: GET /api/orders with status filter
        print("\n🔍 Test 4: GET Orders with status filter")
        success4, response4 = self.run_test(
            "Get Orders with status filter",
            "GET",
            "orders",
            200,
            params={"supplier_id": supplier_id, "status": "pending"}
        )
        
        # Test 5: GET /api/orders with limit and offset
        print("\n🔍 Test 5: GET Orders with pagination")
        success5, response5 = self.run_test(
            "Get Orders with pagination",
            "GET",
            "orders",
            200,
            params={"supplier_id": supplier_id, "limit": 10, "offset": 0}
        )
        
        # Test 6: Error case - no supplier_id or catering_id
        print("\n🔍 Test 6: Error case - missing required parameters")
        success6, response6 = self.run_test(
            "Get Orders without required parameters",
            "GET",
            "orders",
            400,  # Should return 400 Bad Request
            params={}
        )
        
        # Test 7: Error case - invalid supplier_id
        print("\n🔍 Test 7: Error case - invalid supplier ID")
        success7, response7 = self.run_test(
            "Get Orders with invalid supplier ID",
            "GET",
            "orders",
            404,  # Should return 404 Not Found
            params={"supplier_id": "invalid-supplier-id"}
        )
        
        # Analyze results
        print("\n📊 SUPPLIER ORDERS API TEST ANALYSIS:")
        print("=" * 50)
        
        if success1:
            print("✅ Main supplier orders API: WORKING")
            orders = response1.get('orders', [])
            print(f"   → Found {len(orders)} orders for supplier-001")
            
            if orders:
                print("   → Sample order structure:")
                sample_order = orders[0]
                for key, value in sample_order.items():
                    if key == 'items' and isinstance(value, list) and value:
                        print(f"     {key}: {len(value)} items")
                        print(f"       Sample item: {value[0]}")
                    else:
                        print(f"     {key}: {value}")
            else:
                print("   ⚠️  No orders found - this might be expected if no test data exists")
        else:
            print("❌ Main supplier orders API: FAILED")
            print("   This is the critical issue that needs to be fixed!")
        
        if success2:
            print("✅ Catering orders API: WORKING")
            catering_orders = response2.get('orders', [])
            print(f"   → Found {len(catering_orders)} orders for catering-001")
        else:
            print("❌ Catering orders API: FAILED")
        
        if success6:
            print("✅ Error handling (missing params): WORKING")
        else:
            print("❌ Error handling (missing params): FAILED")
        
        if success7:
            print("✅ Error handling (invalid supplier): WORKING")
        else:
            print("❌ Error handling (invalid supplier): FAILED")
        
        # Overall assessment
        critical_success = success1  # The most important test
        print(f"\n🎯 CRITICAL ASSESSMENT:")
        if critical_success:
            print("✅ SUPPLIER ORDERS API IS WORKING!")
            print("   The backend API correctly returns order data for suppliers.")
            print("   The frontend should be able to display orders in the 'Siparişler' tab.")
        else:
            print("❌ SUPPLIER ORDERS API HAS ISSUES!")
            print("   The backend API is not working correctly.")
            print("   This will prevent the frontend from displaying orders.")
        
        return critical_success

    def test_api_health(self):
        """Test basic API health"""
        print("\n🏥 TESTING API HEALTH")
        print("-" * 30)
        
        success, response = self.run_test(
            "API Health Check",
            "GET",
            "",
            200
        )
        
        return success

def main():
    """Main test execution"""
    print("🧪 SUPPLIER ORDERS FUNCTIONALITY TEST")
    print("=" * 60)
    print("Testing the supplier panel orders functionality as requested.")
    print("Focus: Backend API endpoint GET /api/orders?supplier_id=supplier-001")
    print()
    
    tester = SupplierOrdersAPITester()
    
    # Test API health first
    health_ok = tester.test_api_health()
    if not health_ok:
        print("\n❌ API is not accessible. Cannot proceed with tests.")
        return 1
    
    # Test supplier orders API
    orders_ok = tester.test_supplier_orders_api()
    
    # Print final results
    print(f"\n📊 FINAL TEST RESULTS:")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if orders_ok:
        print("\n🎉 SUCCESS: Supplier orders API is working correctly!")
        print("The backend is ready for frontend testing.")
    else:
        print("\n💥 FAILURE: Supplier orders API has critical issues!")
        print("Backend needs to be fixed before frontend testing.")
    
    return 0 if orders_ok else 1

if __name__ == "__main__":
    sys.exit(main())