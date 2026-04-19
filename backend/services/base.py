from typing import Callable, Any
from sqlalchemy.orm import Session
from backend.core.exceptions import AppException

class BaseService:
    def __init__(self, db: Session):
        self.db = db

    def execute_transaction(self, logic_block: Callable[[], Any], error_code: str = "TRANSACTION_FAILED", error_msg: str = "Database transaction failed") -> Any:
        """
        Shared transaction manager that wraps a lambda/function block 
        with standard commit/rollback validation.
        """
        try:
            result = logic_block()
            self.db.commit()
            return result
        except AppException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise AppException(status_code=500, error_code=error_code, message=error_msg, details=str(e))
