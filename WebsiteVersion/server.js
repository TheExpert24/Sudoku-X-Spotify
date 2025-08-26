const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

const PORT = 8080;

const SPOTIFY_CLIENT_ID = "";
const SPOTIFY_CLIENT_SECRET = "";
const SPOTIFY_REDIRECT_URI = "http://127.0.0.1:8080";

let spotifyTokens = {};

function loadCachedTokens() {
    try {
        const cachePath = require('os').homedir() + '/.spotify_cache';
        if (fs.existsSync(cachePath)) {
            const cacheData = fs.readFileSync(cachePath, 'utf8');
            const tokens = JSON.parse(cacheData);
            if (tokens.access_token) {
                spotifyTokens = tokens;
                console.log('Loaded cached Spotify tokens');
                return true;
            }
        }
    } catch (error) {
        console.log('No cached tokens found');
    }
    return false;
}

function saveCachedTokens(tokens) {
    try {
        const cachePath = require('os').homedir() + '/.spotify_cache';
        fs.writeFileSync(cachePath, JSON.stringify(tokens));
        console.log('Saved Spotify tokens to cache');
    } catch (error) {
        console.error('Failed to save tokens to cache:', error);
    }
}

function getSpotifyAuthUrl() {
    const state = Math.random().toString(36).substring(7);
    const scope = 'user-read-currently-playing user-read-playback-state';
    
    const params = {
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        state: state,
        scope: scope
    };
    
    return `https://accounts.spotify.com/authorize?${querystring.stringify(params)}`;
}

function exchangeCodeForToken(code) {
    return new Promise((resolve, reject) => {
        const postData = querystring.stringify({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: SPOTIFY_REDIRECT_URI
        });

        const options = {
            hostname: 'accounts.spotify.com',
            path: '/api/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const tokenData = JSON.parse(data);
                    resolve(tokenData);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function refreshSpotifyToken(refreshToken) {
    return new Promise((resolve, reject) => {
        const postData = querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
        });

        const options = {
            hostname: 'accounts.spotify.com',
            path: '/api/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const tokenData = JSON.parse(data);
                    resolve(tokenData);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function getCurrentPlayback(accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.spotify.com',
            path: '/v1/me/player',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode === 200) {
                        const playbackData = JSON.parse(data);
                        resolve(playbackData);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    if (pathname === '/spotify-auth') {
        const authUrl = getSpotifyAuthUrl();
        res.writeHead(302, { 'Location': authUrl });
        res.end();
        return;
    }

    if (pathname === '/' && url.searchParams.has('code')) {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        
        if (code) {
            exchangeCodeForToken(code)
                .then(tokenData => {
                    spotifyTokens = tokenData;
                    saveCachedTokens(tokenData);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                            <head><title>Spotify Connected!</title></head>
                            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                                <h1>Spotify Connected Successfully!</h1>
                                <p>You can now close this window and return to the Sudoku game.</p>
                                <script>
                                    setTimeout(() => {
                                        window.close();
                                        if (window.opener) {
                                            window.opener.postMessage('spotify-connected', '*');
                                        }
                                    }, 2000);
                                </script>
                            </body>
                        </html>
                    `);
                })
                .catch(error => {
                    console.error('Spotify token exchange error:', error);
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('<h1>Spotify connection failed</h1>');
                });
        } else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Authorization failed</h1>');
        }
        return;
    }

    if (pathname === '/spotify-current-song') {
        if (!spotifyTokens.access_token) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not authenticated' }));
            return;
        }

        getCurrentPlayback(spotifyTokens.access_token)
            .then(playbackData => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(playbackData));
            })
            .catch(error => {
                console.error('Spotify API error:', error);
                if (spotifyTokens.refresh_token) {
                    refreshSpotifyToken(spotifyTokens.refresh_token)
                        .then(newTokens => {
                            spotifyTokens = { ...spotifyTokens, ...newTokens };
                            saveCachedTokens(spotifyTokens);
                            return getCurrentPlayback(spotifyTokens.access_token);
                        })
                        .then(playbackData => {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(playbackData));
                        })
                        .catch(refreshError => {
                            console.error('Token refresh failed:', refreshError);
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Authentication failed' }));
                        });
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Authentication failed' }));
                }
            });
        return;
    }

    let filePath = pathname === '/' ? './index.html' : '.' + pathname;
    
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - Internal Server Error</h1>');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, async () => {
    console.log(`Sudoku Game Server running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
    
    loadCachedTokens();
});

process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
}); 
