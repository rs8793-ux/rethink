(function () {
  'use strict';

  const REPLICATE_TOKEN = 'your_token_here';

  const MODEL_VERSION = 'a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf';
  const POLL_INTERVAL_MS = 2000;

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.indexOf(',') >= 0 ? dataUrl.split(',')[1] : dataUrl;
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function createPrediction(base64Image) {
    const body = {
      version: MODEL_VERSION,
      input: {
        image: `data:image/jpeg;base64,${base64Image}`,
        style: 'Claymation',
        prompt: 'a single glowing bioluminescent mushroom, botanical illustration style, dark forest background, soft green glow, detailed cap texture, no humans, no face',
        negative_prompt: 'human, face, person, body, text',
        num_outputs: 1
      }
    };

    return fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
      .then(res => {
        if (!res.ok) throw new Error(`Replicate API error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const getUrl = data.urls && data.urls.get;
        if (!getUrl) throw new Error('No prediction URL in response');
        return getUrl;
      });
  }

  function pollPrediction(getUrl) {
    return fetch(getUrl, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`Replicate poll error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const status = (data.status || '').toLowerCase();
        if (status === 'succeeded' || status === 'successful') {
          const output = data.output;
          if (Array.isArray(output) && output.length > 0) return output[0];
          if (typeof output === 'string') return output;
          throw new Error('No image URL in prediction output');
        }
        if (status === 'failed' || status === 'canceled') {
          throw new Error(data.error || `Prediction ${status}`);
        }
        return null;
      });
  }

  function pollPredictionText(getUrl) {
    return fetch(getUrl, {
      headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` }
    })
      .then(res => {
        if (!res.ok) throw new Error(`Replicate poll error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const status = (data.status || '').toLowerCase();
        if (status === 'succeeded' || status === 'successful') {
          const output = data.output;
          if (typeof output === 'string') return output;
          if (Array.isArray(output) && output.length > 0) return output.join('');
          throw new Error('No text in prediction output');
        }
        if (status === 'failed' || status === 'canceled') {
          throw new Error(data.error || `Prediction ${status}`);
        }
        return null;
      });
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function generateMushroomFromImage(file) {
    return fileToBase64(file)
      .then(base64 => createPrediction(base64))
      .then(getUrl => {
        function poll() {
          return pollPrediction(getUrl).then(result => {
            if (result != null) return result;
            return wait(POLL_INTERVAL_MS).then(poll);
          });
        }
        return poll();
      });
  }

  function createLlamaPrediction(prompt) {
    return fetch('https://api.replicate.com/v1/models/meta/meta-llama-3-8b-instruct/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: { prompt: prompt } })
    })
      .then(res => {
        if (!res.ok) throw new Error(`Replicate API error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const getUrl = data.urls && data.urls.get;
        if (!getUrl) throw new Error('No prediction URL in response');
        return getUrl;
      });
  }

  function extractJsonFromText(text) {
    if (!text || typeof text !== 'string') return null;
    let raw = text.trim();
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) raw = codeBlock[1].trim();
    try {
      return JSON.parse(raw);
    } catch (e) {
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
        } catch (e2) {}
      }
      return null;
    }
  }

  function analyzeDimensions(answers) {
    const responsesText = answers.map(function (a, i) {
      return (i + 1) + '. ' + (a || '').trim();
    }).join('\n\n');

    const prompt = 'You are a behavioral analyst. Analyze these 10 responses NOT for their content, but for HOW they are written. Look for: hesitation, over-explaining, sudden brevity, emotional density, self-awareness. Output ONLY a JSON object with these 8 dimensions scored 0.0 to 1.0: {"openness": 0.5, "vulnerability": 0.5, "energy_direction": 0.5, "giving_tendency": 0.5, "emotional_density": 0.5, "need_for_space": 0.5, "protective_instinct": 0.5, "depth": 0.5}. Note: energy_direction 0=inward, 1=outward.\n\nResponses:\n' + responsesText;

    return createLlamaPrediction(prompt)
      .then(function (getUrl) {
        function poll() {
          return pollPredictionText(getUrl).then(function (result) {
            if (result != null) return result;
            return wait(POLL_INTERVAL_MS).then(poll);
          });
        }
        return poll();
      })
      .then(function (text) {
        const result = extractJsonFromText(text);
        if (result) {
          console.log('User dimensions:', result);
          return result;
        }
        console.warn('Could not parse dimensions JSON from LLaMA response:', text);
        return null;
      });
  }

  window.MYCO = window.MYCO || {};
  window.MYCO.api = { generateMushroomFromImage, analyzeDimensions };
})();
