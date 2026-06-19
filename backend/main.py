
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, cast, String
from database import SessionLocal, engine, Base
from models import Transaction, Budget
from pydantic import BaseModel
from datetime import datetime
import pandas as pd
import io
from typing import List, Optional, Dict, Any
from categorizer import TransactionCategorizer
from models import CategoryMapping


Base.metadata.create_all(bind=engine)

app = FastAPI()

# Create a global categorizer instance
transaction_categorizer = TransactionCategorizer()

# CORS Setup
origins = ["http://localhost:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic schema for creating transactions
class TransactionCreate(BaseModel):
    date: datetime
    description: str
    amount: float
    reference: str | None = None
    note: str | None = None
    billing_period: str
    main_category: str | None = "לא מסווג"
    sub_category: str | None = "לא מסווג"
    transaction_type: str | None = "הוצאה"  # Default to expense

# Pydantic schema for database transaction (including ID)
class TransactionSchema(TransactionCreate):
    id: int
    class Config:
        orm_mode = True

# Helper function to calculate billing period
def calculate_billing_period(transaction_date):
    """
    Calculate the billing period for a given transaction date.
    Billing period is from 10th of month to 9th of next month.
    Returns string like 'July 2023' for transactions between July 10th 2023 - August 9th 2023
    """
    if not isinstance(transaction_date, datetime):
        try:
            transaction_date = pd.to_datetime(transaction_date)
        except:
            # Return empty string if date can't be parsed
            return ""
    
    # If transaction is before 10th, it belongs to previous month's billing cycle
    if transaction_date.day < 10:
        # Go back one month
        if transaction_date.month == 1:  # Handle January case
            billing_month = 12
            billing_year = transaction_date.year - 1
        else:
            billing_month = transaction_date.month - 1
            billing_year = transaction_date.year
    else:
        # Transaction is on or after 10th, belongs to current month's cycle
        billing_month = transaction_date.month
        billing_year = transaction_date.year
    
    # Convert month number to name
    month_names = {
        1: 'January', 2: 'February', 3: 'March', 4: 'April', 
        5: 'May', 6: 'June', 7: 'July', 8: 'August',
        9: 'September', 10: 'October', 11: 'November', 12: 'December'
    }
    
    return f"{month_names[billing_month]} {billing_year}"

# Existing endpoints
@app.post("/api/transactions/", response_model=TransactionCreate)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = Transaction(**transaction.model_dump())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

# Update the get_transactions function in main.py to return total count

@app.get("/api/transactions/")
def get_transactions(
    skip: int = 0, 
    limit: int = 100, 
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    billing_period: Optional[str] = None,
    main_category: Optional[str] = None,
    sub_category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)
    
    # Apply filters if provided
    if start_date and end_date:
        query = query.filter(
            Transaction.date >= datetime.fromisoformat(start_date),
            Transaction.date <= datetime.fromisoformat(end_date)
        )
    
    if billing_period:
        query = query.filter(Transaction.billing_period == billing_period)
    
    if main_category:
        query = query.filter(Transaction.main_category == main_category)
        
    if sub_category:
        query = query.filter(Transaction.sub_category == sub_category)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(Transaction.description.ilike(search_term))
    
    # Get total count before applying pagination
    total_count = query.count()
    
    # Apply pagination
    transactions = query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()
    
    # Return both transactions and total count
    return {
        "items": transactions,
        "total": total_count
    }

# Update the upload endpoint in main.py to handle transaction_type

# Add this function to your main.py file

def is_duplicate_transaction(transaction_data, db):
    """
    Check if a transaction with the same date, description, and amount already exists.
    
    Args:
        transaction_data: A dictionary with transaction details
        db: Database session
        
    Returns:
        bool: True if transaction is a duplicate, False otherwise
    """
    # Query for transactions with the same date, description and amount
    existing = db.query(Transaction).filter(
        Transaction.date == transaction_data.get('date'),
        Transaction.description == transaction_data.get('description'),
        Transaction.amount == transaction_data.get('amount')
    ).first()
    
    return existing is not None

# Then modify your upload endpoint to use this function
@app.post("/api/upload/")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Read file content
    content = await file.read()
    file_content = content.decode('utf-8')

    try:
        df = pd.read_csv(io.StringIO(file_content))
        new_transactions = []
        skipped_transactions = 0

        # Auto-detect file type based on columns
        columns = df.columns.tolist()

        if 'תאריך העסקה' in columns and 'שם בית העסק' in columns:
            file_type = "credit_card"
        elif 'תאריך' in columns and 'תיאור' in columns:
            file_type = "bank_statement"
        else:
            return {"success": False, "error": "Unknown file format. Please upload a valid bank or credit card statement."}

        # Drop completely empty rows first
        df = df.dropna(how='all')

        if file_type == "bank_statement":
            # Skip header row if needed
            if 'תאריך' in str(df.iloc[0, 0]):
                df = df.iloc[1:]

            if 'תיאור' not in df.columns:
                raise HTTPException(status_code=400, detail="Missing 'תיאור' column in bank statement upload.")

            df = df[df['תיאור'].notna()]

            # Parse dates
            def parse_bank_date(date_str):
                if pd.isna(date_str):
                    return None
                cleaned_date = str(date_str).replace('**', '').strip()
                try:
                    parts = cleaned_date.split('/')
                    if len(parts) != 3:
                        return None
                    day, month, year = parts
                    if len(year) == 2:
                        year = '20' + year
                    return pd.to_datetime(f"{year}-{month.zfill(2)}-{day.zfill(2)}")
                except:
                    return None

            df['date'] = df['תאריך'].apply(parse_bank_date)
            df = df[df['date'].notna()]

            # Process amounts
            def clean_amount(value):
                if pd.isna(value) or str(value).strip() in ["", "0"]:
                    return 0.0
                return float(str(value).replace(',', ''))

            df['בחובה'] = df['בחובה'].apply(clean_amount)
            df['בזכות'] = df['בזכות'].apply(clean_amount)

            df['amount'] = df['בזכות'] - df['בחובה']

            for _, row in df.iterrows():
                if row['amount'] != 0:
                    billing_period = calculate_billing_period(row['date'])
                    merchant = row['תיאור'].strip()
                    amount = float(row['amount'])
                    main_category, sub_category, transaction_type = transaction_categorizer.categorize_transaction(merchant, amount)

                    transaction_data = {
                        'date': row['date'],
                        'description': merchant,
                        'amount': amount,
                        'reference': str(row.get('אסמכתא', '')),
                        'note': str(row.get('הערה', '')),
                        'billing_period': billing_period,
                        'main_category': main_category,
                        'sub_category': sub_category,
                        'transaction_type': transaction_type
                    }

                    if not is_duplicate_transaction(transaction_data, db):
                        db_transaction = Transaction(**transaction_data)
                        new_transactions.append(db_transaction)
                    else:
                        skipped_transactions += 1

        elif file_type == "credit_card":
            # Convert transaction dates
            try:
                for date_format in ['%d/%m/%y', '%d/%m/%Y', '%Y-%m-%d']:
                    try:
                        df['תאריך העסקה'] = pd.to_datetime(df['תאריך העסקה'], format=date_format, errors='coerce')
                        if df['תאריך העסקה'].notna().mean() > 0.5:
                            break
                    except:
                        continue
            except Exception as e:
                return {"error": f"Error parsing dates: {str(e)}"}

            df = df.dropna(subset=['תאריך העסקה'])

            df['סכום חיוב'] = pd.to_numeric(df['סכום חיוב'].str.replace(',', ''), errors='coerce')

            for _, row in df.iterrows():
                billing_period = calculate_billing_period(row['תאריך העסקה'])
                merchant = row['שם בית העסק'].strip()
                amount = float(row['סכום חיוב']) * -1  # Make expenses negative
                main_category, sub_category, transaction_type = transaction_categorizer.categorize_transaction(merchant, amount)

                transaction_data = {
                    'date': row['תאריך העסקה'],
                    'description': merchant,
                    'amount': amount,
                    'reference': str(row.get('סוג העסקה', '')).strip(),
                    'note': str(row.get('פרטים', '')),
                    'billing_period': billing_period,
                    'main_category': main_category,
                    'sub_category': sub_category,
                    'transaction_type': transaction_type
                }

                if not is_duplicate_transaction(transaction_data, db):
                    db_transaction = Transaction(**transaction_data)
                    new_transactions.append(db_transaction)
                else:
                    skipped_transactions += 1

        # Save all new transactions
        db.add_all(new_transactions)
        db.commit()

        return {
            "success": True,
            "message": f"Processed {len(new_transactions)} new transactions (skipped {skipped_transactions} duplicates)",
            "transactions_count": len(new_transactions),
            "duplicates_count": skipped_transactions
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

   


# Update to main.py - modified get_monthly_summary endpoint

# Add this helper function to your apiClient.js file to ensure the dashboard
# renders the cor

# Endpoint for getting all billing periods (for filters)
@app.get("/api/billing-periods/")
def get_billing_periods(db: Session = Depends(get_db)):
    # Get distinct billing periods
    periods = db.query(Transaction.billing_period).distinct().all()
    
    # Extract values from tuples and filter out None/empty
    periods = [p[0] for p in periods if p[0]]
    
    # Sort by date (most recent first)
    periods.sort(reverse=True)
    
    return periods

# Endpoint for getting all categories (for filters and dropdowns)
@app.get("/api/categories-list/")
def get_categories_list(db: Session = Depends(get_db)):
    # Get distinct main categories
    main_categories = db.query(Transaction.main_category).distinct().all()
    main_categories = [c[0] for c in main_categories if c[0]]
    
    # Create a mapping of main categories to subcategories
    category_structure = {}
    
    for main_cat in main_categories:
        # Get subcategories for this main category
        subcategories = db.query(Transaction.sub_category)\
            .filter(Transaction.main_category == main_cat)\
            .distinct().all()
        
        subcategories = [c[0] for c in subcategories if c[0]]
        category_structure[main_cat] = subcategories
    
    return category_structure

# New endpoint for categories structure
@app.get("/api/categories-structure/")
async def get_categories_structure():
    """Return the full category structure for UI use"""
    try:
        category_structure = transaction_categorizer.get_category_structure()
        return category_structure
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving category structure: {str(e)}")
    
    # Add these endpoints to your main.py file

@app.post("/api/delete-all-transactions/")
def delete_all_transactions(db: Session = Depends(get_db)):
    try:
        # Delete all records from the transactions table
        db.query(Transaction).delete()
        db.commit()
        return {"success": True, "message": "All transactions deleted successfully"}
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}

@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    try:
        # Find the transaction by ID
        transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
            
        # Delete the transaction
        db.delete(transaction)
        db.commit()
        
        return {"success": True, "message": "Transaction deleted successfully"}
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/transactions/{transaction_id}")
def update_transaction(transaction_id: int, transaction_update: TransactionCreate, db: Session = Depends(get_db)):
    try:
        # Find the transaction by ID
        transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
            
                # Update transaction fields
        for key, value in transaction_update.model_dump().items():
            setattr(transaction, key, value)

        # Learn from the updated transaction
        from models import CategoryMapping

        existing = db.query(CategoryMapping).filter(CategoryMapping.keyword == transaction.description).first()

        if existing:
            existing.main_category = transaction_update.main_category
            existing.sub_category = transaction_update.sub_category
            existing.transaction_type = transaction_update.transaction_type
        else:
            new_mapping = CategoryMapping(
                keyword=transaction.description.strip(),
                main_category=transaction_update.main_category,
                sub_category=transaction_update.sub_category,
                transaction_type=transaction_update.transaction_type
            )
            db.add(new_mapping)

            
        db.commit()
        db.refresh(transaction)
        
        return transaction
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    
    # Add these endpoints to your main.py file

from sqlalchemy.orm import Session
from typing import Dict, List

# Define Pydantic models for category operations
class CategoryCreate(BaseModel):
    category: str

class SubcategoryCreate(BaseModel):
    main_category: str
    subcategory: str

class CategoryUpdate(BaseModel):
    old_name: str
    new_name: str

class SubcategoryUpdate(BaseModel):
    main_category: str
    old_name: str
    new_name: str

class CategoryDelete(BaseModel):
    category: str

class SubcategoryDelete(BaseModel):
    main_category: str
    subcategory: str

# Budget schemas
class BudgetCreate(BaseModel):
    month: str  # Format: YYYY-MM
    main_category: str
    sub_category: str
    budget_amount: float

class BudgetUpdate(BaseModel):
    budget_amount: float

class BudgetResponse(BaseModel):
    id: int
    month: str
    main_category: str
    sub_category: str
    budget_amount: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Route to add a new main category
@app.post("/api/add-category/")
async def add_category(
    data: CategoryCreate = Body(...),
    db: Session = Depends(get_db)
):
    try:
        # Get the current category structure
        category_structure = transaction_categorizer.get_category_structure()
        
        # Check if category already exists
        if data.category in category_structure:
            raise HTTPException(status_code=400, detail="Category already exists")
        
        # Add new category to the structure (empty subcategories)
        category_structure[data.category] = []
        
        # Update the categorizer's structure
        transaction_categorizer.category_structure = category_structure
        
        # Save the updated structure to a configuration file if needed
        # This would require implementing a save method in the TransactionCategorizer class
        
        return {"success": True, "message": "Category added successfully"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

# Route to add a new subcategory
@app.post("/api/add-subcategory/")
async def add_subcategory(
    data: SubcategoryCreate = Body(...),
    db: Session = Depends(get_db)
):
    try:
        # Get the current category structure
        category_structure = transaction_categorizer.get_category_structure()
        
        # Check if main category exists
        if data.main_category not in category_structure:
            raise HTTPException(status_code=400, detail="Main category does not exist")
        
        # Check if subcategory already exists
        if data.subcategory in category_structure[data.main_category]:
            raise HTTPException(status_code=400, detail="Subcategory already exists")
        
        # Add new subcategory
        category_structure[data.main_category].append(data.subcategory)
        
        # Update the categorizer's structure
        transaction_categorizer.category_structure = category_structure
        
        # Save the updated structure to a configuration file if needed
        
        return {"success": True, "message": "Subcategory added successfully"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

# Route to update a main category
@app.put("/api/update-category/")
async def update_category(
    data: CategoryUpdate = Body(...),
    db: Session = Depends(get_db)
):
    try:
        # Get the current category structure
        category_structure = transaction_categorizer.get_category_structure()
        
        # Check if old category exists
        if data.old_name not in category_structure:
            raise HTTPException(status_code=400, detail="Category does not exist")
        
        # Check if new category already exists (unless it's the same name)
        if data.new_name in category_structure and data.new_name != data.old_name:
            raise HTTPException(status_code=400, detail="New category name already exists")
        
        # Create new structure with updated key
        updated_structure = {}
        for category, subcategories in category_structure.items():
            if category == data.old_name:
                updated_structure[data.new_name] = subcategories
            else:
                updated_structure[category] = subcategories
        
        # Update the categorizer's structure
        transaction_categorizer.category_structure = updated_structure
        
        # Update categories in existing transactions
        db.query(Transaction).filter(
            Transaction.main_category == data.old_name
        ).update({
            Transaction.main_category: data.new_name
        })
        db.commit()
        
        return {"success": True, "message": "Category updated successfully"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    

@app.get("/api/categories/")
def get_category_report(
    billing_period: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)
    
    # Filter by billing period if provided
    if billing_period:
        query = query.filter(Transaction.billing_period == billing_period)
    
    # Get only expenses (negative amounts)
    query = query.filter(Transaction.amount < 0)
    
    # Get all transactions first
    transactions = query.all()
    
    # Define excluded categories
    excluded_categories = ["לא מסווג", "לא לתזרים"]
    
    # Manually filter out unwanted categories
    filtered_transactions = [
        tx for tx in transactions 
        if tx.main_category not in excluded_categories 
        and tx.sub_category != "לא מסווג"
    ]
    
    # Create category structure from filtered transactions
    main_categories = {}
    for tx in filtered_transactions:
        main_cat = tx.main_category
        sub_cat = tx.sub_category
        
        if main_cat not in main_categories:
            main_categories[main_cat] = {
                "category": main_cat,
                "total": 0,
                "subcategories": {}
            }
        
        # Add to main category total
        main_categories[main_cat]["total"] += abs(tx.amount)
        
        # Add to subcategory
        if sub_cat not in main_categories[main_cat]["subcategories"]:
            main_categories[main_cat]["subcategories"][sub_cat] = 0
        
        main_categories[main_cat]["subcategories"][sub_cat] += abs(tx.amount)
    
    # Convert to list format
    result = []
    for main_cat, data in main_categories.items():
        # Convert subcategories to list
        subcats = []
        for sub_name, sub_total in data["subcategories"].items():
            subcats.append({
                "name": sub_name,
                "amount": sub_total
            })
        
        # Sort subcategories by amount
        subcats.sort(key=lambda x: x["amount"], reverse=True)
        
        # Add to result
        result.append({
            "category": main_cat,
            "total": data["total"],
            "subcategories": subcats
        })
    
    # Sort main categories by total
    result.sort(key=lambda x: x["total"], reverse=True)
    
    return result
    

@app.get("/api/summary/")
def get_monthly_summary(
    billing_period: Optional[List[str]] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)

    if billing_period:
        query = query.filter(Transaction.billing_period.in_(billing_period))

    all_transactions = query.all()

    # Proper filtering of valid transactions
    valid_transactions = [
        tx for tx in all_transactions
        if (tx.main_category or "").strip() not in ["", "לא מסווג", "לא לתזרים"]
        and (tx.sub_category or "").strip() != "לא מסווג"
    ]

    summaries = {}
    for tx in valid_transactions:
        period = tx.billing_period

        if period not in summaries:
            summaries[period] = {
                "Period": period,
                "Income": 0,
                "Expenses": 0,
                "Net": 0,
                "Transactions": 0
            }

        if tx.amount > 0:
            summaries[period]["Income"] += tx.amount
        else:
            summaries[period]["Expenses"] += abs(tx.amount)

        summaries[period]["Net"] += tx.amount
        summaries[period]["Transactions"] += 1

    result = list(summaries.values())
    result.sort(key=lambda x: x["Period"], reverse=True)

    return result


@app.get("/test-alive")
def test_alive():
    return {"message": "Yes, this app is alive and routing!"}



@app.post("/api/transactions/reprocess/")
def reprocess_uncategorized_transactions(db: Session = Depends(get_db)):
    from categorizer import TransactionCategorizer

    categorizer = TransactionCategorizer()
    updated_count = 0

    transactions = db.query(Transaction).filter(
        (Transaction.main_category == "לא מסווג") |
        (Transaction.sub_category == "לא מסווג")
    ).all()

    for tx in transactions:
        main_cat, sub_cat, tx_type = categorizer.categorize_transaction(tx.description, tx.amount, db)
        if (main_cat != "לא מסווג" or sub_cat != "לא מסווג"):
            tx.main_category = main_cat
            tx.sub_category = sub_cat
            tx.transaction_type = tx_type
            updated_count += 1

    db.commit()
    return {"success": True, "updated": updated_count}



@app.get("/debug/routes")
def list_routes():
    from fastapi.routing import APIRoute
    return [
        {"path": route.path, "methods": list(route.methods)}
        for route in app.routes
        if isinstance(route, APIRoute)
    ]


# Add to main.py

@app.get("/api/category-trends/")
def get_category_trends(
    main_category: str,
    sub_category: Optional[str] = None,
    months: int = 12,
    db: Session = Depends(get_db)
):
    """Get time series data for a specific category/subcategory"""
    # Query transactions for the last N months
    query = db.query(Transaction).filter(
        Transaction.main_category == main_category,
        Transaction.amount < 0  # Only expenses
    )
    
    if sub_category:
        query = query.filter(Transaction.sub_category == sub_category)
    
    transactions = query.all()
    
    # Group by billing period and sum amounts
    period_totals = {}
    for tx in transactions:
        if tx.main_category not in ["לא מסווג", "לא לתזרים"]:
            period = tx.billing_period
            if period not in period_totals:
                period_totals[period] = 0
            period_totals[period] += abs(tx.amount)
    
    # Convert to list format sorted by date
    result = []
    for period, amount in period_totals.items():
        result.append({
            "period": period,
            "amount": amount
        })
    
    # Sort by period (you might need to improve this sorting)
    result.sort(key=lambda x: x["period"])
    
    return result

@app.get("/api/all-categories-trends/")
def get_all_categories_trends(
    months: int = 12,
    db: Session = Depends(get_db)
):
    """Get time series data for all categories"""
    transactions = db.query(Transaction).filter(
        Transaction.amount < 0,  # Only expenses
        Transaction.main_category.notin_(["לא מסווג", "לא לתזרים"])
    ).all()
    
    # Group by period and category
    data = {}
    for tx in transactions:
        period = tx.billing_period
        category = tx.main_category
        
        if period not in data:
            data[period] = {}
        
        if category not in data[period]:
            data[period][category] = 0
            
        data[period][category] += abs(tx.amount)
    
    # Convert to array format
    result = []
    for period, categories in data.items():
        period_data = {"period": period}
        period_data.update(categories)
        result.append(period_data)
    
    result.sort(key=lambda x: x["period"])
    return result

# Budget API endpoints
@app.get("/api/budget/averages/")
def get_budget_averages(
    month: str,  # Format: YYYY-MM
    db: Session = Depends(get_db)
):
    """
    Get average spending for each category/subcategory for the last 12 months
    up to the specified month
    """
    try:
        # Parse the target month
        target_date = datetime.strptime(month, "%Y-%m")
        
        # Calculate the start date (12 months before target)
        start_date = target_date.replace(year=target_date.year - 1)
        
        # Get all transactions from the last 12 months up to target month
        transactions = db.query(Transaction).filter(
            Transaction.date >= start_date,
            Transaction.date <= target_date,
            Transaction.amount < 0,  # Only expenses
            Transaction.main_category.notin_(["לא מסווג", "לא לתזרים"])
        ).all()
        
        # Group by category and subcategory, calculate averages
        category_totals = {}
        category_counts = {}
        
        for tx in transactions:
            key = (tx.main_category, tx.sub_category)
            if key not in category_totals:
                category_totals[key] = 0
                category_counts[key] = 0
            
            category_totals[key] += abs(tx.amount)
            category_counts[key] += 1
        
        # Calculate averages
        averages = []
        for (main_cat, sub_cat), total in category_totals.items():
            count = category_counts[(main_cat, sub_cat)]
            if count > 0:
                average = total / count
                averages.append({
                    "main_category": main_cat,
                    "sub_category": sub_cat,
                    "average_amount": round(average, 2),
                    "total_amount": round(total, 2),
                    "transaction_count": count
                })
        
        # Sort by average amount descending
        averages.sort(key=lambda x: x["average_amount"], reverse=True)
        
        return averages
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid month format or calculation error: {str(e)}")

@app.get("/api/budget/user/")
def get_user_budgets(
    month: str,  # Format: YYYY-MM
    db: Session = Depends(get_db)
):
    """
    Get user-defined budgets for the specified month
    """
    budgets = db.query(Budget).filter(Budget.month == month).all()
    
    result = []
    for budget in budgets:
        result.append({
            "id": budget.id,
            "month": budget.month,
            "main_category": budget.main_category,
            "sub_category": budget.sub_category,
            "budget_amount": budget.budget_amount,
            "created_at": budget.created_at,
            "updated_at": budget.updated_at
        })
    
    return result

@app.post("/api/budget/user/")
def create_or_update_budget(
    budget_data: BudgetCreate,
    db: Session = Depends(get_db)
):
    """
    Create or update a user budget for a specific category/subcategory and month
    """
    # Check if budget already exists
    existing_budget = db.query(Budget).filter(
        Budget.month == budget_data.month,
        Budget.main_category == budget_data.main_category,
        Budget.sub_category == budget_data.sub_category
    ).first()
    
    if existing_budget:
        # Update existing budget
        existing_budget.budget_amount = budget_data.budget_amount
        existing_budget.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_budget)
        return existing_budget
    else:
        # Create new budget
        new_budget = Budget(
            month=budget_data.month,
            main_category=budget_data.main_category,
            sub_category=budget_data.sub_category,
            budget_amount=budget_data.budget_amount
        )
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
        return new_budget

@app.get("/api/budget/combined/")
def get_combined_budget_data(
    month: str,  # Format: YYYY-MM
    db: Session = Depends(get_db)
):
    """
    Get combined data: averages + user budgets + actual spending for the month
    """
    # Get averages
    averages = get_budget_averages(month, db)
    
    # Get user budgets
    user_budgets = get_user_budgets(month, db)
    
    # Get actual spending for the month
    try:
        target_date = datetime.strptime(month, "%Y-%m")
        start_date = target_date.replace(day=1)
        if target_date.month == 12:
            end_date = target_date.replace(year=target_date.year + 1, month=1, day=1)
        else:
            end_date = target_date.replace(month=target_date.month + 1, day=1)
        
        actual_transactions = db.query(Transaction).filter(
            Transaction.date >= start_date,
            Transaction.date < end_date,
            Transaction.amount < 0,  # Only expenses
            Transaction.main_category.notin_(["לא מסווג", "לא לתזרים"])
        ).all()
        
        # Calculate actual spending by category/subcategory
        actual_spending = {}
        for tx in actual_transactions:
            key = (tx.main_category, tx.sub_category)
            if key not in actual_spending:
                actual_spending[key] = 0
            actual_spending[key] += abs(tx.amount)
    
    except Exception as e:
        actual_spending = {}
    
    # Combine all data
    combined_data = []
    
    # Create a set of all unique category/subcategory combinations
    all_combinations = set()
    for avg in averages:
        all_combinations.add((avg["main_category"], avg["sub_category"]))
    
    for user_budget in user_budgets:
        all_combinations.add((user_budget["main_category"], user_budget["sub_category"]))
    
    # Build combined data
    for main_cat, sub_cat in all_combinations:
        # Find average
        average_data = next((avg for avg in averages 
                           if avg["main_category"] == main_cat and avg["sub_category"] == sub_cat), None)
        
        # Find user budget
        budget_data = next((budget for budget in user_budgets 
                           if budget["main_category"] == main_cat and budget["sub_category"] == sub_cat), None)
        
        # Find actual spending
        actual_amount = actual_spending.get((main_cat, sub_cat), 0)
        
        combined_data.append({
            "main_category": main_cat,
            "sub_category": sub_cat,
            "average_amount": average_data["average_amount"] if average_data else 0,
            "budget_amount": budget_data["budget_amount"] if budget_data else 0,
            "actual_amount": round(actual_amount, 2),
            "budget_id": budget_data["id"] if budget_data else None,
            "has_budget": budget_data is not None
        })
    
    # Sort by main category, then by sub category
    combined_data.sort(key=lambda x: (x["main_category"], x["sub_category"]))
    
    return combined_data

@app.get("/api/budget/income-averages/")
def get_income_averages(
    month: str,  # Format: YYYY-MM
    db: Session = Depends(get_db)
):
    """
    Get average income for each category/subcategory for the last 12 months
    up to the specified month
    """
    try:
        # Parse the target month
        target_date = datetime.strptime(month, "%Y-%m")
        
        # Calculate the start date (12 months before target)
        start_date = target_date.replace(year=target_date.year - 1)
        
        # Get all income transactions from the last 12 months up to target month
        transactions = db.query(Transaction).filter(
            Transaction.date >= start_date,
            Transaction.date <= target_date,
            Transaction.amount > 0,  # Only income
            Transaction.transaction_type == "הכנסה",
            Transaction.main_category.notin_(["לא מסווג", "לא לתזרים"])
        ).all()
        
        # Group by category and subcategory, calculate averages
        category_totals = {}
        category_counts = {}
        
        for tx in transactions:
            key = (tx.main_category, tx.sub_category)
            if key not in category_totals:
                category_totals[key] = 0
                category_counts[key] = 0
            
            category_totals[key] += tx.amount
            category_counts[key] += 1
        
        # Calculate averages
        averages = []
        for (main_cat, sub_cat), total in category_totals.items():
            count = category_counts[(main_cat, sub_cat)]
            if count > 0:
                average = total / count
                averages.append({
                    "main_category": main_cat,
                    "sub_category": sub_cat,
                    "average_amount": round(average, 2),
                    "total_amount": round(total, 2),
                    "transaction_count": count
                })
        
        # Sort by average amount descending
        averages.sort(key=lambda x: x["average_amount"], reverse=True)
        
        return averages
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid month format or calculation error: {str(e)}")

@app.get("/api/budget/income-combined/")
def get_combined_income_data(
    month: str,  # Format: YYYY-MM
    db: Session = Depends(get_db)
):
    """
    Get combined income data: averages + user budgets + actual income for the month
    """
    # Get income averages
    averages = get_income_averages(month, db)
    
    # Get user budgets for income categories
    user_budgets = get_user_budgets(month, db)
    
    # Get actual income for the month
    try:
        target_date = datetime.strptime(month, "%Y-%m")
        start_date = target_date.replace(day=1)
        if target_date.month == 12:
            end_date = target_date.replace(year=target_date.year + 1, month=1, day=1)
        else:
            end_date = target_date.replace(month=target_date.month + 1, day=1)
        
        actual_transactions = db.query(Transaction).filter(
            Transaction.date >= start_date,
            Transaction.date < end_date,
            Transaction.amount > 0,  # Only income
            Transaction.transaction_type == "הכנסה",
            Transaction.main_category.notin_(["לא מסווג", "לא לתזרים"])
        ).all()
        
        # Calculate actual income by category/subcategory
        actual_income = {}
        for tx in actual_transactions:
            key = (tx.main_category, tx.sub_category)
            if key not in actual_income:
                actual_income[key] = 0
            actual_income[key] += tx.amount
    
    except Exception as e:
        actual_income = {}
    
    # Combine all data
    combined_data = []
    
    # Create a set of all unique category/subcategory combinations
    all_combinations = set()
    for avg in averages:
        all_combinations.add((avg["main_category"], avg["sub_category"]))
    
    for user_budget in user_budgets:
        all_combinations.add((user_budget["main_category"], user_budget["sub_category"]))
    
    # Build combined data
    for main_cat, sub_cat in all_combinations:
        # Find average
        average_data = next((avg for avg in averages 
                           if avg["main_category"] == main_cat and avg["sub_category"] == sub_cat), None)
        
        # Find user budget
        budget_data = next((budget for budget in user_budgets 
                           if budget["main_category"] == main_cat and budget["sub_category"] == sub_cat), None)
        
        # Find actual income
        actual_amount = actual_income.get((main_cat, sub_cat), 0)
        
        combined_data.append({
            "main_category": main_cat,
            "sub_category": sub_cat,
            "average_amount": average_data["average_amount"] if average_data else 0,
            "budget_amount": budget_data["budget_amount"] if budget_data else 0,
            "actual_amount": round(actual_amount, 2),
            "budget_id": budget_data["id"] if budget_data else None,
            "has_budget": budget_data is not None
        })
    
    # Sort by main category, then by sub category
    combined_data.sort(key=lambda x: (x["main_category"], x["sub_category"]))
    
    return combined_data


