const fetch = require('node-fetch');
//scratch
async function test() {
    try {
        const res = await fetch("http://localhost:5000/api/academic/grades/cmswarcj1000e2ys4dqyeuljj/sections", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: "A",
                capacity: 50
            })
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}
test();
