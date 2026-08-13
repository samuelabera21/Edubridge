const result = await fetch("http://localhost:3001/api/auth/sign-up/email", {
    method: "POST",
    headers: { 
        "Content-Type": "application/json",
        "Origin": "http://localhost:3001"
    },
    body: JSON.stringify({
        email: "test2@demo.school.et",
        password: "password123",
        name: "Test User 2"
    })
});
const cookie = result.headers.get("set-cookie");
console.log("Login Status:", result.status);
console.log("Cookie:", cookie);

if (cookie) {
    const authResult = await fetch("http://localhost:3001/api/authorization/me", {
        headers: {
            "Cookie": cookie.split(";")[0], // just the token part
            "Origin": "http://localhost:3001"
        }
    });
    console.log("Auth Status:", authResult.status);
    console.log(await authResult.text());
}
