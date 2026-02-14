import models
from database import SessionLocal, engine

def init_db():
    print("Initializing database...")
    # Create all tables
    models.Base.metadata.create_all(bind=engine)
    
    # User model references removed as they were broken
        
    db = SessionLocal()
    db.close()
    print("Database initialization complete.")

if __name__ == "__main__":
    init_db()
