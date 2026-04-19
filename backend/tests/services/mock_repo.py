class MockRepository:
    def __init__(self, data):
        self.data = data
        
    def get_all(self):
        return self.data
    
    def get_by_code(self, code):
        return next((i for i in self.data if getattr(i, 'department_code', None) == code), None)

    def add(self, item):
        self.data.append(item)
        return item
