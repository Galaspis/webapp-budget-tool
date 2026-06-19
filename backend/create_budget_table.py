#!/usr/bin/env python3
"""
Script to create the budgets table in the database
"""

from database import engine, Base
from models import Budget

def create_budget_table():
    """Create the budgets table if it doesn't exist"""
    try:
        # Create all tables (this will create the budgets table if it doesn't exist)
        Base.metadata.create_all(bind=engine)
        print("✅ Budget table created successfully!")
        print("📊 The budgets table is now ready to store user-defined budgets.")
    except Exception as e:
        print(f"❌ Error creating budget table: {e}")

if __name__ == "__main__":
    create_budget_table() 