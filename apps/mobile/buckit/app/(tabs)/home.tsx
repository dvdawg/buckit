import { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { FeedEvent } from '@/components/FeedEvent';

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(page = 0) {
    const { data, error } = await supabase.rpc('home_feed', { limit_rows: 30, offset_rows: page * 30 });
    if (!error) setEvents(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex:1, backgroundColor:'#fafafa' }}>
      <FlatList
        data={events}
        keyExtractor={(e) => String(e.id)}
        renderItem={({ item }) => <FeedEvent event={item} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}
        contentContainerStyle={{ padding:12 }}
      />
    </View>
  );
}
