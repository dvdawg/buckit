import { View, Text, Image, Button, FlatList, RefreshControl } from 'react-native';
import { useSession } from '@/hooks/useSession';
import { useMe } from '@/hooks/useMe';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Profile() {
  const { signOut } = useSession();
  const { me, loading } = useMe();
  const [friends, setFriends] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadFriends() {
    if (!me) return;
    setRefreshing(true);
    const { data, error } = await supabase
      .from('friendships')
      .select('user_id, friend_id, status')
      .or(`user_id.eq.${me.id},friend_id.eq.${me.id}`)
      .eq('status', 'accepted');
    if (!error) setFriends(data ?? []);
    setRefreshing(false);
  }

  useEffect(() => { if (me?.id) loadFriends(); }, [me?.id]);

  return (
    <View style={{ flex:1, padding:16, backgroundColor:'#fafafa' }}>
      {loading ? <Text>Loading…</Text> : me && (
        <>
          <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
            {me.avatar_url ? <Image source={{ uri: me.avatar_url }} style={{ width:64, height:64, borderRadius:32 }} /> : null}
            <View>
              <Text style={{ fontSize:18, fontWeight:'700' }}>{me.full_name ?? me.handle}</Text>
              <Text style={{ color:'#666' }}>Points: {me.points}</Text>
            </View>
          </View>

          <Text style={{ marginTop:20, fontWeight:'700' }}>Friends</Text>
          <FlatList
            data={friends}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => <Text style={{ paddingVertical:6 }}>{JSON.stringify(item)}</Text>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadFriends} />}
          />

          <View style={{ marginTop:20 }}>
            <Button title="Sign out" onPress={signOut} />
          </View>
        </>
      )}
    </View>
  );
}
