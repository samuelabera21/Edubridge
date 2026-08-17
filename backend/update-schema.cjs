const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const modelStr = `
model ClassroomObservation {
  id              String   @id @default(cuid())
  organizationId  String
  academicYearId  String
  teacherId       String
  subjectId       String
  schoolGradeId   String
  sectionId       String?
  observerId      String
  
  date            DateTime
  topic           String
  
  strengths       String?  @db.Text
  weaknesses      String?  @db.Text
  recommendations String?  @db.Text
  feedback        String?  @db.Text
  
  followUpAction  String?  @db.Text
  followUpDate    DateTime?
  status          String   @default("SCHEDULED")
  
  organization    OrganizationUnit @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  academicYear    AcademicYear     @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  teacher         Teacher          @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  subject         Subject          @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  schoolGrade     SchoolGrade      @relation(fields: [schoolGradeId], references: [id], onDelete: Cascade)
  section         Section?         @relation(fields: [sectionId], references: [id], onDelete: SetNull)
  observer        User             @relation("ObserverObservations", fields: [observerId], references: [id], onDelete: Cascade)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("classroom_observation")
}
`;

schema += modelStr;

// Now add back relations
function addRelation(modelName, fieldStr) {
    const regex = new RegExp(`(model ${modelName} {[\\s\\S]*?)(createdAt\\s+DateTime)`);
    schema = schema.replace(regex, `$1${fieldStr}\n\n  $2`);
}

addRelation('User', 'observerObservations ClassroomObservation[] @relation("ObserverObservations")');
addRelation('OrganizationUnit', 'classroomObservations ClassroomObservation[]');
addRelation('AcademicYear', 'classroomObservations ClassroomObservation[]');
addRelation('Teacher', 'classroomObservations ClassroomObservation[]');
addRelation('Subject', 'classroomObservations ClassroomObservation[]');
addRelation('SchoolGrade', 'classroomObservations ClassroomObservation[]');
addRelation('Section', 'classroomObservations ClassroomObservation[]');

fs.writeFileSync(schemaPath, schema);
console.log("Schema updated with ClassroomObservation and relations.");
