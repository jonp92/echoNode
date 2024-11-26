import BluetoothManager from './bluetoothmgmr';
const btManager = new BluetoothManager();
async function testBT() {
    // Start Bluetooth discovery
    await btManager.startDiscovery();
    // List devices
    const devices = await btManager.listDevices();
    console.log('Discovered devices:', devices);
    // Pair and connect a device
    const mediaPlayer = await btManager.getConnectedMediaPlayer();
    console.log('Found Media Player:', mediaPlayer);
    const metadata = await btManager.getMetadata(mediaPlayer || "");
    console.log("Metadata:", metadata);
}
testBT().then(() => {
    console.log('Testing complete');
    process.exit(0);
});
