import * as DBus from 'dbus-next';


const { systemBus, Variant } = DBus;
const { Interface, method } = DBus.interface;

class BluetoothManager {
    private bus: any;

    constructor() {
        this.bus = systemBus();
    }

    // List devices
    async listDevices(): Promise<string[]> {
        const objectManager = await this.getObjectManager();
        const managedObjects = await objectManager.GetManagedObjects();
        return Object.keys(managedObjects).filter((path) => path.includes('/dev_'));
    }

    // Start discovery
    async startDiscovery(): Promise<void> {
        const adapter = await this.getAdapter();
        await adapter.StartDiscovery();
        console.log('Discovery started');
    }

    // Stop discovery
    async stopDiscovery(): Promise<void> {
        const adapter = await this.getAdapter();
        await adapter.StopDiscovery();
        console.log('Discovery stopped');
    }

    // Pair a device
    async pairDevice(devicePath: string): Promise<void> {
        const device = await this.getDevice(devicePath);
        await device.Pair();
        console.log(`Device ${devicePath} paired successfully`);
    }

    // Connect a device
    async connectDevice(devicePath: string): Promise<void> {
        const device = await this.getDevice(devicePath);
        await device.Connect();
        console.log(`Device ${devicePath} connected successfully`);
    }

    // Unpair a device
    async unpairDevice(devicePath: string): Promise<void> {
        const adapter = await this.getAdapter();
        await adapter.RemoveDevice(new Variant('o', devicePath));
        console.log(`Device ${devicePath} unpaired successfully`);
    }

    // Set PIN code
    async setPinCode(pinCode: string): Promise<void> {
        const agentManager = await this.getAgentManager();
        const agentPath = '/test/agent';

        class Agent extends Interface {
            constructor() {
                super('org.bluez.Agent1');
            }

            @method({ inSignature: 's', outSignature: 's' })
            async RequestPinCode(device: string): Promise<string> {
                console.log(`Requesting PIN code for device ${device}`);
                return pinCode;
            }

            @method({ inSignature: 'ss', outSignature: '' })
            async AuthorizeService(device: string, uuid: string): Promise<void> {
                console.log(`Authorizing service ${uuid} for device ${device}`);
            }

            @method({ inSignature: '', outSignature: '' })
            async Cancel(): Promise<void> {
                console.log('Pairing cancelled');
            }
        }

        const agent = new Agent();
        this.bus.export(agentPath, agent);

        await agentManager.RegisterAgent(new Variant('o', agentPath), new Variant('s', 'KeyboardDisplay'));
        await agentManager.RequestDefaultAgent(new Variant('o', agentPath));
        console.log('Default PIN agent set');
    }

    // Get connected media player
    async getConnectedMediaPlayer(): Promise<string | null> {
        const objectManager = await this.getObjectManager();
        const managedObjects = await objectManager.GetManagedObjects();

        const mediaPlayer = Object.keys(managedObjects).find(
            (path) => path.includes('/player') && 'org.bluez.MediaPlayer1' in managedObjects[path]
        );

        return mediaPlayer || null;
    }

    // Get metadata
    async getMetadata(playerPath: string): Promise<Record<string, any> | null> {
        try {
            const proxyObject = await this.bus.getProxyObject('org.bluez', playerPath);
            const properties = proxyObject.getInterface('org.freedesktop.DBus.Properties');

            const allProperties = await properties.GetAll('org.bluez.MediaPlayer1');

            if (allProperties.Track) {
                const trackInfo = allProperties.Track.value;

                const metadata = Object.fromEntries(
                    Object.entries(trackInfo).map(([key, variant]: [string, any]) => [key, variant.value])
                );

                return metadata;
            } else {
                console.log(`No Track property available for player at ${playerPath}`);
                return null;
            }
        } catch (error) {
            console.error(`Failed to get metadata for player at ${playerPath}:`, error);
            return null;
        }
    }

    // Helpers
    private async getObjectManager(): Promise<any> {
        const proxyObject = await this.bus.getProxyObject('org.bluez', '/');
        return proxyObject.getInterface('org.freedesktop.DBus.ObjectManager');
    }

    private async getAdapter(): Promise<any> {
        const proxyObject = await this.bus.getProxyObject('org.bluez', '/org/bluez/hci0');
        return proxyObject.getInterface('org.bluez.Adapter1');
    }

    private async getDevice(devicePath: string): Promise<any> {
        const proxyObject = await this.bus.getProxyObject('org.bluez', devicePath);
        return proxyObject.getInterface('org.bluez.Device1');
    }

    private async getAgentManager(): Promise<any> {
        const proxyObject = await this.bus.getProxyObject('org.bluez', '/org/bluez');
        return proxyObject.getInterface('org.bluez.AgentManager1');
    }

    private async getMediaPlayer(playerPath: string): Promise<any> {
        const proxyObject = await this.bus.getProxyObject('org.bluez', playerPath);
        return proxyObject.getInterface('org.bluez.MediaPlayer1');
    }
}

export default BluetoothManager;