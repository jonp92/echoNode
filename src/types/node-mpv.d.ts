declare module 'node-mpv' {
    interface MPVOptions {
        audio_only?: boolean;
        binary?: string; // Path to mpv binary
        socket?: string; // Path to IPC socket
        debug?: boolean; // Enable debugging logs
    }

    interface SeekInfo {
        start: number;
        end: number;
    }

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
    }

    class MPV {
        constructor(options?: MPVOptions);

        // Core Player Methods
        quit(): Promise<void>;

        // Playback Control
        load(content: string, mode?: 'replace' | 'append' | 'append-play', options?: object): Promise<void>;
        play(): Promise<void>;
        stop(): Promise<void>;
        pause(): Promise<void>;
        resume(): Promise<void>;
        togglePause(): Promise<void>;
        mute(): Promise<void>;
        unmute(): Promise<void>;
        toggleMute(): Promise<void>;
        volume(volumeLevel: number): Promise<void>;
        adjustVolume(value: number): Promise<void>;

        // Seek and Loop
        seek(seconds: number): Promise<void>;
        goToPosition(seconds: number): Promise<void>;
        loop(times?: number): Promise<void>;
        clearLoop(): Promise<void>;

        // Playlist Management
        loadPlaylist(playlist: string, mode?: 'replace' | 'append'): Promise<void>;
        append(file: string, mode?: 'append' | 'append-play', options?: object): Promise<void>;
        next(mode?: 'weak' | 'force'): Promise<void>;
        prev(mode?: 'weak' | 'force'): Promise<void>;
        clearPlaylist(): Promise<void>;
        playlistRemove(index: number | 'current'): Promise<void>;
        playlistMove(index1: number, index2: number): Promise<void>;
        shuffle(): Promise<void>;
        loopPlaylist(times?: number): Promise<void>;
        clearLoopPlaylist(): Promise<void>;

        // Audio
        addAudioTrack(file: string, flag?: 'select' | 'auto' | 'cached', title?: string, lang?: string): Promise<void>;
        removeAudioTrack(id: number): Promise<void>;
        selectAudioTrack(id: number): Promise<void>;
        cycleAudioTracks(): Promise<void>;
        adjustAudioTiming(seconds: number): Promise<void>;
        speed(scale: number): Promise<void>;

        // Video
        fullscreen(): Promise<void>;
        leaveFullscreen(): Promise<void>;
        toggleFullscreen(): Promise<void>;
        screenshot(file: string, option?: 'subtitles' | 'video' | 'window'): Promise<void>;
        rotateVideo(degrees: number): Promise<void>;
        zoomVideo(factor: number): Promise<void>;
        brightness(value: number): Promise<void>;
        contrast(value: number): Promise<void>;
        saturation(value: number): Promise<void>;
        gamma(value: number): Promise<void>;
        hue(value: number): Promise<void>;

        // Subtitles
        addSubtitles(file: string, flag?: 'select' | 'auto' | 'cached', title?: string, lang?: string): Promise<void>;
        removeSubtitles(id: number): Promise<void>;
        selectSubtitles(id: number): Promise<void>;
        cycleSubtitles(): Promise<void>;
        toggleSubtitleVisibility(): Promise<void>;
        showSubtitles(): Promise<void>;
        hideSubtitles(): Promise<void>;
        adjustSubtitleTiming(seconds: number): Promise<void>;
        subtitleSeek(lines: number): Promise<void>;
        subtitleScale(scale: number): Promise<void>;
        displayASS(assMessage: string, duration: number, position?: number): Promise<void>;

        // Properties
        setProperty(property: string, value: any): Promise<void>;
        setMultipleProperties(properties: Record<string, any>): Promise<void>;
        getProperty(property: string): Promise<any>;
        addProperty(property: string, value: any): Promise<void>;
        multiplyProperty(property: string, value: number): Promise<void>;
        cycleProperty(property: string): Promise<void>;

        // Commands
        command(command: string, args?: any[]): Promise<void>;
        commandJSON(command: object): Promise<void>;
        freeCommand(command: string): Promise<void>;

        // Observing
        observeProperty(property: string, id: number): void;
        unobserveProperty(id: number): void;

        // Events
        on(event: 'started' | 'stopped' | 'paused' | 'resumed', callback: () => void): void;
        on(event: 'timeposition', callback: (seconds: number) => void): void;
        on(event: 'seek', callback: (info: SeekInfo) => void): void;
        on(event: 'statuschange', callback: (status: StatusObject) => void): void;
    }

    export = MPV;
}
