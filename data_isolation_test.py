import requests
import sys
from datetime import datetime
import json
import uuid

class DataIsolationSecurityTester:
    def __init__(self, base_url="https://food-alliance.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.security_issues = []
        
        # Company IDs for different types
        self.corporate_companies = []
        self.catering_companies = []
        self.supplier_companies = []
        
        # Test users created for isolation testing
        self.test_users = {}

    def log_security_issue(self, issue_type, description, details=None):
        """Log a security issue found during testing"""
        self.security_issues.append({
            "type": issue_type,
            "description": description,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        })

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

    def setup_test_companies(self):
        """Find multiple companies of each type for isolation testing"""
        print("\n🏢 Setting up test companies for data isolation testing...")
        
        # Get multiple corporate companies
        success, response = self.run_test(
            "Find Corporate Companies",
            "GET",
            "companies/search",
            200,
            params={"type": "corporate", "limit": 10}
        )
        
        if success and response.get('companies'):
            self.corporate_companies = response['companies'][:3]  # Take first 3
            print(f"   Found {len(self.corporate_companies)} corporate companies")
            for i, company in enumerate(self.corporate_companies):
                print(f"     {i+1}. {company['name']} (ID: {company['id']})")
        
        # Get multiple catering companies
        success, response = self.run_test(
            "Find Catering Companies",
            "GET",
            "companies/search",
            200,
            params={"type": "catering", "limit": 10}
        )
        
        if success and response.get('companies'):
            self.catering_companies = response['companies'][:3]  # Take first 3
            print(f"   Found {len(self.catering_companies)} catering companies")
            for i, company in enumerate(self.catering_companies):
                print(f"     {i+1}. {company['name']} (ID: {company['id']})")
        
        # Get multiple supplier companies
        success, response = self.run_test(
            "Find Supplier Companies",
            "GET",
            "companies/search",
            200,
            params={"type": "supplier", "limit": 10}
        )
        
        if success and response.get('companies'):
            self.supplier_companies = response['companies'][:3]  # Take first 3
            print(f"   Found {len(self.supplier_companies)} supplier companies")
            for i, company in enumerate(self.supplier_companies):
                print(f"     {i+1}. {company['name']} (ID: {company['id']})")

    def create_test_users_for_companies(self):
        """Create test users for each company to test data isolation"""
        print("\n👥 Creating test users for data isolation testing...")
        
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Create users for each corporate company
        for i, company in enumerate(self.corporate_companies):
            company_id = company['id']
            company_name = company['name']
            
            # Create 2-3 test users per company
            test_users = []
            for j in range(2):
                user_data = {
                    "users": [{
                        "full_name": f"Test Employee {i+1}-{j+1} for {company_name}",
                        "phone": f"+9055{timestamp}{i:02d}{j:02d}"
                    }]
                }
                
                success, response = self.run_test(
                    f"Create Test User {j+1} for Corporate Company {i+1}",
                    "POST",
                    f"corporate/{company_id}/employees/bulk-import",
                    200,
                    data=user_data
                )
                
                if success and response.get('imported_count', 0) > 0:
                    test_users.append({
                        "name": user_data["users"][0]["full_name"],
                        "phone": user_data["users"][0]["phone"]
                    })
            
            self.test_users[company_id] = {
                "company_name": company_name,
                "company_type": "corporate",
                "users": test_users
            }
            
            print(f"   Created {len(test_users)} users for {company_name}")

    def test_employee_data_isolation(self):
        """CRITICAL TEST: Verify employees from one company cannot see employees from another company"""
        print("\n🔒 CRITICAL SECURITY TEST: Employee Data Isolation")
        print("=" * 70)
        
        if len(self.corporate_companies) < 2:
            print("❌ Need at least 2 corporate companies for isolation testing")
            return False
        
        isolation_passed = True
        
        # Test each company's employee list
        for i, company in enumerate(self.corporate_companies):
            company_id = company['id']
            company_name = company['name']
            
            print(f"\n🏢 Testing Company {i+1}: {company_name} (ID: {company_id})")
            
            # Get employees for this company
            success, response = self.run_test(
                f"Get Employees for Company {i+1}",
                "GET",
                f"corporate/{company_id}/employees",
                200,
                params={"limit": 100}  # Get more to check for leakage
            )
            
            if not success:
                print(f"❌ Failed to get employees for company {company_name}")
                isolation_passed = False
                continue
            
            employees = response.get('users', [])
            print(f"   Found {len(employees)} employees")
            
            # Check if any employees belong to other companies
            leaked_employees = []
            for employee in employees:
                employee_name = employee.get('full_name', '')
                employee_phone = employee.get('phone', '')
                
                # Check if this employee was created for a different company
                for other_company_id, other_company_data in self.test_users.items():
                    if other_company_id != company_id:
                        for test_user in other_company_data['users']:
                            if (test_user['name'] == employee_name or 
                                test_user['phone'] == employee_phone):
                                leaked_employees.append({
                                    "employee": employee,
                                    "belongs_to": other_company_data['company_name'],
                                    "belongs_to_id": other_company_id
                                })
            
            if leaked_employees:
                isolation_passed = False
                self.log_security_issue(
                    "DATA_ISOLATION_BREACH",
                    f"Company {company_name} can see employees from other companies",
                    {
                        "company_id": company_id,
                        "company_name": company_name,
                        "leaked_employees": leaked_employees
                    }
                )
                
                print(f"🚨 SECURITY BREACH: Found {len(leaked_employees)} employees from other companies!")
                for leak in leaked_employees:
                    print(f"   ❌ Employee '{leak['employee']['full_name']}' belongs to {leak['belongs_to']}")
            else:
                print(f"   ✅ Data isolation verified - no cross-company employee leakage")
        
        return isolation_passed

    def test_employee_search_isolation(self):
        """Test that search functionality respects company boundaries"""
        print("\n🔍 Testing Employee Search Data Isolation")
        print("=" * 50)
        
        if len(self.corporate_companies) < 2:
            print("❌ Need at least 2 corporate companies for search isolation testing")
            return False
        
        search_isolation_passed = True
        
        # Use a common search term that might exist across companies
        search_terms = ["Test", "Employee", "Ahmet", "Fatma"]
        
        for search_term in search_terms:
            print(f"\n🔍 Testing search term: '{search_term}'")
            
            # Test search for each company
            for i, company in enumerate(self.corporate_companies):
                company_id = company['id']
                company_name = company['name']
                
                success, response = self.run_test(
                    f"Search '{search_term}' in Company {i+1}",
                    "GET",
                    f"corporate/{company_id}/employees",
                    200,
                    params={"search": search_term, "limit": 50}
                )
                
                if success:
                    employees = response.get('users', [])
                    print(f"   Company {company_name}: Found {len(employees)} employees")
                    
                    # Verify all returned employees belong to this company
                    for employee in employees:
                        # Check if employee belongs to other companies
                        for other_company_id, other_company_data in self.test_users.items():
                            if other_company_id != company_id:
                                for test_user in other_company_data['users']:
                                    if (test_user['name'] == employee.get('full_name') or 
                                        test_user['phone'] == employee.get('phone')):
                                        search_isolation_passed = False
                                        self.log_security_issue(
                                            "SEARCH_ISOLATION_BREACH",
                                            f"Search in {company_name} returned employee from {other_company_data['company_name']}",
                                            {
                                                "search_term": search_term,
                                                "company_id": company_id,
                                                "leaked_employee": employee
                                            }
                                        )
                                        print(f"   🚨 BREACH: Employee '{employee['full_name']}' from {other_company_data['company_name']} appeared in search!")
        
        return search_isolation_passed

    def test_user_type_filtering_isolation(self):
        """Test that user type filtering (corporate vs individual) respects company boundaries"""
        print("\n👤 Testing User Type Filtering Data Isolation")
        print("=" * 50)
        
        if len(self.corporate_companies) < 2:
            print("❌ Need at least 2 corporate companies for type filtering testing")
            return False
        
        type_isolation_passed = True
        
        user_types = ["corporate", "individual"]
        
        for user_type in user_types:
            print(f"\n👤 Testing user type filter: '{user_type}'")
            
            for i, company in enumerate(self.corporate_companies):
                company_id = company['id']
                company_name = company['name']
                
                success, response = self.run_test(
                    f"Get {user_type} users for Company {i+1}",
                    "GET",
                    f"corporate/{company_id}/employees",
                    200,
                    params={"type": user_type, "limit": 50}
                )
                
                if success:
                    employees = response.get('users', [])
                    print(f"   Company {company_name}: Found {len(employees)} {user_type} users")
                    
                    # Verify all returned employees belong to this company
                    for employee in employees:
                        for other_company_id, other_company_data in self.test_users.items():
                            if other_company_id != company_id:
                                for test_user in other_company_data['users']:
                                    if (test_user['name'] == employee.get('full_name') or 
                                        test_user['phone'] == employee.get('phone')):
                                        type_isolation_passed = False
                                        self.log_security_issue(
                                            "TYPE_FILTER_ISOLATION_BREACH",
                                            f"Type filter '{user_type}' in {company_name} returned employee from {other_company_data['company_name']}",
                                            {
                                                "user_type": user_type,
                                                "company_id": company_id,
                                                "leaked_employee": employee
                                            }
                                        )
                                        print(f"   🚨 BREACH: Employee '{employee['full_name']}' from {other_company_data['company_name']} appeared in {user_type} filter!")
        
        return type_isolation_passed

    def test_system_settings_isolation(self):
        """Test that system settings APIs work for all company types and respect isolation"""
        print("\n⚙️ Testing System Settings API Isolation")
        print("=" * 50)
        
        settings_isolation_passed = True
        
        # Test corporate settings
        for i, company in enumerate(self.corporate_companies):
            company_id = company['id']
            company_name = company['name']
            
            # Test GET settings
            success, response = self.run_test(
                f"Get Corporate Settings - Company {i+1}",
                "GET",
                f"corporate/{company_id}/settings",
                200
            )
            
            if success:
                company_data = response.get('company', {})
                returned_company_id = company_data.get('id')
                
                if returned_company_id != company_id:
                    settings_isolation_passed = False
                    self.log_security_issue(
                        "SETTINGS_ISOLATION_BREACH",
                        f"Settings API returned wrong company data",
                        {
                            "requested_company_id": company_id,
                            "returned_company_id": returned_company_id,
                            "company_name": company_name
                        }
                    )
                    print(f"   🚨 BREACH: Requested settings for {company_id} but got {returned_company_id}")
                else:
                    print(f"   ✅ Settings isolation verified for {company_name}")
            
            # Test PUT settings (save functionality)
            test_update_data = {
                "name": f"Updated {company_name} Test",
                "phone": "+902121234567"
            }
            
            success, response = self.run_test(
                f"Update Corporate Settings - Company {i+1}",
                "PUT",
                f"corporate/{company_id}/settings",
                200,
                data=test_update_data
            )
            
            if success:
                print(f"   ✅ Settings save functionality working for {company_name}")
            else:
                settings_isolation_passed = False
                print(f"   ❌ Settings save failed for {company_name}")
        
        # Test catering settings
        for i, company in enumerate(self.catering_companies):
            company_id = company['id']
            company_name = company['name']
            
            success, response = self.run_test(
                f"Get Catering Settings - Company {i+1}",
                "GET",
                f"catering/{company_id}/settings",
                200
            )
            
            if success:
                print(f"   ✅ Catering settings working for {company_name}")
            else:
                settings_isolation_passed = False
                print(f"   ❌ Catering settings failed for {company_name}")
        
        # Test supplier settings
        for i, company in enumerate(self.supplier_companies):
            company_id = company['id']
            company_name = company['name']
            
            success, response = self.run_test(
                f"Get Supplier Settings - Company {i+1}",
                "GET",
                f"supplier/{company_id}/settings",
                200
            )
            
            if success:
                print(f"   ✅ Supplier settings working for {company_name}")
            else:
                settings_isolation_passed = False
                print(f"   ❌ Supplier settings failed for {company_name}")
        
        return settings_isolation_passed

    def generate_security_report(self):
        """Generate a comprehensive security report"""
        print("\n" + "=" * 70)
        print("🔒 DATA ISOLATION SECURITY REPORT")
        print("=" * 70)
        
        if not self.security_issues:
            print("✅ NO SECURITY ISSUES FOUND!")
            print("   All data isolation tests passed successfully.")
            print("   Companies can only see their own employees.")
            print("   Search and filtering respect company boundaries.")
            print("   System settings APIs work correctly for all company types.")
            return True
        else:
            print(f"🚨 {len(self.security_issues)} SECURITY ISSUES FOUND!")
            print("\nDETAILED SECURITY ISSUES:")
            print("-" * 50)
            
            for i, issue in enumerate(self.security_issues, 1):
                print(f"\n{i}. {issue['type']}")
                print(f"   Description: {issue['description']}")
                print(f"   Timestamp: {issue['timestamp']}")
                if issue['details']:
                    print(f"   Details: {json.dumps(issue['details'], indent=6)}")
            
            print("\n🔥 CRITICAL RECOMMENDATIONS:")
            print("1. IMMEDIATELY review the employee listing API implementation")
            print("2. Ensure all database queries include company_id filtering")
            print("3. Verify role-based access control is properly implemented")
            print("4. Audit all API endpoints for data isolation compliance")
            print("5. Implement comprehensive logging for security monitoring")
            
            return False

def main():
    print("🔒 Starting Data Isolation Security Testing")
    print("=" * 70)
    print("Testing the critical security fix for employee management API")
    print("Verifying that companies can ONLY see their own employees")
    print("=" * 70)
    
    # Setup
    tester = DataIsolationSecurityTester()
    
    # Step 1: Setup test companies
    tester.setup_test_companies()
    
    if len(tester.corporate_companies) < 2:
        print("\n❌ CRITICAL ERROR: Need at least 2 corporate companies for isolation testing")
        print("   Cannot verify data isolation without multiple companies")
        return 1
    
    # Step 2: Create test users for isolation testing
    tester.create_test_users_for_companies()
    
    # Step 3: Run critical security tests
    print("\n🔒 RUNNING CRITICAL SECURITY TESTS")
    print("=" * 50)
    
    # Test 1: Employee Data Isolation (MOST CRITICAL)
    isolation_passed = tester.test_employee_data_isolation()
    
    # Test 2: Search Isolation
    search_isolation_passed = tester.test_employee_search_isolation()
    
    # Test 3: User Type Filtering Isolation
    type_isolation_passed = tester.test_user_type_filtering_isolation()
    
    # Test 4: System Settings Isolation
    settings_isolation_passed = tester.test_system_settings_isolation()
    
    # Step 4: Generate security report
    security_passed = tester.generate_security_report()
    
    # Final results
    print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    print("\n🎯 SECURITY TEST SUMMARY:")
    print(f"   🔒 Employee Data Isolation: {'✅ SECURE' if isolation_passed else '❌ BREACHED'}")
    print(f"   🔍 Search Isolation: {'✅ SECURE' if search_isolation_passed else '❌ BREACHED'}")
    print(f"   👤 Type Filter Isolation: {'✅ SECURE' if type_isolation_passed else '❌ BREACHED'}")
    print(f"   ⚙️ Settings API Isolation: {'✅ WORKING' if settings_isolation_passed else '❌ ISSUES'}")
    
    if security_passed and isolation_passed:
        print("\n🎉 DATA ISOLATION SECURITY FIX VERIFIED!")
        print("   The critical security issue has been resolved.")
        return 0
    else:
        print("\n⚠️ CRITICAL SECURITY ISSUES REMAIN!")
        print("   The data isolation fix needs further work.")
        return 1

if __name__ == "__main__":
    sys.exit(main())