INSERT INTO "school_resource" (id, "organizationId", name, type, capacity, status, "createdAt", "updatedAt") 
SELECT gen_random_uuid(), id, 'Room 101', 'CLASSROOM', 30, 'AVAILABLE', now(), now() FROM "OrganizationUnit" LIMIT 1; 

INSERT INTO "school_resource" (id, "organizationId", name, type, capacity, status, "createdAt", "updatedAt") 
SELECT gen_random_uuid(), id, 'Room 102', 'CLASSROOM', 30, 'AVAILABLE', now(), now() FROM "OrganizationUnit" LIMIT 1; 

INSERT INTO "school_resource" (id, "organizationId", name, type, capacity, status, "createdAt", "updatedAt") 
SELECT gen_random_uuid(), id, 'Science Lab', 'LAB', 25, 'AVAILABLE', now(), now() FROM "OrganizationUnit" LIMIT 1;
