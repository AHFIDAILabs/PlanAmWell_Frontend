import { registerRootComponent } from 'expo';

// Must be registered here, at the top level outside the React tree — this is
// what actually runs when the app has been fully killed on Android. Registering
// it inside a component (e.g. App.tsx) would never fire in that state.
import { registerBackgroundCallHandler } from './src/services/callNotificationService';
registerBackgroundCallHandler();

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
