import { View, Text } from 'react-native';

export function ItemRow({ item }: { item: any }) {
  return (
    <View style={{ paddingVertical:10, borderBottomWidth:1, borderColor:'#eee' }}>
      <Text style={{ fontWeight:'600' }}>{item.title}</Text>
      {item.location_name ? <Text style={{ color:'#666' }}>{item.location_name}</Text> : null}
    </View>
  );
}
