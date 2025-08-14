import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import StackNavigator from './navigation/StackNavigator';

export default function App() {
  // ÚNICO NavigationContainer de la app
  return (
    <NavigationContainer>
      <StackNavigator />
    </NavigationContainer>
  );
}
