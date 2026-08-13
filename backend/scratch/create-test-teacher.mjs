const result = await fetch("http://localhost:5001/api/auth/sign-up/email", {
    method: "POST",
    headers: { 
        "Content-Type": "application/json",
        "Origin": "http://localhost:3001"
    },
    body: JSON.stringify({
        email: "teacher@demo.school.et",
        password: "password123",
        name: "Demo Teacher"
    })
});
const text = await result.text();
console.log(result.status);
console.log(text);
