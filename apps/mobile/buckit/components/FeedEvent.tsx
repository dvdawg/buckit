import { View, Text, Image } from 'react-native';

export function FeedEvent({ event }: { event: any }) {
  return (
    <View style={{ padding:12, borderBottomWidth:1, borderColor:'#eee' }}>
      <Text style={{ fontWeight:'600' }}>{event.verb} {event.object_type}</Text>
      <Text style={{ color:'#666' }}>{new Date(event.created_at).toLocaleString()}</Text>
    </View>
  );
}
