import { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, Button } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useMe } from '@/hooks/useMe';
import { BucketCard } from '@/components/BucketCard';
import { router } from 'expo-router';


export default function Buckets() {
  const { me } = useMe();
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!me) return;
    setLoading(true);
    // show my buckets + any public buckets I own/collab
    const { data, error } = await supabase
      .from('buckets')
      .select('*')
      .or(`owner_id.eq.${me.id}`)   // RLS will handle visibility for others
      .order('created_at', { ascending: false });
    if (!error) setBuckets(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [me?.id]);

  return (
    <View style={{ flex:1, backgroundColor:'#fafafa', padding:12 }}>
      <Button title="New Bucket" onPress={() => router.push('/modals/new-bucket')} />
      <FlatList
        data={buckets}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BucketCard bucket={item} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        style={{ marginTop:12 }}
      />
    </View>
  );
}
