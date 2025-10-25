import { useEffect, useState } from 'react';
import { View, FlatList, RefreshControl, Button, Modal, Pressable, Text } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useMe } from '@/hooks/useMe';
import { BucketCard } from '@/components/bucketcard';

export default function Buckets() {
  const { me } = useMe();
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

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
      <Button title="New Bucket" onPress={() => setShowNew(true)} />
      <FlatList
        data={buckets}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BucketCard bucket={item} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        style={{ marginTop:12 }}
      />
      <Modal visible={showNew} animationType="slide">
        <NewBucket onClose={() => { setShowNew(false); load(); }} />
      </Modal>
    </View>
  );
}

function NewBucket({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [visibility, setVisibility] = useState<'private'|'friends'|'public'>('private');

  async function create() {
    const { data: uid } = await supabase.rpc('me_user_id');
    const { error } = await supabase.from('buckets').insert({ owner_id: uid, title, description: desc, visibility });
    if (!error) onClose();
  }

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text style={{ fontWeight:'700', fontSize:18 }}>Create Bucket</Text>
      <Input placeholder="Title" value={title} onChangeText={setTitle} />
      <Input placeholder="Description" value={desc} onChangeText={setDesc} />
      <Segmented
        value={visibility}
        options={['private','friends','public']}
        onChange={(v) => setVisibility(v as any)}
      />
      <Button title="Create" onPress={create} />
      <Pressable onPress={onClose}><Text style={{ textAlign:'center', marginTop:10 }}>Cancel</Text></Pressable>
    </View>
  );
}

/** tiny inline components to stay self-contained */
import { TextInput } from 'react-native';
function Input(p: any) { return <TextInput {...p} style={{ borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:10 }} />; }
function Segmented({ value, options, onChange }:{value:string, options:string[], onChange:(v:string)=>void}) {
  return (
    <View style={{ flexDirection:'row', gap:8 }}>
      {options.map(o => (
        <Pressable key={o} onPress={() => onChange(o)} style={{ paddingVertical:8, paddingHorizontal:12, borderRadius:999, backgroundColor: value===o ? '#111' : '#eee' }}>
          <Text style={{ color: value===o ? '#fff' : '#111' }}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}
