import React from 'react';
import RiderNavigator, { RiderNavigatorParamList } from './RiderNavigator';

// Export RiderNavigatorParamList as MainStackParamList for backward compatibility
export type MainStackParamList = RiderNavigatorParamList;

export default function MainNavigator() {
  return <RiderNavigator />;
}
