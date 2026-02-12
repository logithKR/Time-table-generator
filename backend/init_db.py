import models
from database import SessionLocal, engine
from auth import get_password_hash

def init_db():
    print("Initializing database...")
    # Create all tables
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if admin exists
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        print("Creating default admin user...")
        admin_user = models.User(
            username="admin",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        )
        db.add(admin_user)
        db.commit()
    else:
        print("Admin user already exists.")
        
    db.close()
    print("Database initialization complete.")

if __name__ == "__main__":
    init_db()
