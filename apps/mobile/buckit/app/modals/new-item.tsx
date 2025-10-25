import { useState } from 'react';
import { View, Text, TextInput, Pressable, Button } from 'react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

export default function NewItemModal() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  async function create() {
    const { data: uid } = await supabase.rpc('me_user_id');
    const { error } = await supabase.from('items').insert({ 
      owner_id: uid, 
      title, 
      description, 
      url 
    });
    if (!error) {
      router.back();
    }
  }

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text style={{ fontWeight:'700', fontSize:18 }}>Add New Item</Text>
      <TextInput 
        placeholder="Title" 
        value={title} 
        onChangeText={setTitle}
        style={{ borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:10 }}
      />
      <TextInput 
        placeholder="Description" 
        value={description} 
        onChangeText={setDescription}
        style={{ borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:10 }}
        multiline
        numberOfLines={3}
      />
      <TextInput 
        placeholder="URL (optional)" 
        value={url} 
        onChangeText={setUrl}
        style={{ borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:10 }}
        keyboardType="url"
      />
      <Button title="Add Item" onPress={create} />
      <Pressable onPress={() => router.back()}>
        <Text style={{ textAlign:'center', marginTop:10 }}>Cancel</Text>
      </Pressable>
    </View>
  );
}
