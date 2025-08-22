import requests
import json
from datetime import datetime

def test_catering_message_api():
    """Debug catering message API"""
    base_url = "https://food-tenant.preview.emergentagent.com/api"
    company_id = "3cbb8b6a-264f-43c9-9673-aa8ccecb4977"  # LezzetSepeti
    
    # Test 1: Check what the API expects
    print("🔍 Testing Catering Message API...")
    
    # Correct payload based on MailCreateRequest model
    message_data = {
        "to_addresses": ["recipient@catering.sy", "chef@catering.sy"],
        "subject": "Test Message",
        "body": "This is a test message",
        "labels": ["test"]
    }
    
    url = f"{base_url}/catering/{company_id}/messages"
    print(f"URL: {url}")
    print(f"Data: {json.dumps(message_data, indent=2)}")
    
    response = requests.post(url, json=message_data, headers={'Content-Type': 'application/json'})
    print(f"Status: {response.status_code}")
    
    try:
        response_data = response.json()
        print(f"Response: {json.dumps(response_data, indent=2)}")
    except:
        print(f"Response text: {response.text}")

def test_catering_audit_logs():
    """Debug catering audit logs API"""
    base_url = "https://food-tenant.preview.emergentagent.com/api"
    company_id = "3cbb8b6a-264f-43c9-9673-aa8ccecb4977"  # LezzetSepeti
    
    print("\n🔍 Testing Catering Audit Logs API...")
    
    url = f"{base_url}/catering/{company_id}/audit-logs"
    print(f"URL: {url}")
    
    response = requests.get(url, headers={'Content-Type': 'application/json'})
    print(f"Status: {response.status_code}")
    
    try:
        response_data = response.json()
        print(f"Response: {json.dumps(response_data, indent=2)}")
    except:
        print(f"Response text: {response.text}")

def test_supplier_message_api():
    """Debug supplier message API"""
    base_url = "https://food-tenant.preview.emergentagent.com/api"
    company_id = "d0bd07d2-4caf-4d0a-8f8e-fbbfd5a67a4e"  # TazeMarket
    
    print("\n🔍 Testing Supplier Message API...")
    
    # Correct payload based on MailCreateRequest model
    message_data = {
        "to_addresses": ["warehouse@supplier.sy"],
        "subject": "Test Supplier Message",
        "body": "This is a test supplier message",
        "labels": ["test"]
    }
    
    url = f"{base_url}/supplier/{company_id}/messages"
    print(f"URL: {url}")
    print(f"Data: {json.dumps(message_data, indent=2)}")
    
    response = requests.post(url, json=message_data, headers={'Content-Type': 'application/json'})
    print(f"Status: {response.status_code}")
    
    try:
        response_data = response.json()
        print(f"Response: {json.dumps(response_data, indent=2)}")
    except:
        print(f"Response text: {response.text}")

if __name__ == "__main__":
    test_catering_message_api()
    test_catering_audit_logs()
    test_supplier_message_api()