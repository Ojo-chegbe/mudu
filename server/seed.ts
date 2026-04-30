import { initDatabase, seedIfEmpty } from "./db";

initDatabase();
const ids = seedIfEmpty();

console.log("Seed complete");
console.log(`Exam ID: ${ids.examId}`);
console.log(`Roster ID: ${ids.rosterId}`);
