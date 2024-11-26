import fs from 'fs/promises';
import express, { Request, Response } from 'express';
import compression from 'compression';
import rateLimit from 'express-rate-limit'
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import * as mm from 'music-metadata';
import AudioPlayer from './raStreamer.js';
import path from 'path';
import { fileURLToPath } from 'url';
// const systemctl = require('systemctl');
import child_process from 'child_process';
import dbi from './dbi.js';
import NEU from './utils.js';
import BluetoothManager from './bluetoothmgmr.js';
const bluetoothManager = new BluetoothManager;
const neu = new NEU;
const app = express();
const __filename = fileURLToPath(import.meta.url); // Get the full file path
const __dirname = path.dirname(__filename); // Get the directory name
const DEFAULT_PORT = 3000;
const rawPort = process.env.EN_PORT; // Read from environment variable
const PORT = rawPort && !isNaN(parseInt(rawPort, 10)) ? parseInt(rawPort, 10) : DEFAULT_PORT;
const HOST = process.env.EN_HOST || '0.0.0.0'
const publicPath = path.join(__dirname, '../public')
const db = new dbi;
const ap = setupAudio();
let clients: { id: string; res: Response }[] = [];

// Will create DB if it doesn't exist, or skip creation if it does
db.name = 'library';
// db.createDB();
const libraryTableSchema: Record<string, string> = {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    title: 'TEXT NOT NULL', // Track title
    artist: 'TEXT', // Artist or band name
    album: 'TEXT', // Album name
    genre: 'TEXT', // Genre
    duration: 'INTEGER NOT NULL', // Duration in seconds
    file_path: 'TEXT', // Path to local file
    url: 'TEXT', // URL for streamed track
    track_number: 'INTEGER', // Track number within the album
    release_date: 'TEXT', // Release date in ISO format
    play_count: 'INTEGER DEFAULT 0', // Number of times played
    last_played: 'TEXT', // Timestamp of last played (nullable)
    rating: 'INTEGER', // Rating (1-5, nullable)
    lyrics: 'TEXT', // Lyrics as a string
    is_favorite: 'BOOLEAN DEFAULT FALSE', // Favorite flag
    artwork_path: 'TEXT', // Path to album artwork
    bitrate: 'INTEGER', // Bitrate in kbps (nullable)
    sample_rate: 'INTEGER', // Sample rate in Hz (nullable)
    codec: 'TEXT', // Audio codec (e.g., "MP3")
    added_date: 'TEXT NOT NULL', // Date when the track was added
};

// Create the library table (will skip if it already exists)
// db.createTable('library', libraryTableSchema).catch((result) => {
//     console.error('Table creation results', result);
// });

// Middleware
// Configure rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiter to all api requests
app.use('/api', limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Middleware for parsing URL-encoded data
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// Serve static files from the "public" directory 
app.use(express.static(publicPath));
app.set('view engine', 'ejs');

// Enable Gzip compression
app.use(compression());

// Handle errors gracefully
app.use((err: Error, req: Request, res: Response, next: Function) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

// Create an event emitter for SSE
const sseEmitter = new EventEmitter();

// Cleanup DB, etc on shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    db.closeDB(); // Assuming `db.close()` is a method in `dbi`
    await ap.quit();
    process.exit(0);
});

// Routes
app.get('/', (req: Request, res: Response) => {
  res.render('index');
});

app.get('/api/v1/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = uuidv4();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    console.log(`Client connected: ${clientId}`);
    console.log(`Clients connected: ${clients.length}`);
    res.write(`data: Connected as client ${clientId}\n\n`);
    res.flush();

    const intervalId = setInterval(() => {
        try {
            res.write('data: ping\n\n'); // Send a comment to keep the connection alive
            res.flush();
        } catch (error) {
            console.error(`Error sending ping to client ${clientId}:`, error);
            clearInterval(intervalId);
        }
    }, 15000); // Every 15 seconds

    req.on('close', () => {
        console.log(`Client disconnected: ${clientId}`);
        clearInterval(intervalId);
        // Safely remove client
        clients = clients.filter((client) => client.id !== clientId);
        console.log(`Clients connected: ${clients.length}`);
    });
});

// Example route to trigger an SSE event
app.post('/api/v1/trigger', (req: Request, res: Response) => {
    const message = req.body.message || 'Default message';
    notifyClients('message', message);
    res.json({ success: true, message: 'Event triggered' });
});

// Send SSE to all connected clients
sseEmitter.on('newEvent', (eventName, data) => {
    const eventMessage = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    console.log(`Event ${eventName} recieved, emitting to all clients`);
    clients.forEach((client) => {
        console.log(`Emitting event "${eventName}" to client ${client.id}`);
        client.res.write(eventMessage);
        client.res.flush();
    });
});

// Helper function to emit SSE to all connected clients
export default function notifyClients(eventName: string, data: any) {
    console.log(`Sending event "${eventName}" to all clients`);
    sseEmitter.emit('newEvent', eventName, data);
}

app.get('/api/v1/:category/*', (req: Request<{ category: string}>, res: Response) => {
    const { category } = req.params; // Extract category from the URL
    const pathSegments = req.path.split('/');
    const urlPath = pathSegments.length > 4 ? pathSegments.slice(4).join('/') : ''; // Extract rest of the path
    const query = req.query as Record<string, any>;
    const matchedAction = matchApiAction(category, urlPath);
    if (matchedAction && matchedAction.action) {
        matchedAction.action(query, res);
    } else {
        console.error('Invalid API action')
        res.status(500).json({ success: false, message: 'Invalid API action' });
    }
});

// Start the server
app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});

interface UrlPath {
    path: string;
    action: (query: Record<string, any>, res: Response) => Promise<void>;
}

interface ApiAction {
    category: string;
    urlPaths: UrlPath[];
}

function setupAudio(): AudioPlayer {
    const ap = new AudioPlayer;

    // Register event listeners for the audio player
    ap.onEvent('started', () => {
        console.log('OnEvent: Playback started');
        notifyClients('playbackStarted', 'Audio playback has started');
    });

    ap.onEvent('paused', () => {
        console.log('OnEvent: Playback paused');
        notifyClients('playbackPaused', 'Audio playback has been paused');
    });

    ap.onEvent('resumed', () => {
        console.log('OnEvent: Playback resumed');
        notifyClients('playbackResumed', 'Audio playback has resumed');
    });

    ap.onEvent('stopped', () => {
        console.log('OnEvent: Playback has stopped');
        notifyClients('playbackStopped', 'Audio playback has stopped');
    });

    ap.onEvent('timeposition', (seconds: number) => {
        console.log('OnEvent: Playback time:', seconds);
        notifyClients('playbackTime', seconds);
    });

    ap.onEvent('seek', (info) => {
        console.log('OnEvent: Seek:', info);
        notifyClients('playbackSeek', info);
    });

    ap.onEvent('statuschange', (status) => {
        console.log('OnEvent: Status change:', status);
        notifyClients('playbackStatus', status);
    });

    return ap;
}





// Helper function to match the API action
function matchApiAction(category: string, path: string): UrlPath | null {
    // Find the catergory in apiActions
    const categoryAction = apiActions.find((action) => action.category === category);

    if (!categoryAction) {
        console.error(`Category "${category}" not found.`);
        return null;
    }

    // Find the urlPath in the matched category
    const urlPath = categoryAction.urlPaths.find((u) => u.path === path);

    if (!urlPath) {
        console.error(`Path "${path}" not found under category "${category}".`);
        return null;
    }

    return urlPath; // Return the matching urlPath object
}

// Helper function to save artwork to disk
async function saveArtwork(picture: any): Promise<string | null> {
    if (!picture || !picture.data || !picture.format) return null;
    const artworkPath = path.join('artwork', `${Date.now()}.${picture.format.split('/').pop()}`);
    await fs.writeFile(artworkPath, picture.data);
    return artworkPath;
}

// Define API actions
const apiActions: ApiAction[] = [
    {
        category: 'play',
        urlPaths: [
            {
                path: 'remote',
                action: async (query: { url?: string }, res: Response) => {
                    if (!query.url) {
                        res.status(400).json({ success: false, message: 'Missing URL parameter.' });
                        return;
                    }
                    const url = query.url;
                    try {
                        const tmpFile = await ap.fetchFile(url);
                        if (tmpFile) {
                            console.log('Audio Playback initiated', url);
                            ap.playSound(tmpFile);
                            res.json({ success: true });
                        } else {
                            console.error('Failed to fetch the file.');
                            res.status(500).json({ success: false, message: 'Failed to fetch the file.' });
                        }
                    } catch (err) {
                        console.error('Error during audio playback:', err);
                        res.status(500).json({ success: false, message: 'Error during audio playback.' });
                    }
                }
            },
            {
                path: 'local',
                action: async (query: { file?: string }, res: Response) => {
                    if (!query.file) {
                        res.status(400).json({ success: false, message: 'Missing file parameter.' });
                        return;
                    }
                    const file = query.file;
                    try {
                        console.log('Audio Playback initiated', file);
                        ap.playSound(file);
                        res.json({ success: true });
                    } catch (err) {
                        console.error('Error during audio playback:', err);
                        res.status(500).json({ success: false, message: 'Error during audio playback.' });
                    }
                }
            }
        ],
    },
    {
        category: 'content',
        urlPaths: [
            {
                path: 'get',
                action: async (query: { page?: string }, res: Response) => {
                    try {
                        const page = query.page ? query.page : '';
                        console.log('Rendering page:', page);

                        res.render(page, (err: Error | null, html?: string) => {
                            if (err) {
                                console.error('Error rendering page:', err);
                                res.status(400).json({ success: false, message: err.message });
                            } else {
                                console.log('HTML:', html);
                                res.status(200).json({ success: true, content: html });
                            }
                        });
                    } catch (err) {
                        res.status(400).json({ success: false, message: (err as Error).message });
                    }
                }
            }
        ]
    },
    {
        category: 'transport',
        urlPaths: [
             {
                path: 'pausetoggle',
                action: async (query, res: Response) => {
                    try {
                        ap.pauseOrResume();
                        res.status(200).json({ success: true, message: 'Pause/Resume Toggled'})
                    } catch (err) {
                        res.status(400).json({ success: false, message: err });
                    }
                }
            }
        ]
    },
    {
        category: 'library',
        urlPaths: [
            {
                path: 'get',
                action: async (query: { filter?: string }, res: Response) => {
                    try {
                        const libraryRows = await db.queryRows('library')
                        res.status(200).json({ success: true, data: libraryRows });
                    } catch (err) {
                        res.status(400).json({ success: false, message: err });
                    }
                }
            },
            {
                path: 'scanfolder',
                action: async (query: { folder?: string }, res: Response) => {
                    try {
                        const folderPath = query.folder || path.resolve(process.cwd());
                        const files = await neu.listFolder(folderPath);

                        const metadataPromises = files.map(async (file) => {
                            try {
                                const metadata = await mm.parseFile(file);

                                const common = metadata.common || {};
                                const format = metadata.format || {};

                                // Map metadata to libraryTableSchema
                                return {
                                    title: common.title || 'Unknown',
                                    artist: common.artist || 'Unknown',
                                    album: common.album || 'Unknown',
                                    genre: common.genre?.join(', ') || 'Unknown',
                                    duration: Math.floor(format.duration || 0),
                                    file_path: file,
                                    url: null, // Placeholder for streamed tracks, if applicable
                                    track_number: common.track?.no || null,
                                    release_date: common.year?.toString() || null,
                                    play_count: 0,
                                    last_played: null,
                                    rating: null,
                                    lyrics: common.lyrics?.join('\n') || null,
                                    is_favorite: false,
                                    artwork_path: common.picture?.[0]?.data ? saveArtwork(common.picture[0]) : null,
                                    bitrate: format.bitrate ? Math.floor(format.bitrate / 1000) : null, // Convert to kbps
                                    sample_rate: format.sampleRate || null,
                                    codec: format.codec || 'Unknown',
                                    added_date: new Date().toISOString(),
                                };
                            } catch (error) {
                                console.error(`Error parsing file "${file}":`, error);
                                return { file, error: error };
                            }
                        });

                        const metadataResults = await Promise.all(metadataPromises);

                        res.status(200).json(metadataResults);
                    } catch (error) {
                        console.error('Error scanning folder:', error);
                        res.status(500).json({ error: 'Failed to scan folder' });
                    }
                } 
            }
        ]
    },
    {
        category: 'admin',
        urlPaths: [
            {
                path: 'logs',
                action: async (query: { log?: string }, res: Response) => {
                    if (!query.log) {
                        res.status(400).json({ success: false, message: 'Missing log parameter.' });
                        return;
                    }
                    const logName = query.log;
                    const safePath = path.resolve('/tmp', logName);

                    // Security check to prevent directory traversal
                    if (!safePath.startsWith('/tmp')) {
                        res.status(400).json({ success: false, message: 'Invalid file path.' });
                        return;
                    }
                    console.log(logName);
                    try {
                        const log = await fs.readFile(safePath, 'utf-8');
                        const lines = log.split(/\r?\n|\r/);
                        res.json(lines)
                    } catch (err) {
                        console.error('Error reading log file:', err);
                        res.status(500).json({ success: false, message: 'Error reading log file.' });
                    }
                }
            },
            {
                path: 'restartservice',
                action: async (query: { service?: string }, res: Response) => {
                    if (!query.service) {
                        res.status(400).json({ success: false, message: 'Missing service parameter.' });
                        return;
                    }
                    const serviceName = query.service;
                    try {
                        const restartService = child_process.execSync(`systemctl --user restart ${serviceName}`);
                        console.log(restartService.toString());
                        res.json({ success: true, message: `${serviceName} restarted successfully.` });
                    } catch (err) {
                        console.error('Error restarting service:', err);
                        res.status(500).json({ success: false, message: 'Error restarting service.' });
                    }
                }
            },
            {
                path: 'startservice',
                action: async (query: { service?: string }, res: Response) => {
                    if (!query.service) {
                        res.status(400).json({ success: false, message: 'Missing service parameter.' });
                        return;
                    }
                    const serviceName = query.service;
                    try {
                        const startService = child_process.execSync(`systemctl --user start ${serviceName}`);
                        console.log(startService.toString());
                        res.json({ success: true, message: `${serviceName} started successfully.` });
                    } catch (err) {
                        console.error('Error starting service:', err);
                        res.status(500).json({ success: false, message: 'Error starting service.' });
                    }
                }
            },
            {
                path: 'stopservice',
                action: async (query: { service?: string }, res: Response) => {
                    if (!query.service) {
                        res.status(400).json({ success: false, message: 'Missing service parameter.' });
                        return;
                    }
                    const serviceName = query.service;
                    try {
                        const stopService = child_process.execSync(`systemctl --user stop ${serviceName}`);
                        console.log(stopService.toString());
                        res.json({ success: true, message: `${serviceName} stopped successfully.` });
                    } catch (err) {
                        console.error('Error stopping service:', err);
                        res.status(500).json({ success: false, message: 'Error stopping service.' });
                    }
                }
            },
            {
                path: 'statusservice',
                action: async (query: { service?: string }, res: Response) => {
                    if (!query.service) {
                        res.status(400).json({ success: false, message: 'Missing service parameter.' });
                        return;
                    }
                    const serviceName = query.service;
                    try {
                        const statusService = child_process.execSync(`systemctl --user status ${serviceName}`);
                        console.log(statusService.toString());
                        res.json({ success: true, message: `${serviceName} status retrieved successfully.`, status: statusService.toString() });
                    } catch (err) {
                        const errorOutput = (err as any).stdout ? (err as any).stdout.toString() : '';
                        const isInactive = errorOutput.includes('inactive') || errorOutput.includes('dead') || errorOutput.includes('not running') || errorOutput.includes('failed') || errorOutput.includes('exited') || errorOutput.includes('killed');
                        if (isInactive) {
                            console.log(errorOutput);
                            res.json({ success: true, message: `${serviceName} is not running.`, status: errorOutput });
                        } else {
                            res.status(500).json({ success: false, message: 'Error retrieving service status.', status: null });
                        }
                    }
                }
            },
            {
                path: 'reboot',
                action: async (query, res: Response) => {
                    try {
                        const reboot = child_process.execSync('sudo reboot');
                        console.log(reboot.toString());
                        res.json({ success: true, message: 'Rebooting...' });
                    } catch (err) {
                        console.error('Error rebooting:', err);
                        res.status(500).json({ success: false, message: 'Error rebooting.' });
                    }
                }
            },
        ]
    },
    {
        category: 'bluetooth',
        urlPaths: [
            {
                path: 'metadata',
                action: async (query, res: Response) => {
                    try {
                        const playerPath = await bluetoothManager.getConnectedMediaPlayer();
                        if (playerPath) {
                            const metadata = await bluetoothManager.getMetadata(playerPath);
                            res.json({ success: true, metadata });
                        } else {
                            res.status(404).json({ success: false, message: 'No connected media player found.' });
                        }
                    } catch (err) {
                        console.error('Error fetching metadata:', err);
                        res.status(500).json({ success: false, message: 'Error fetching metadata.' });
                    }
                },
            },
            {
                path: 'devices',
                action: async (query, res: Response) => {
                    try {
                        const devices = await bluetoothManager.listDevices();
                        res.json({ success: true, devices });
                    } catch (err) {
                        console.error('Error listing devices:', err);
                        res.status(500).json({ success: false, message: 'Error listing devices.' });
                    }
                },
            },
            {
                path: 'discovery/start',
                action: async (query, res: Response) => {
                    try {
                        await bluetoothManager.startDiscovery();
                        res.json({ success: true, message: 'Discovery started.' });
                    } catch (err) {
                        console.error('Error starting discovery:', err);
                        res.status(500).json({ success: false, message: 'Error starting discovery.' });
                    }
                },
            },
            {
                path: 'discovery/stop',
                action: async (query, res: Response) => {
                    try {
                        await bluetoothManager.stopDiscovery();
                        res.json({ success: true, message: 'Discovery stopped.' });
                    } catch (err) {
                        console.error('Error stopping discovery:', err);
                        res.status(500).json({ success: false, message: 'Error stopping discovery.' });
                    }
                },
            },
            {
                path: 'device/pair',
                action: async (query, res: Response) => {
                    const { devicePath } = query;
                    try {
                        await bluetoothManager.pairDevice(devicePath);
                        res.json({ success: true, message: `Device ${devicePath} paired successfully.` });
                    } catch (err) {
                        console.error(`Error pairing device ${devicePath}:`, err);
                        res.status(500).json({ success: false, message: `Error pairing device ${devicePath}.` });
                    }
                },
            },
            {
                path: 'device/connect',
                action: async (query, res: Response) => {
                    const { devicePath } = query;
                    try {
                        await bluetoothManager.connectDevice(devicePath);
                        res.json({ success: true, message: `Device ${devicePath} connected successfully.` });
                    } catch (err) {
                        console.error(`Error connecting device ${devicePath}:`, err);
                        res.status(500).json({ success: false, message: `Error connecting device ${devicePath}.` });
                    }
                },
            },
            {
                path: 'device/unpair',
                action: async (query, res: Response) => {
                    const { devicePath } = query;
                    try {
                        await bluetoothManager.unpairDevice(devicePath);
                        res.json({ success: true, message: `Device ${devicePath} unpaired successfully.` });
                    } catch (err) {
                        console.error(`Error unpairing device ${devicePath}:`, err);
                        res.status(500).json({ success: false, message: `Error unpairing device ${devicePath}.` });
                    }
                },
            },
            {
                path: 'pin',
                action: async (query, res: Response) => {
                    const { pinCode } = query;
                    try {
                        await bluetoothManager.setPinCode(pinCode);
                        res.json({ success: true, message: 'PIN code set successfully.' });
                    } catch (err) {
                        console.error('Error setting PIN code:', err);
                        res.status(500).json({ success: false, message: 'Error setting PIN code.' });
                    }
                },
            },
        ],
    },
];