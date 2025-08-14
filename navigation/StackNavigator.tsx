import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import OperarioTabs from './OperarioTabs';

export type RootStackParamList = {
  Login: undefined;
  OperarioTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function StackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OperarioTabs" component={OperarioTabs} />
    </Stack.Navigator>
  );
}
