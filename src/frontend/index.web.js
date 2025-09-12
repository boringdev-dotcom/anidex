import { AppRegistry } from 'react-native';
import App from './App';

// Register the app for web
AppRegistry.registerComponent('Anidex', () => App);

// Run the app on web
AppRegistry.runApplication('Anidex', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
