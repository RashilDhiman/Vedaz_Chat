import { Platform } from 'react-native';

/**
 * Android emulator: 10.0.2.2 is the host machine.
 * iOS simulator: localhost.
 * Physical phone: replace DEV_HOST with your computer's LAN IP, e.g. 192.168.1.20.
 */
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const config = {
  apiUrl: `http://${DEV_HOST}:4000`,
  socketUrl: `http://${DEV_HOST}:4000`,
};
