import player from 'play-sound';
import fs from 'fs';
import fsPromise from 'fs/promises'
import path from 'path';
import MPV from 'node-mpv';

// Define the SeekInfo type
interface SeekInfo {
    start: number;
    end: number;
}

// Define the StatusObject type
interface StatusObject {
    mute: boolean;
    pause: boolean;
    duration: number | null;
    volume: number;
    filename: string | null;
    path: string | null;
    'media-title': string | null;
    'playlist-pos': number;
    'playlist-count': number;
    loop: string;
    fullscreen?: boolean;
    'sub-visibility'?: boolean;
    [key: string]: any; // Add additional properties as needed
}

export default class AudioPlayer {
    private soundPlayer: MPV;
    private isPaused: boolean;

    constructor() {
        const mpvOptions = {
            audio_only: true,
            debug: true,
            time_update: 1
        };
        this.soundPlayer = new MPV(mpvOptions);
        this.isPaused = false;
    }

    async fetchFile(url: string): Promise<string | null> {
        try {
            const response = await fetch(url);
            const urlObject = new URL(url); // Parse the URL
            const fileName = path.basename(urlObject.pathname); // Get the filename
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
    
            const data = await response.arrayBuffer();
            console.log(`Fetched ${data.byteLength} bytes from ${url}`);
            const savePath = '/tmp/' + fileName;
            // Save the data to a file
            await fsPromise.writeFile(savePath, Buffer.from(data));
            console.log(`File saved to ${savePath}`);
            return savePath;
        } catch (error) {
            console.error('Error fetching or saving the file:', error);
            return null;
        }
    }

    onEvent(event: 'started' | 'stopped' | 'paused' | 'resumed', callback: () => void): void;
    onEvent(event: 'timeposition', callback: (seconds: number) => void): void;
    onEvent(event: 'seek', callback: (info: SeekInfo) => void): void;
    onEvent(event: 'statuschange', callback: (status: StatusObject) => void): void;
    onEvent(event: string, callback: (...args: any[]) => void): void {
        this.soundPlayer.on(event as any, callback);
    }
    
    async playSound(source: string): Promise<void> {
        try {
            // Load and play the sound file
            await this.soundPlayer.load(source);
            this.soundPlayer.on('timeposition', (seconds: number) => {
                console.log(`Current playback time: ${seconds} seconds`);
            });
            // console.log('Playing sound:', source);
        } catch (err) {
            console.error('Failed to play sound:', err);
        }
    }

    async queueTrack(source: string): Promise<void> {
        try {
            await this.soundPlayer.append(source);
            console.log('Queued track:', source);
        } catch (err) {
            console.error('Failed to queue track:', err);
        }
    }

    async pauseOrResume(): Promise<void> {
        try {
            // Toggle playback state
            if (this.isPaused) {
                await this.soundPlayer.resume();
                console.log('Resuming playback');
            } else {
                await this.soundPlayer.pause();
                console.log('Pausing playback');
            }
            this.isPaused = !this.isPaused;
        } catch (err) {
            console.error('Failed to toggle pause/resume:', err);
        }
    }

    async stopSound(): Promise<void> {
        try {
            // Stop playback
            await this.soundPlayer.stop();
            console.log('Playback stopped');
        } catch (err) {
            console.error('Failed to stop playback:', err);
        }
    }

    async setVolume(volume: number): Promise<void> {
        if (volume < 0 || volume > 100) {
            console.error('Volume must be between 0 and 100.');
            return;
        }
        try {
            // Set playback volume
            await this.soundPlayer.volume(volume);
            console.log(`Volume set to: ${volume}`);
        } catch (err) {
            console.error('Failed to set volume:', err);
        }
    }

    async seek(seconds: number): Promise<void> {
        try {
            await this.soundPlayer.seek(seconds);
            console.log(`Seeked to: ${seconds} seconds`);
        } catch (err) {
            console.error('Failed to seek:', err);
        }
    }
    
    async quit(): Promise<void> {
        try {
            // Quit MPV
            await this.soundPlayer.quit();
            console.log('MPV player quit');
        } catch (err) {
            console.error('Failed to quit MPV player:', err);
        }
    }
}
