import fsPromise from 'fs/promises';
import path from 'path';
import MPV from 'node-mpv';
export default class AudioPlayer {
    constructor() {
        const mpvOptions = {
            audio_only: true,
            debug: true,
            time_update: 1
        };
        this.soundPlayer = new MPV(mpvOptions);
        this.isPaused = false;
    }
    async fetchFile(url) {
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
        }
        catch (error) {
            console.error('Error fetching or saving the file:', error);
            return null;
        }
    }
    onEvent(event, callback) {
        this.soundPlayer.on(event, callback);
    }
    async playSound(source) {
        try {
            // Load and play the sound file
            await this.soundPlayer.load(source);
            this.soundPlayer.on('timeposition', (seconds) => {
                console.log(`Current playback time: ${seconds} seconds`);
            });
            // console.log('Playing sound:', source);
        }
        catch (err) {
            console.error('Failed to play sound:', err);
        }
    }
    async queueTrack(source) {
        try {
            await this.soundPlayer.append(source);
            console.log('Queued track:', source);
        }
        catch (err) {
            console.error('Failed to queue track:', err);
        }
    }
    async pauseOrResume() {
        try {
            // Toggle playback state
            if (this.isPaused) {
                await this.soundPlayer.resume();
                console.log('Resuming playback');
            }
            else {
                await this.soundPlayer.pause();
                console.log('Pausing playback');
            }
            this.isPaused = !this.isPaused;
        }
        catch (err) {
            console.error('Failed to toggle pause/resume:', err);
        }
    }
    async stopSound() {
        try {
            // Stop playback
            await this.soundPlayer.stop();
            console.log('Playback stopped');
        }
        catch (err) {
            console.error('Failed to stop playback:', err);
        }
    }
    async setVolume(volume) {
        if (volume < 0 || volume > 100) {
            console.error('Volume must be between 0 and 100.');
            return;
        }
        try {
            // Set playback volume
            await this.soundPlayer.volume(volume);
            console.log(`Volume set to: ${volume}`);
        }
        catch (err) {
            console.error('Failed to set volume:', err);
        }
    }
    async seek(seconds) {
        try {
            await this.soundPlayer.seek(seconds);
            console.log(`Seeked to: ${seconds} seconds`);
        }
        catch (err) {
            console.error('Failed to seek:', err);
        }
    }
    async quit() {
        try {
            // Quit MPV
            await this.soundPlayer.quit();
            console.log('MPV player quit');
        }
        catch (err) {
            console.error('Failed to quit MPV player:', err);
        }
    }
}
