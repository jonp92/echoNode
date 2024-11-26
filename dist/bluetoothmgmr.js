var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import * as DBus from 'dbus-next';
const { systemBus, Variant } = DBus;
const { Interface, method } = DBus.interface;
class BluetoothManager {
    constructor() {
        this.bus = systemBus();
    }
    // List devices
    async listDevices() {
        const objectManager = await this.getObjectManager();
        const managedObjects = await objectManager.GetManagedObjects();
        return Object.keys(managedObjects).filter((path) => path.includes('/dev_'));
    }
    // Start discovery
    async startDiscovery() {
        const adapter = await this.getAdapter();
        await adapter.StartDiscovery();
        console.log('Discovery started');
    }
    // Stop discovery
    async stopDiscovery() {
        const adapter = await this.getAdapter();
        await adapter.StopDiscovery();
        console.log('Discovery stopped');
    }
    // Pair a device
    async pairDevice(devicePath) {
        const device = await this.getDevice(devicePath);
        await device.Pair();
        console.log(`Device ${devicePath} paired successfully`);
    }
    // Connect a device
    async connectDevice(devicePath) {
        const device = await this.getDevice(devicePath);
        await device.Connect();
        console.log(`Device ${devicePath} connected successfully`);
    }
    // Unpair a device
    async unpairDevice(devicePath) {
        const adapter = await this.getAdapter();
        await adapter.RemoveDevice(new Variant('o', devicePath));
        console.log(`Device ${devicePath} unpaired successfully`);
    }
    // Set PIN code
    async setPinCode(pinCode) {
        const agentManager = await this.getAgentManager();
        const agentPath = '/test/agent';
        class Agent extends Interface {
            constructor() {
                super('org.bluez.Agent1');
            }
            async RequestPinCode(device) {
                console.log(`Requesting PIN code for device ${device}`);
                return pinCode;
            }
            async AuthorizeService(device, uuid) {
                console.log(`Authorizing service ${uuid} for device ${device}`);
            }
            async Cancel() {
                console.log('Pairing cancelled');
            }
        }
        __decorate([
            method({ inSignature: 's', outSignature: 's' }),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String]),
            __metadata("design:returntype", Promise)
        ], Agent.prototype, "RequestPinCode", null);
        __decorate([
            method({ inSignature: 'ss', outSignature: '' }),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [String, String]),
            __metadata("design:returntype", Promise)
        ], Agent.prototype, "AuthorizeService", null);
        __decorate([
            method({ inSignature: '', outSignature: '' }),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", []),
            __metadata("design:returntype", Promise)
        ], Agent.prototype, "Cancel", null);
        const agent = new Agent();
        this.bus.export(agentPath, agent);
        await agentManager.RegisterAgent(new Variant('o', agentPath), new Variant('s', 'KeyboardDisplay'));
        await agentManager.RequestDefaultAgent(new Variant('o', agentPath));
        console.log('Default PIN agent set');
    }
    // Get connected media player
    async getConnectedMediaPlayer() {
        const objectManager = await this.getObjectManager();
        const managedObjects = await objectManager.GetManagedObjects();
        const mediaPlayer = Object.keys(managedObjects).find((path) => path.includes('/player') && 'org.bluez.MediaPlayer1' in managedObjects[path]);
        return mediaPlayer || null;
    }
    // Get metadata
    async getMetadata(playerPath) {
        try {
            const proxyObject = await this.bus.getProxyObject('org.bluez', playerPath);
            const properties = proxyObject.getInterface('org.freedesktop.DBus.Properties');
            const allProperties = await properties.GetAll('org.bluez.MediaPlayer1');
            if (allProperties.Track) {
                const trackInfo = allProperties.Track.value;
                const metadata = Object.fromEntries(Object.entries(trackInfo).map(([key, variant]) => [key, variant.value]));
                return metadata;
            }
            else {
                console.log(`No Track property available for player at ${playerPath}`);
                return null;
            }
        }
        catch (error) {
            console.error(`Failed to get metadata for player at ${playerPath}:`, error);
            return null;
        }
    }
    // Helpers
    async getObjectManager() {
        const proxyObject = await this.bus.getProxyObject('org.bluez', '/');
        return proxyObject.getInterface('org.freedesktop.DBus.ObjectManager');
    }
    async getAdapter() {
        const proxyObject = await this.bus.getProxyObject('org.bluez', '/org/bluez/hci0');
        return proxyObject.getInterface('org.bluez.Adapter1');
    }
    async getDevice(devicePath) {
        const proxyObject = await this.bus.getProxyObject('org.bluez', devicePath);
        return proxyObject.getInterface('org.bluez.Device1');
    }
    async getAgentManager() {
        const proxyObject = await this.bus.getProxyObject('org.bluez', '/org/bluez');
        return proxyObject.getInterface('org.bluez.AgentManager1');
    }
    async getMediaPlayer(playerPath) {
        const proxyObject = await this.bus.getProxyObject('org.bluez', playerPath);
        return proxyObject.getInterface('org.bluez.MediaPlayer1');
    }
}
export default BluetoothManager;
