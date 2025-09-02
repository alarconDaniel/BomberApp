import { View, ActivityIndicator } from 'react-native';
export default function IndexSplash() {
  return (
      <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
        <ActivityIndicator size="large" />
      </View>
  );
}