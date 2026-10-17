import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudentProfileView } from './student-profile';

test('buildStudentProfileView flattens a real student profile', () => {
  const profile = {
    id: 'student-1',
    studentId: 'STU-2048',
    firstName: 'Aisha',
    lastName: 'Johnson',
    fatherName: 'Adam',
    grandfatherName: 'Yohannes',
    dateOfBirth: '2014-04-12T00:00:00.000Z',
    gender: 'FEMALE',
    nationality: 'Ethiopian',
    placeOfBirth: 'Addis Ababa',
    photoUrl: 'https://cdn.example.com/aisha.png',
    region: 'Addis Ababa',
    zone: 'Bole',
    woreda: 'Kirkos',
    city: 'Addis Ababa',
    kebele: '12',
    houseNumber: '88',
    previousSchool: 'Bright Academy',
    previousStudentId: 'B-118',
    emergencyContactName: 'Marta Johnson',
    emergencyContactRelation: 'Mother',
    emergencyContactPhone: '+251911000000',
    enrollments: [{
      id: 'enr-1',
      status: 'ACTIVE',
      enrollmentDate: '2026-09-01T00:00:00.000Z',
      academicYear: { name: '2026/2027' },
      schoolGrade: { grade: { name: 'Grade 5' } },
      section: { name: 'A' },
      organization: { name: 'EduBridge Academy' }
    }]
  };

  const view = buildStudentProfileView(profile);

  assert.equal(view.fullName, 'Aisha Johnson');
  assert.equal(view.studentId, 'STU-2048');
  assert.equal(view.photoUrl, 'https://cdn.example.com/aisha.png');
  assert.equal(view.schoolName, 'EduBridge Academy');
  assert.equal(view.gradeName, 'Grade 5');
  assert.equal(view.sectionName, 'A');
  assert.equal(view.academicYear, '2026/2027');
  assert.equal(view.emergencyContactName, 'Marta Johnson');
  assert.equal(view.isReadOnly, true);
});
