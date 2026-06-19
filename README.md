# Finance Dashboard

A full-stack web application for managing personal finances, transaction tracking, and budget analysis.

## Features

- Upload and process bank and credit card transaction files (CSV)
- View and filter transactions
- Monthly summary with charts and visualizations
- Category-based expense analysis
- Support for Hebrew and English languages
- Responsive design for desktop and mobile

## Project Structure

The application consists of two main parts:

### Backend (Python FastAPI)

- RESTful API endpoints for transaction processing and data analysis
- SQLite database for local storage
- Data models and processing utilities

### Frontend (React)

- Modern React with functional components and hooks
- Tailwind CSS for styling
- Recharts for data visualization
- Multi-language support with context API
- Responsive UI with mobile support

## Setup Instructions

### Prerequisites

- Python 3.8+ (for backend)
- Node.js 18+ (for frontend)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv backend-env
   source backend-env/bin/activate  # On Windows, use: backend-env\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install fastapi uvicorn sqlalchemy pydantic pandas
   ```

4. Start the backend server:
   ```
   uvicorn main:app --reload
   ```

   The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

   The application will be available at http://localhost:5173

## API Endpoints

- `GET /api/transactions/` - Get all transactions with optional filtering
- `POST /api/transactions/` - Create a new transaction
- `POST /api/upload/` - Upload and process transaction CSV files
- `GET /api/summary/` - Get monthly summary data
- `GET /api/categories/` - Get category report data
- `GET /api/billing-periods/` - Get all available billing periods
- `GET /api/categories-list/` - Get list of all categories and subcategories

## Usage

1. Start by uploading transaction data through the "Upload Transactions" page
2. View and filter your transactions on the "View Transactions" page
3. Analyze your spending with the "Monthly Summary" and "Category Report" pages
4. Adjust settings as needed in the "Settings" page

## Development

### Adding New Features

1. Backend: Add new endpoints in `main.py`
2. Frontend: Create new components in `src/components` or pages in `src/pages`
3. Update API client in `src/api/apiClient.js` for new endpoints

### Database Modifications

1. Update models in `models.py`
2. The SQLAlchemy ORM will handle most migrations automatically
