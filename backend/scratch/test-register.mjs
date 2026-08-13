const result = await fetch("http://localhost:5001/api/auth/sign-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        email: "admin@demo.school.et",
        password: "password123",
        name: "admin"
    })
});
const text = await result.text();
console.log(result.status, text);
