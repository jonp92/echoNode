import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url); // Get the full file path
const __dirname = path.dirname(__filename); // Get the directory name
export default class NEU {
    constructor() {
        this.name = 'NEU';
        this.description = 'NodeJS Express Utilities';
        this.publicPath = path.join(__dirname, '../public');
    }
    isPathAllowed(filePath) {
        const resolvedPath = path.resolve(filePath);
        return resolvedPath.startsWith(path.resolve(this.publicPath));
    }
    async downloadFile(url, savePath) {
        const resolvedPath = path.resolve(savePath);
        if (!this.isPathAllowed(resolvedPath)) {
            console.error(`Security error: Attempt to save file outside publicPath - ${savePath}`);
            return null;
        }
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
            }
            const data = await response.arrayBuffer();
            await fs.writeFile(resolvedPath, Buffer.from(data));
            console.log(`File saved to: ${resolvedPath}`);
            return resolvedPath;
        }
        catch (error) {
            console.error(`Error downloading file: ${error instanceof Error ? error.message : error}`);
            return null;
        }
    }
    async deleteFile(filePath) {
        const resolvedPath = path.resolve(filePath);
        if (!this.isPathAllowed(resolvedPath)) {
            console.error(`Security error: Attempt to delete file outside publicPath - ${filePath}`);
            return false;
        }
        try {
            await fs.access(resolvedPath);
            await fs.unlink(resolvedPath);
            console.log(`File deleted: ${resolvedPath}`);
            return true;
        }
        catch (err) {
            console.error(`Error deleting file: ${err instanceof Error ? err.message : err}`);
            return false;
        }
    }
    async listFolder(folderPath) {
        const resolvedPath = path.resolve(folderPath);
        // Security check: Ensure the path is allowed
        if (!this.isPathAllowed(resolvedPath)) {
            console.error(`Security error: Access denied for folder outside publicPath - ${folderPath}`);
            return [];
        }
        try {
            // Read directory entries with file types
            const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
            // Recursively process directories, return files
            const files = await Promise.all(entries.map(async (entry) => {
                const fullPath = path.join(resolvedPath, entry.name);
                if (entry.isDirectory()) {
                    return this.listFolder(fullPath); // Recurse into subdirectory
                }
                else {
                    return fullPath; // Return file path
                }
            }));
            return files.flat(); // Flatten nested arrays into a single array
        }
        catch (error) {
            console.error(`Error reading directory "${folderPath}":`, error);
            return [];
        }
    }
    async scanMusicFolder(folderPath) {
        // Use your listFolder function to get all files
        const allFiles = await this.listFolder(folderPath);
        // Filter for music files
        const musicExtensions = ['.mp3', '.wav', '.flac', '.aac'];
        const musicFiles = allFiles.filter(file => musicExtensions.includes(path.extname(file).toLowerCase()));
        return musicFiles;
    }
    async urlToBlob(url) {
        try {
            // Fetch the resource from the URL
            const response = await fetch(url);
            // Check if the response is successful
            if (!response.ok) {
                throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
            }
            // Convert the response data to an ArrayBuffer
            const arrayBuffer = await response.arrayBuffer();
            // Create a Blob from the ArrayBuffer and return it
            return new Blob([arrayBuffer], { type: response.headers.get('content-type') || 'application/octet-stream' });
        }
        catch (error) {
            console.error('Error converting URL to Blob:', error);
            throw error;
        }
    }
}
