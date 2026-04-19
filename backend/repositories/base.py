from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.orm import Session
from pydantic import BaseModel

ModelType = TypeVar("ModelType")

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], db: Session):
        """
        Base Repository enforcing Dependency Injection of Session.
        It encapsulates data access logic without managing transactions.
        """
        self.model = model
        self.db = db

    def get(self, id: any) -> Optional[ModelType]:
        return self.db.query(self.model).filter(self.model.id == id).first()

    def get_all(self) -> List[ModelType]:
        return self.db.query(self.model).all()

    def add(self, obj: ModelType) -> ModelType:
        self.db.add(obj)
        # Flush to get the ID without committing the transaction
        self.db.flush()
        return obj

    def delete(self, obj: ModelType) -> None:
        self.db.delete(obj)
