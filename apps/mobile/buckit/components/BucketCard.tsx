import { View, Text } from 'react-native';

export function BucketCard({ bucket, onPress }: { bucket: any; onPress?: () => void }) {
  return (
    <View style={{ padding:12, borderRadius:12, backgroundColor:'#fff', marginBottom:10, shadowOpacity:0.1 }}>
      <Text style={{ fontSize:16, fontWeight:'700' }}>{bucket.title}</Text>
      {bucket.description ? <Text style={{ color:'#666', marginTop:4 }}>{bucket.description}</Text> : null}
    </View>
  );
}
