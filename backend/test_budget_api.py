#!/usr/bin/env python3
"""
Test script for budget API endpoints
"""

import requests
import json
from datetime import datetime

# API base URL
BASE_URL = "http://localhost:8000"

def test_budget_endpoints():
    """Test the budget API endpoints"""
    
    # Get current month in YYYY-MM format
    current_month = datetime.now().strftime("%Y-%m")
    
    print(f"🧪 Testing Budget API endpoints for month: {current_month}")
    print("=" * 50)
    
    # Test 1: Get averages
    print("1. Testing /api/budget/averages/")
    try:
        response = requests.get(f"{BASE_URL}/api/budget/averages/?month={current_month}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {len(data)} category averages")
            if data:
                print(f"   Sample: {data[0]['main_category']} - {data[0]['sub_category']}: {data[0]['average_amount']}")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print()
    
    # Test 2: Get user budgets
    print("2. Testing /api/budget/user/")
    try:
        response = requests.get(f"{BASE_URL}/api/budget/user/?month={current_month}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {len(data)} user budgets")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print()
    
    # Test 3: Get combined data
    print("3. Testing /api/budget/combined/")
    try:
        response = requests.get(f"{BASE_URL}/api/budget/combined/?month={current_month}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {len(data)} combined budget entries")
            if data:
                print(f"   Sample: {data[0]['main_category']} - {data[0]['sub_category']}")
                print(f"   Average: {data[0]['average_amount']}, Budget: {data[0]['budget_amount']}, Actual: {data[0]['actual_amount']}")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print()
    
    # Test 4: Create/Update a budget
    print("4. Testing /api/budget/user/ (POST)")
    try:
        budget_data = {
            "month": current_month,
            "main_category": "Groceries",
            "sub_category": "Supermarket",
            "budget_amount": 1000.0
        }
        response = requests.post(f"{BASE_URL}/api/budget/user/", json=budget_data)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Created/Updated budget: {data['budget_amount']} for {data['main_category']} - {data['sub_category']}")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    print()
    print("🎉 Budget API testing completed!")

if __name__ == "__main__":
    test_budget_endpoints() 