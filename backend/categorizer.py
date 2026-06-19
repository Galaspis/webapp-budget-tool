from pathlib import Path
import pandas as pd
import os

class TransactionCategorizer:
    """
    Handles the categorization of transactions based on historical data,
    amount rules, and keyword matching.
    """
    def __init__(self, historical_data_path=None):
        # Special rules for amount-based categorization
        self.amount_rules = {
            'מזרחי טפחות-י': [
                {
                    'amount_range': (0, 100),  # For transactions up to 100 NIS
                    'main_category': 'פיננסי',
                    'sub_category': 'עמלות',
                    'transaction_type': 'הוצאה'
                },
                {
                    'amount_range': (100, float('inf')),  # For larger transactions
                    'main_category': 'אחר',
                    'sub_category': 'אחר',
                    'transaction_type': 'הוצאה'
                }
            ]
        }
        
        # Keyword-based categorization rules for expenses
        self.expense_keyword_rules = {
            'מזון': {
                'keywords': ['סופר', 'מרקט', 'מכולת', 'שופרסל', 'רמי לוי', 'יוחננוף'],
                'main_category': 'קניות',
                'sub_category': 'מזון',
                'transaction_type': 'הוצאה'
            },
            'דלק': {
                'keywords': ['דלק', 'פז', 'סונול', 'תחנת דלק', 'דור אלון'],
                'main_category': 'רכב',
                'sub_category': 'דלק',
                'transaction_type': 'הוצאה'
            },
            'פארם': {
                'keywords': ['סופר פארם', 'פארם', 'be ', 'בי דראגסטור'],
                'main_category': 'קניות',
                'sub_category': 'פארם',
                'transaction_type': 'הוצאה'
            },
            'מסעדות': {
                'keywords': ['מסעדת', 'מסעדה', 'רסטורנט', 'קפה', 'בית קפה'],
                'main_category': 'בילוי',
                'sub_category': 'מסעדות',
                'transaction_type': 'הוצאה'
            },
            'תחבורה': {
                'keywords': ['רב קו', 'אוטובוס', 'רכבת', 'מונית', 'גט'],
                'main_category': 'בילוי',
                'sub_category': 'נסיעות בארץ',
                'transaction_type': 'הוצאה'
            },
            'טלפון': {
                'keywords': ['סלקום', 'פלאפון', 'פרטנר', 'הוט מובייל', 'גולן טלקום'],
                'main_category': 'דיגיטל',
                'sub_category': 'טלפון/אינטרנט',
                'transaction_type': 'הוצאה'
            },
            'ביטוח': {
                'keywords': ['ביטוח ישיר', 'ביטוח', 'הפניקס', 'מגדל', 'כלל', 'מנורה', 'הראל'],
                'main_category': 'פיננסי',
                'sub_category': 'ביטוח דירה',
                'transaction_type': 'הוצאה'
            },
            'ארנונה': {
                'keywords': ['ארנונה', 'עיריית', 'תשלום מיסים'],
                'main_category': 'הוצ\' בית',
                'sub_category': 'ארנונה',
                'transaction_type': 'הוצאה'
            },
            'חשמל': {
                'keywords': ['חברת חשמל', 'חח"י'],
                'main_category': 'הוצ\' בית',
                'sub_category': 'חשמל',
                'transaction_type': 'הוצאה'
            },
            'מים': {
                'keywords': ['תאגיד המים', 'מי אביבים', 'מים'],
                'main_category': 'הוצ\' בית',
                'sub_category': 'מים',
                'transaction_type': 'הוצאה'
            },
        

            'מזון': {
                'keywords': ['סופר', 'מרקט', 'מכולת', 'שופרסל', 'רמי לוי', 'יוחננוף', 
                            'מגה', 'ויקטורי', 'יינות ביתן', 'אושר עד', 'חצי חינם', 
                            'מעדניה', 'מ ח מרכז המזון', 'אושר עד', 'סיטונאות', 'טיים',
                            'מאפיית', 'צרכניית', 'סונדס מרקט', 'כופתא', 'ירקות', 'פירות',
                            'מאפיית השלום', 'מרכול', 'מינימרקט', 'חמיס לשיווק', 'קוקטייל ויין',
                            'סטופמרקט', 'מחסני מזון', 'מחסני השוק', 'מאפה', 'צרכנייה', 'קפה לנדוור'],
                'main_category': 'קניות',
                'sub_category': 'מזון',
                'transaction_type': 'הוצאה'
            },
            
            # Pharmacy
            'פארם': {
                'keywords': ['סופר פארם', 'פארם', 'be ', 'בי דראגסטור', 'בית מרקחת', 
                            'ניו פארם', 'good pharm', 'גוד פארם', 'סלמה פארם'],
                'main_category': 'קניות',
                'sub_category': 'פארם',
                'transaction_type': 'הוצאה'
            },
            
            # Restaurants & Eating Out
            'מסעדות': {
                'keywords': ['מסעדת', 'מסעדה', 'רסטורנט', 'קפה', 'בית קפה', 'מזון', 'פיצה', 
                            'בורגר', 'מקדונלדס', 'רול', 'פלאפל', 'שניצל', 'ארומה', 'קפית', 
                            'בורגרים', 'שאוורמה', 'פנדה פיתה', 'השווארמה', 'בנדיקט', 'דומינוס',
                            'שיפודי', 'יומנגס', 'מאפה נאמן', 'בבקה', 'צ\'יקטי', 'ריבאר',
                            'קופי', 'לנדוור', 'א. א גרציאני', 'פט ויני', 'מ.א מכונות אוטומטיות',
                            'מכונות אוטומטיות', 'סברס-בורוביץ', 'סברס-טכניון', 'buza'],
                'main_category': 'בילוי',
                'sub_category': 'אוכל בחוץ',
                'transaction_type': 'הוצאה'
            },
            
            # Communications & Digital
            'טלפון': {
                'keywords': ['סלקום', 'פלאפון', 'פרטנר', 'הוט מובייל', 'גולן טלקום', 'סלקום שירות',
                            'kidiwatch', 'פון הצפון', 'דולפין'],
                'main_category': 'דיגיטל',
                'sub_category': 'טלפון/אינטרנט',
                'transaction_type': 'הוצאה'
            },
            
            # Insurance
            'ביטוח': {
                'keywords': ['ביטוח ישיר', 'ביטוח', 'הפניקס', 'מגדל', 'כלל', 'מנורה', 'הראל',
                            'איילון', 'שלמה', 'ביטוח יישיר', 'ביטוח חקלאי', 'שירביט',
                            'איי אי גי ביטוח דירה', 'איי.אי.ג\'י ביטוח חיים', 'aig ביטוח',
                            'ביטוח כללי מנורה'],
                'main_category': 'פיננסי',
                'sub_category': 'ביטוח דירה',
                'transaction_type': 'הוצאה'
            },
            
            # Municipal Taxes & Services
            'ארנונה': {
                'keywords': ['ארנונה', 'עיריית', 'תשלום מיסים', 'מ.א עמק יזרעאל'],
                'main_category': 'הוצ\' בית',
                'sub_category': 'ארנונה',
                'transaction_type': 'הוצאה'
            },
            
            # Electricity
            'חשמל': {
                'keywords': ['חברת חשמל', 'חח"י', 'חברת החשמל לישראל'],
                'main_category': 'הוצ\' בית',
                'sub_category': 'חשמל',
                'transaction_type': 'הוצאה'
            },
            
            # Water
            'מים': {
                'keywords': ['תאגיד המים', 'מי אביבים', 'מים', 'יובלי העמק'],
                'main_category': 'הוצ\' בית',
                'sub_category': 'מים',
                'transaction_type': 'הוצאה'
            },
            
            # Car - Fuel
            'דלק': {
                'keywords': ['דלק', 'פז', 'סונול', 'תחנת דלק', 'דור אלון', 'אברך אלון',
                            'פזגז', 'yellow', 'אלונית', 'סונול עומר'],
                'main_category': 'רכב',
                'sub_category': 'דלק',
                'transaction_type': 'הוצאה'
            },
            
            # Car - Road Tolls
            'כביש6': {
                'keywords': ['כביש 6', 'כביש שש'],
                'main_category': 'רכב',
                'sub_category': 'כביש שש',
                'transaction_type': 'הוצאה'
            },
            
            # Car - Maintenance
            'טיפולי_רכב': {
                'keywords': ['מוסך', 'טיפול רכב', 'תיקון רכב', 'מוסך עכו', 'מוסך בית זרזיר'],
                'main_category': 'רכב',
                'sub_category': 'טיפולים',
                'transaction_type': 'הוצאה'
            },
            
            # Car Registration
            'אגרת_רישוי': {
                'keywords': ['משרד התחבורה', 'רשיונות רכ', 'אגרת רישוי'],
                'main_category': 'רכב',
                'sub_category': 'אגרת רישוי',
                'transaction_type': 'הוצאה'
            },

            # Car loan
            'הלוואת_רכב': {
                'keywords': ['הלוואת רכב', 'הלוואה לרכב','מור קופות גמ-י','מור גמל ופנס-י'],
                'main_category': 'רכב',
                'sub_category': 'הלוואה',
                'transaction_type': 'הוצאה'
            },
            
            # Digital Subscriptions
            'מנויים_דיגיטליים': {
                'keywords': ['apple.com', 'itunes', 'google one', 'spotify', 'גוגל אחסון', 
                            'מנוי riseup', 'microsoft', 'xbox', 'yes', 'הטבות פיס'],
                'main_category': 'דיגיטל',
                'sub_category': 'מנויי אינטרנט',
                'transaction_type': 'הוצאה'
            },
            
            # Clothing
            'בגדים': {
                'keywords': ['קסטרו', 'זארה', 'פוקס', 'גולף', 'אורבניקה', 'פוט לוקר', 
                            'אליטל', 'ג\'יפה', 'ביגוד', 'אלוף אינטרנשיונל'],
                'main_category': 'בגדים',
                'sub_category': 'ילדים',
                'transaction_type': 'הוצאה'
            },
            
            # Cigarettes
            'סיגריות': {
                'keywords': ['סנטה קטרינה', 'סיגריות'],
                'main_category': 'קניות',
                'sub_category': 'סיגריות',
                'transaction_type': 'הוצאה'
            },
            
            # Haircuts
            'תספורת': {
                'keywords': ['המספרה', 'יוחאי עיצוב שיער', 'תספורת'],
                'main_category': 'תספורת',
                'sub_category': 'עידו',  # Default to 'עידו' but will need manual review
                'transaction_type': 'הוצאה'
            },
            
            # Garden
            'גינה': {
                'keywords': ['משתלת', 'משתלת מנדא', 'גינה'],
                'main_category': 'הוצ\' בית',
                'sub_category': 'גינה',
                'transaction_type': 'הוצאה'
            },
            
            # Electronics & Household items
            'קניית_מוצרים': {
                'keywords': ['ksp', 'מחסני חשמל', 'איקאה', 'אייס', 'סאפורו', 'amazon',
                            'אמזון', 'אירוקה', 'סם ליין', 'הסטוק', 'לאסט פרייס', 'קדמה',
                            'ביתילי', 'טכנולייט', 'טופולסקי רצף', 'יעד פירזול', 'רהיטי דורון',
                            'פרזול הגליל', 'aliexpress'],
                'main_category': 'קניית מוצרים',
                'sub_category': 'קניית מוצרים',
                'transaction_type': 'הוצאה'
            },
            
            # Home Maintenance
            'תחזוקת_בית': {
                'keywords': ['נעראני מרואן', 'אלי לבן', 'אברהם כהן ידיות', 'פרזול הגליל',
                            'בונה נטופה', 'ע.ע תאורה'],
                'main_category': 'הוצ\' בית',
                'sub_category': 'אחר',
                'transaction_type': 'הוצאה'
            },
            
            # Mortgage
            'משכנתא': {
                'keywords': ['לאומי למשכנת', 'משכנתא','תשלום שובר'],
                'main_category': 'הוצ\' בית',
                'sub_category': 'משכנתא',
                'transaction_type': 'הוצאה'
            },
            
            # Medical and Healthcare
            'בריאות': {
                'keywords': ['קרן מכבי', 'בריאות', 'טיפולים', 'רופאים', 'שיננית', 'תרופות', 'ש ל ה מ שיניים'],
                'main_category': 'בריאות',
                'sub_category': 'תרופות',  # Default to 'תרופות' but some may need manual classification
                'transaction_type': 'הוצאה'
            },
            
            # Bank Fees
            'עמלות_בנק': {
                'keywords': ['עמלת', 'דמי ניהול', 'עמ.ביומן', 'עמלה', 'ריבית חובה', 'מזרחי טפחות', 'עמלת קנ במטח','המרת קנ במטח'],
                'main_category': 'פיננסי',
                'sub_category': 'עמלות',
                'transaction_type': 'הוצאה'
            },
            
            # Pet Care
            'חיות': {
                'keywords': ['הכל לכלב ולחתול', 'הראל הכל לכלב'],
                'main_category': 'חיות',
                'sub_category': 'אוכל',
                'transaction_type': 'הוצאה'
            },
            
            # Sports & Hobbies
            'חוגים': {
                'keywords': ['עמותת הספורט כחול לבן', 'אסף שטנגל אימוני ספורטאי', 'מועצה אזורית עמק יזרעאל',
                            'איגוד הכדורסל', 'בית האומנויות עמק יזרעאל', 'הנוער העובד והלומד'],
                'main_category': 'חוגים',
                'sub_category': 'עמרי',  # Default to 'עמרי' but will need manual review sometimes
                'transaction_type': 'הוצאה'
            },
            
            # Education
            'חינוך': {
                'keywords': ['ויצו נהלל-הורים', 'הטכניון מכון', 'udemy'],
                'main_category': 'חינוך',
                'sub_category': 'גל',  # Default may need manual verification
                'transaction_type': 'הוצאה'
            },
            
            # Entertainment and Travel
            'בילוי_נסיעות': {
                'keywords': ['רשות הטבע והגנים', 'הטבות פיס', 'איבנטבאז', 'אולם יפעת', 'צ.א.אסקייפרום',
                            'א ד קרטינג', 'המרזח הפקות', 'איוונטים', 'זאפה'],
                'main_category': 'בילוי',
                'sub_category': 'אחר',  # Default to 'אחר'
                'transaction_type': 'הוצאה'
            },
            
            # Community Settlement Fees
            'מיסי_יישוב': {
                'keywords': ['מתישבי אלון', 'מיסי יישוב'],
                'main_category': 'הוצ\' בית',
                'sub_category': 'מיסי יישוב+נלווים',
                'transaction_type': 'הוצאה'
            },
            
            # Gift & Celebrations
            'מתנות': {
                'keywords': ['sbi מתנות לאירועים', 'חתונות', 'יום הולדת'],
                'main_category': 'מתנות',
                'sub_category': 'חתונות',
                'transaction_type': 'הוצאה'
            },
            
            # Digital Payment Services
            'תשלומים_דיגיטליים': {
                'keywords': ['bit', 'ביט', 'paybox', 'פייבוקס', 'העברה ב bit','הפועלים-ביט'],
                'main_category': 'אחר',
                'sub_category': 'ביט/פייבוקס',
                'transaction_type': 'הוצאה'
            },
            
            # Cash Withdrawals
            'משיכות_מזומן': {
                'keywords': ['משיכת מזומן', 'משיכת מזומנים', 'כספומט'],
                'main_category': 'אחר',
                'sub_category': 'מזומן',
                'transaction_type': 'הוצאה'
            }
        }
        
        # Enhanced income keyword rules
        enhanced_income_rules = {
            'משכורת_גל': {
                'keywords': ['משכורת גל', 'שכר גל', 'הלן דורון','הלן דורון בע-י'],
                'main_category': 'משכורת',
                'sub_category': 'גל',
                'transaction_type': 'הכנסה'
            },
            'משכורת_מיכל': {
                'keywords': ['משכורת מיכל', 'שכר מיכל', 'מב. הפועלים','מב. הפועלים-י'],
                'main_category': 'משכורת',
                'sub_category': 'מיכל',
                'transaction_type': 'הכנסה'
            },
            'קיצבת_ילדים': {
                'keywords': ['קצבת ילדים', 'ביטוח לאומי', 'ביטל', 'קצבת ילדים-י'],
                'main_category': 'ביטוח לאומי',
                'sub_category': 'קיצבת ילדים',
                'transaction_type': 'הכנסה'
            },
            'שכר_דירה': {
                'keywords': ['שכר דירה', 'שכ"ד', 'דמי שכירות', 'הרצליה', 'מאוצר החייל'],
                'main_category': 'שכר דירה',
                'sub_category': 'הרצליה',
                'transaction_type': 'הכנסה'
            },
            'ניירות_ערך': {
                'keywords': ['דיבידנד', 'ני"ע', 'ניירות ערך', 'מכירת מניות', 'מכירת ני"ע'],
                'main_category': 'מכירת ני"ע',
                'sub_category': 'פיננסי',
                'transaction_type': 'הכנסה'
            },
            'העברה_רמי': {
                'keywords': ['העברה רמי', 'רמי העברה', 'הוראת קבע'],
                'main_category': 'העברה',
                'sub_category': 'רמי',
                'transaction_type': 'הכנסה'
            },
            'מילואים': {
                'keywords': ['מופ"ת מילואי', 'ב"ל מילואים'],
                'main_category': 'אחר',
                'sub_category': 'אחר',
                'transaction_type': 'הכנסה'
            }
        }
        
        # Keyword-based categorization rules for income
        self.income_keyword_rules = {
            'משכורת גל': {
                'keywords': ['משכורת גל', 'שכר גל'],
                'main_category': 'משכורת',
                'sub_category': 'גל',
                'transaction_type': 'הכנסה'
            },
            'משכורת מיכל': {
                'keywords': ['משכורת מיכל', 'שכר מיכל'],
                'main_category': 'משכורת',
                'sub_category': 'מיכל',
                'transaction_type': 'הכנסה'
            },
            'קיצבת ילדים': {
                'keywords': ['קצבת ילדים', 'ביטוח לאומי', 'ביטל'],
                'main_category': 'ביטוח לאומי',
                'sub_category': 'קיצבת ילדים',
                'transaction_type': 'הכנסה'
            },
            'שכר דירה': {
                'keywords': ['שכר דירה', 'שכ"ד', 'דמי שכירות', 'הרצליה','מאוצר החייל-י'],
                'main_category': 'שכר דירה',
                'sub_category': 'הרצליה',
                'transaction_type': 'הכנסה'
            },
            'ניירות ערך': {
                'keywords': ['דיבידנד', 'ני"ע', 'ניירות ערך', 'מכירת מניות'],
                'main_category': 'מכירת ני"ע',
                'sub_category': 'פיננסי',
                'transaction_type': 'הכנסה'
            },
            'העברה רמי': {
                'keywords': ['העברה רמי', 'רמי העברה', 'הוראת קבע'],
                'main_category': 'העברה',
                'sub_category': 'רמי',
                'transaction_type': 'הכנסה'
            }
        }

        
        
        # Define category structure
        self.category_structure = {
            'אחר': ['ביט/פייבוקס', 'ביטוח לאומי', 'בלט"ם', 'לא ידוע', 'מס הכנסה', 'מס על שכר דירה', 'רו"ח דוח שנתי', 'לא לתזרים', 'אחר', 'מזומן'],
            'בגדים': ['הורים', 'ילדים'],
            'בילוי': ['אוכל בחוץ', 'חופשה בארץ', 'מסעדות', 'נסיעות בארץ', 'נסיעות חו״ל'],
            'בריאות': ['טיפולים', 'מכבי', 'רופאים', 'שיננית', 'תרופות'],
            'דיגיטל': ['אפל אחסון', 'גוגל אחסון', 'טלויזיה', 'טלפון/אינטרנט', 'מוזיקה', 'מנויי אינטרנט', 'משחקים ילדים'],
            'הוצ\' בית': ['ארנונה', 'גינה', 'חשמל', 'מזומן', 'מים', 'מיסי יישוב+נלווים', 'משכנתא', 'אחר'],
            'חוגים': ['גל', 'עידו', 'עמרי', 'רומי'],
            'חינוך' :['אחר', 'גל', 'עידו', 'עמרי','רומי'],
            'חיות': ['אוכל', 'טיפולים', 'כלבת'],
            'מתנות': ['חתונות', 'יום הולדת משפחה'],
            'פיננסי': ['ביטוח בריאות', 'ביטוח דירה', 'ביטוח חיים', 'הלוואה', 'עמלות'],
            'קניות': ['מזון', 'סיגריות', 'פארם'],
            'רכב': ['אגרת רישוי', 'ביטוח', 'דלק', 'הלוואה', 'חניון', 'טיפולים', 'כביש שש', 'קנסות', 'שטיפה', 'תיקונים'],
            'תספורת': ['גל', 'מיכל', 'עידו', 'עמרי'],
            'קניית מוצרים': ['קניית מוצרים'],
            'לא לתזרים': ['לא לתזרים'],
            # Income categories
            'משכורת': ['גל', 'מיכל'],
            'ביטוח לאומי': ['קיצבת ילדים'],
            'העברה': ['רמי'],
            'שכר דירה': ['הרצליה'],
            'מכירת ני"ע': ['פיננסי']
        }
        
        # Add savings categories
        self.savings_categories = {
            'פיננסי': ['חיסכון ילדים', 'חיסכון כללי']
        }
        
        # Merge savings categories into main structure
        for main_cat, sub_cats in self.savings_categories.items():
            if main_cat in self.category_structure:
                self.category_structure[main_cat].extend(sub_cats)
            else:
                self.category_structure[main_cat] = sub_cats
        
        # Load historical data if provided
        self.historical_patterns = {}
        if historical_data_path:
            self._load_historical_patterns(historical_data_path)

    def _load_historical_patterns(self, data_path):
        """Load and process historical transaction data for categorization"""
        try:
            if isinstance(data_path, pd.DataFrame):
                df = data_path
            else:
                df = pd.read_csv(data_path, encoding='utf-8')
            
            self.historical_patterns = {}
            # Group by merchant and category to find most frequent categorizations
            groupby_cols = ['description', 'main_category', 'sub_category']
            if 'transaction_type' in df.columns:
                groupby_cols.append('transaction_type')
                
            for _, row in df.groupby(groupby_cols).size().reset_index().iterrows():
                merchant = row['description']
                if merchant not in self.historical_patterns:
                    self.historical_patterns[merchant] = []
                
                pattern = {
                    'main_category': row['main_category'],
                    'sub_category': row['sub_category'],
                    'count': row[0]
                }
                
                if 'transaction_type' in row:
                    pattern['transaction_type'] = row['transaction_type']
                else:
                    pattern['transaction_type'] = 'הוצאה' if row['main_category'] != 'משכורת' else 'הכנסה'
                    
                self.historical_patterns[merchant].append(pattern)
        except Exception as e:
            print(f"Error loading historical patterns: {str(e)}")
            self.historical_patterns = {}

    def _check_amount_rules(self, merchant, amount):
        """Check if merchant+amount combination matches special rules"""
        if merchant in self.amount_rules:
            for rule in self.amount_rules[merchant]:
                min_amount, max_amount = rule['amount_range']
                if min_amount <= abs(amount) < max_amount:
                    return rule['main_category'], rule['sub_category'], rule.get('transaction_type', 'הוצאה' if amount < 0 else 'הכנסה')
        return None, None, None

    def _check_keyword_rules(self, merchant, amount):
        """Check if merchant matches any keyword rules for both income and expense"""
        merchant_lower = merchant.lower()
        
        # Check income rules if amount is positive
        if amount >= 0:
            for rule_name, rule in self.income_keyword_rules.items():
                for keyword in rule['keywords']:
                    if keyword.lower() in merchant_lower:
                        return rule['main_category'], rule['sub_category'], rule['transaction_type']
        
        # Check expense rules if amount is negative
        if amount <= 0:
            for rule_name, rule in self.expense_keyword_rules.items():
                for keyword in rule['keywords']:
                    if keyword.lower() in merchant_lower:
                        return rule['main_category'], rule['sub_category'], rule['transaction_type']
                        
        return None, None, None

    def categorize_transaction(self, merchant, amount, db=None):
        """
        Categorize a transaction based on merchant name and amount.
        Returns tuple of (main_category, sub_category, transaction_type)
        """
        transaction_type = 'הוצאה' if amount < 0 else 'הכנסה'

            # STEP 0: Check for learned DB mapping
        if db:
            main_cat, sub_cat, rule_type = self.categorize_from_db_mapping(merchant, db)
            if main_cat and sub_cat:
                return main_cat, sub_cat, rule_type or transaction_type

        
        # 1. Check amount-based rules first
        main_cat, sub_cat, rule_type = self._check_amount_rules(merchant, amount)
        if main_cat and sub_cat:
            # Don't return לא מסווג from amount rules
            if main_cat != 'לא מסווג':
                return main_cat, sub_cat, rule_type or transaction_type
        
        # 2. Try exact historical match
        if merchant in self.historical_patterns:
            categories = self.historical_patterns[merchant]
            # Filter by transaction type (income/expense) if available
            matching_categories = [c for c in categories if 
                                 (('transaction_type' in c and c['transaction_type'] == transaction_type) or
                                  ('transaction_type' not in c))]
            
            if matching_categories:
                most_frequent = max(matching_categories, key=lambda x: x['count'])
            else:
                most_frequent = max(categories, key=lambda x: x['count'])
                
            if most_frequent['main_category'] != 'לא מסווג' and \
               most_frequent['sub_category'] != 'לא מסווג':
                return most_frequent['main_category'], most_frequent['sub_category'], most_frequent.get('transaction_type', transaction_type)
        
        # 3. Try keyword rules
        main_cat, sub_cat, rule_type = self._check_keyword_rules(merchant, amount)
        if main_cat and sub_cat:
            return main_cat, sub_cat, rule_type or transaction_type
        
        # Default categorization based on transaction type
        if amount >= 0:
            return 'אחר', 'אחר', 'הכנסה'
        else:
            return 'לא מסווג', 'לא מסווג', 'הוצאה'

    def get_category_structure(self):
        """Return the category structure for UI display."""
        return self.category_structure
        
    def get_all_main_categories(self):
        """Return all main categories."""
        return list(self.category_structure.keys())
        
    def get_subcategories(self, main_category):
        """Return subcategories for a given main category."""
        return self.category_structure.get(main_category, [])
    
    def categorize_from_db_mapping(self, merchant, db):
        from models import CategoryMapping

        merchant_lower = merchant.lower()
        mappings = db.query(CategoryMapping).all()

        for mapping in mappings:
            if mapping.keyword and mapping.keyword.lower() in merchant_lower:
                return mapping.main_category, mapping.sub_category, mapping.transaction_type

        return None, None, None
