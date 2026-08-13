const authResult = await fetch("http://localhost:5001/api/authorization/me");
console.log("Status:", authResult.status);
console.log(await authResult.text());
