import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://edubridge_user:edubridge_password@localhost:5434/edubridge'
});

async function seed() {
  await client.connect();
  console.log("Connected to DB");
  
  const orgRes = await client.query('SELECT id FROM "OrganizationUnit" LIMIT 1');
  if (orgRes.rows.length === 0) {
    console.log("No organization found");
    process.exit(1);
  }
  const orgId = orgRes.rows[0].id;

  const roomsRes = await client.query('SELECT id FROM "SchoolResource" LIMIT 1');
  if (roomsRes.rows.length > 0) {
    console.log("Rooms already exist");
    process.exit(0);
  }

  await client.query(`
    INSERT INTO "SchoolResource" (id, "organizationId", name, type, capacity, status, "createdAt", "updatedAt") 
    VALUES 
    (gen_random_uuid(), $1, 'Room 101', 'CLASSROOM', 30, 'AVAILABLE', now(), now()),
    (gen_random_uuid(), $1, 'Room 102', 'CLASSROOM', 30, 'AVAILABLE', now(), now()),
    (gen_random_uuid(), $1, 'Science Lab', 'LAB', 25, 'AVAILABLE', now(), now())
  `, [orgId]);
  
  console.log("Seeded 3 rooms successfully.");
  await client.end();
}

seed().catch(console.error);
