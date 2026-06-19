from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
from datetime import datetime

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    description = Column(String, index=True)
    amount = Column(Float)
    reference = Column(String, nullable=True)
    note = Column(String, nullable=True)
    billing_period = Column(String, index=True)
    main_category = Column(String, default="לא מסווג")
    sub_category = Column(String, default="לא מסווג")
    transaction_type = Column(String, default="הוצאה")  # הוצאה (expense) or הכנסה (income)

class CategoryMapping(Base):
    __tablename__ = "category_mappings"

    id = Column(Integer, primary_key=True)
    keyword = Column(String, index=True, nullable=False)
    main_category = Column(String)
    sub_category = Column(String)
    transaction_type = Column(String)

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    month = Column(String, index=True)  # Format: YYYY-MM
    main_category = Column(String, index=True)
    sub_category = Column(String, index=True)
    budget_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)