let canvas;
let inputBox;

init();

function init() {
    initInterface();
}

function drawText(response, location) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = "24px Arial";
    ctx.fillStyle = "black";

    const lines = response.split("\n");
    let y = location.y;

    lines.forEach((line) => {
        ctx.fillText(line, location.x, y);
        y += 32;
    });
}

async function askLlama(userQuestion, location) {
    const url = "https://itp-ima-replicate-proxy.web.app/api/create_n_get";
    let authToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImY3NThlNTYzYzBiNjRhNzVmN2UzZGFlNDk0ZDM5NTk1YzE0MGVmOTMiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiSmVzc2ljYSBTdW4iLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS2ttNUtMMGJsb2o3QzgxMlJXRjRzT3hrWVlkMFotTDZQdEdkWkYyalFjY3BfbzdHWT1zOTYtYyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9pdHAtaW1hLXJlcGxpY2F0ZS1wcm94eSIsImF1ZCI6Iml0cC1pbWEtcmVwbGljYXRlLXByb3h5IiwiYXV0aF90aW1lIjoxNzcwMDgzMDc5LCJ1c2VyX2lkIjoiNWgydjJEWkRMSFFzTjJ3MDY2RU96SkE1M3d3MSIsInN1YiI6IjVoMnYyRFpETEhRc04ydzA2NkVPekpBNTN3dzEiLCJpYXQiOjE3NzAwODMwNzksImV4cCI6MTc3MDA4NjY3OSwiZW1haWwiOiJyczg3OTNAbnl1LmVkdSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTAzMTM2Mjk2NTgxMjkzOTgwOTM1Il0sImVtYWlsIjpbInJzODc5M0BueXUuZWR1Il19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.x2jon0_DUH1EHtoUGn4xrhk7q5XrpnEgRqF5D1GF_kEoqUuwbA_mOEIDWr6X8tJoK0Y5T8k_pRGFmDDoMQLoPfbh3dD2qSfSgKU85Rbd-6AtkvoYSR4h8N7QiCz6z7jLZsinJ1BZkaNN3PvayRoQV9DwjMhs1Tz1lFUdylpR4sWgaGwtY41UC2FwRK7byTtVZqd5Q4Eyrp_woS8_FUtBCri6uZOC-2pbQ3tfcHBek4zjtbYpVOtNZ3giJMu2FddiZvR7eAFoaEGSE7dy5fpky7fADcnG_dHvejwNmE4zlPZKZnc5Wattd8-Tjzg9NkS835bJcq7UV6B7xqzSses5YQ";

    const prompt = `Work through this problem step by step:

Q: ${userQuestion}

Return your reasoning as clear steps, then give the final answer at the end.`;

    document.body.style.cursor = "progress";

    const data = {
        model: "meta/meta-llama-3-70b-instruct",
        input: {
            prompt: prompt,
            system_prompt: "You are a helpful assistant that explains reasoning step by step."
        }
    };

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(data)
    };

    const raw_response = await fetch(url, options);
    const json_response = await raw_response.json();

    document.body.style.cursor = "auto";

    const outputText = (json_response.output || []).join("");
    drawText(outputText, location);
}

function initInterface() {
    canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    document.body.appendChild(canvas);

    inputBox = document.createElement("input");
    inputBox.type = "text";
    inputBox.placeholder = "Type a math word problem, press Enter";
    inputBox.style.position = "fixed";
    inputBox.style.left = "50%";
    inputBox.style.top = "20px";
    inputBox.style.transform = "translateX(-50%)";
    inputBox.style.fontSize = "24px";
    inputBox.style.zIndex = "10";
    inputBox.style.width = "70%";
    inputBox.setAttribute("autocomplete", "off");
    document.body.appendChild(inputBox);

    inputBox.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            const userQuestion = inputBox.value.trim();
            if (userQuestion.length === 0) return;

            askLlama(userQuestion, { x: 80, y: 120 });
        }
    });

    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

