import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);
const llmApiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
const llmApiKey = process.env.LLM_API_KEY || '';
const llmModel = process.env.LLM_MODEL || 'gpt-4.1-mini';

const systemPrompt = [
  'You are a pedagogical coding assistant.',
  'Help the user think critically, understand tradeoffs, and learn by reasoning.',
  'Do not provide the full answer if a hint, question, or explanation would better support learning.',
  'Avoid giving code unless it is truly necessary.',
  'When code is helpful, keep it minimal and explain why it works.',
  'Be concise, supportive, and interactive.'
].join(' ');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon']
]);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

function safeJoin(baseDir, requestPath) {
  const normalized = path.normalize(decodeURIComponent(requestPath)).replace(/^([.][.][/\\])+/, '');
  const joined = path.join(baseDir, normalized);
  if (!joined.startsWith(baseDir)) {
    return null;
  }
  return joined;
}

async function serveFile(req, res, filePath) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return false;
    }
    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes.get(extension) || 'application/octet-stream';
    const fileBuffer = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileBuffer.length
    });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(fileBuffer);
    }
    return true;
  } catch {
    return false;
  }
}

async function handleChat(req, res) {
  if (!llmApiKey) {
    return sendJson(res, 500, {
      error: 'LLM_API_KEY is not set.'
    });
  }

  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) {
      return sendJson(res, 413, { error: 'Request too large.' });
    }
  }

  let message;
  try {
    message = JSON.parse(body);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON body.' });
  }

  const userText = String(message?.text || '').trim();
  if (!userText) {
    return sendJson(res, 400, { error: 'Missing text.' });
  }

  const response = await fetch(llmApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${llmApiKey}`
    },
    body: JSON.stringify({
      model: llmModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      temperature: 0.4
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return sendJson(res, response.status, {
      error: 'LLM API request failed.',
      details: errorText.slice(0, 2000)
    });
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    return sendJson(res, 502, {
      error: 'LLM API returned no answer.'
    });
  }

  return sendJson(res, 200, { reply });
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    if (req.method === 'POST' && requestUrl.pathname === '/api/chat') {
      return handleChat(req, res);
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      const requestPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
      const filePath = safeJoin(publicDir, requestPath);
      if (filePath && (await serveFile(req, res, filePath))) {
        return;
      }
    }

    sendJson(res, 404, { error: 'Not found.' });
  } catch (error) {
    sendJson(res, 500, {
      error: 'Unexpected server error.',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(port, () => {
  console.log(`HAII listening on http://localhost:${port}`);
});
