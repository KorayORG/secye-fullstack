#!/usr/bin/env python3

# Quick fix for audit logs description issue
import re

def fix_audit_logs():
    with open('/app/backend/server.py', 'r') as f:
        content = f.read()
    
    # Replace the problematic lines
    content = content.replace(
        '"description": log["description"],',
        '"description": get_activity_description(log),'
    )
    
    with open('/app/backend/server.py', 'w') as f:
        f.write(content)
    
    print("Fixed audit logs description issue")

if __name__ == "__main__":
    fix_audit_logs()