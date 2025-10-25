import { useState } from 'react';
import { View, Text, TextInput, Pressable, Button } from 'react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export default function NewBucketModal() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [visibility, setVisibility] = useState<'private'|'friends'|'public'>('private');

  async function create() {
    const { data: uid } = await supabase.rpc('me_user_id');
    const { error } = await supabase.from('buckets').insert({ owner_id: uid, title, description: desc, visibility });
    if (!error) {
      router.back();
    }
  }

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text style={{ fontWeight:'700', fontSize:18 }}>Create Bucket</Text>
      <TextInput 
        placeholder="Title" 
        value={title} 
        onChangeText={setTitle}
        style={{ borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:10 }}
      />
      <TextInput 
        placeholder="Description" 
        value={desc} 
        onChangeText={setDesc}
        style={{ borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:10 }}
      />
      <View style={{ flexDirection:'row', gap:8 }}>
        {['private','friends','public'].map(o => (
          <Pressable 
            key={o} 
            onPress={() => setVisibility(o as any)} 
            style={{ 
              paddingVertical:8, 
              paddingHorizontal:12, 
              borderRadius:999, 
              backgroundColor: visibility===o ? '#111' : '#eee' 
            }}
          >
            <Text style={{ color: visibility===o ? '#fff' : '#111' }}>{o}</Text>
          </Pressable>
        ))}
      </View>
      <Button title="Create" onPress={create} />
      <Pressable onPress={() => router.back()}>
        <Text style={{ textAlign:'center', marginTop:10 }}>Cancel</Text>
      </Pressable>
    </View>
  );
}
