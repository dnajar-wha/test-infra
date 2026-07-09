const http = require('http');
const port = 3000;

const server = http.createServer((req, res) => {
    const url = req.url;

    // Health endpoint
    if (url === '/api/health' || url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy' }));
        return;
    }

    // Time endpoint
    if (url === '/api/time' || url === '/time') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ time: new Date().toISOString() }));
        return;
    }

    // Version endpoint
    if (url === '/api/version' || url === '/version') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ version: '1.0.0', name: 'api-service' }));
        return;
    }

    // Default - 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, () => {
    console.log(`API server running on port ${port}`);
});