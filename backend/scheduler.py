import random
from typing import List, Dict, Optional
from models import Subject, Faculty, Classroom, Batch, TimetableEntry

class ScheduleNode:
    def __init__(self, subject: Subject, faculty: Faculty, room: Classroom, batch: Batch, day: str, time_slot: int):
        self.subject = subject
        self.faculty = faculty
        self.room = room
        self.batch = batch
        self.day = day
        self.time_slot = time_slot # hour index (e.g., 0-7 for 9am-5pm)

class TimetableGA:
    def __init__(self, subjects: List[Subject], faculties: List[Faculty], rooms: List[Classroom], batches: List[Batch]):
        self.subjects = subjects
        self.faculties = faculties
        self.rooms = rooms
        self.batches = batches
        self.days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        self.slots_per_day = 8 # 9 AM to 5 PM
        self.population_size = 50
        self.mutation_rate = 0.1
        self.generations = 100

    def generate_random_schedule(self) -> List[ScheduleNode]:
        schedule = []
        for batch in self.batches:
            # For each batch, we need to schedule all subjects for their semester
            batch_subjects = [s for s in self.subjects if s.semester == batch.semester and s.department == batch.department]
            for subject in batch_subjects:
                for _ in range(subject.classes_per_week):
                    # Pick a random faculty who can teach this subject
                    eligible_faculties = [f for f in self.faculties if subject in f.subjects]
                    if not eligible_faculties:
                        continue # Or handle error
                    
                    faculty = random.choice(eligible_faculties)
                    room = random.choice(self.rooms)
                    day = random.choice(self.days)
                    slot = random.randint(0, self.slots_per_day - 1)
                    
                    schedule.append(ScheduleNode(subject, faculty, room, batch, day, slot))
        return schedule

    def calculate_fitness(self, schedule: List[ScheduleNode]) -> float:
        conflicts = 0
        
        # Hard Constraints
        for i in range(len(schedule)):
            node1 = schedule[i]
            
            # 1. Room capacity
            if node1.room.capacity < node1.batch.size:
                conflicts += 1
                
            # 2. Faculty availability (simplified)
            if str(node1.time_slot) not in node1.faculty.availability.get(node1.day, []):
                # Treating availability as indices for now
                pass # conflicts += 1 (Uncomment when real data exists)

            for j in range(i + 1, len(schedule)):
                node2 = schedule[j]
                
                if node1.day == node2.day and node1.time_slot == node2.time_slot:
                    # 3. Batch conflict
                    if node1.batch.id == node2.batch.id:
                        conflicts += 1
                    
                    # 4. Faculty conflict
                    if node1.faculty.id == node2.faculty.id:
                        conflicts += 2 # Higher penalty
                    
                    # 5. Room conflict
                    if node1.room.id == node2.room.id:
                        conflicts += 1
        
        return 1 / (1 + conflicts)

    def evolve(self):
        # Initial population
        population = [self.generate_random_schedule() for _ in range(self.population_size)]
        
        for generation in range(self.generations):
            population.sort(key=lambda s: self.calculate_fitness(s), reverse=True)
            
            best_fitness = self.calculate_fitness(population[0])
            if best_fitness == 1.0:
                print(f"Perfect schedule found at generation {generation}")
                break
            
            new_population = population[:5] # Elitism: keep top 5
            
            while len(new_population) < self.population_size:
                # Tournament Selection
                parent1 = random.choice(population[:20])
                parent2 = random.choice(population[:20])
                
                # Crossover
                child = self.crossover(parent1, parent2)
                
                # Mutation
                if random.random() < self.mutation_rate:
                    self.mutate(child)
                
                new_population.append(child)
            
            population = new_population
            
        return population[0]

    def crossover(self, p1: List[ScheduleNode], p2: List[ScheduleNode]) -> List[ScheduleNode]:
        # Single point crossover
        point = random.randint(0, len(p1) - 1)
        return p1[:point] + p2[point:]

    def mutate(self, schedule: List[ScheduleNode]):
        # Mutate a random node
        idx = random.randint(0, len(schedule) - 1)
        node = schedule[idx]
        
        # Change day or slot
        node.day = random.choice(self.days)
        node.time_slot = random.randint(0, self.slots_per_day - 1)
        
        # Potentially change room
        node.room = random.choice(self.rooms)

