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
  let authToken = "YOUR_TOKEN_HERE";

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
