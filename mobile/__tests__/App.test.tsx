/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from '../App';
import { ChatProvider } from '../src/context/ChatContext';
import { LoginScreen } from '../src/screens/LoginScreen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

test('mounts the app shell', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('renders the username login screen', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <ChatProvider>
          <LoginScreen />
        </ChatProvider>
      </SafeAreaProvider>,
    );
  });

  const tree = JSON.stringify(renderer!.toJSON());
  expect(tree).toContain('Vedaz');
  expect(tree).toContain('Enter the room');
});
