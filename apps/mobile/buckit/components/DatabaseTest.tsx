import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function DatabaseTest() {
  const [testing, setTesting] = useState(false);

  const testDatabaseConnection = async () => {
    setTesting(true);
    console.log('=== DATABASE CONNECTION TEST ===');
    
    try {
      // Test 1: Basic connection
      console.log('Test 1: Testing basic Supabase connection...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Auth result:', { user: user?.id, authError });
      
      if (authError) {
        Alert.alert('Auth Error', `Authentication failed: ${authError.message}`);
        return;
      }

      // Test 2: Test me_user_id RPC
      console.log('Test 2: Testing me_user_id RPC...');
      const { data: userId, error: userIdError } = await supabase.rpc('me_user_id');
      console.log('User ID result:', { userId, userIdError });
      
      if (userIdError) {
        Alert.alert('User ID Error', `me_user_id failed: ${userIdError.message}`);
        return;
      }

      // Test 3: Test if we can read items
      console.log('Test 3: Testing items table access...');
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('id, title, satisfaction_rating, is_completed')
        .limit(5);
      console.log('Items result:', { items, itemsError });
      
      if (itemsError) {
        Alert.alert('Items Error', `Items access failed: ${itemsError.message}`);
        return;
      }

      // Test 4: Test if update_item_satisfaction_rating RPC exists
      console.log('Test 4: Testing update_item_satisfaction_rating RPC...');
      if (items && items.length > 0) {
        const testItemId = items[0].id;
        console.log('Testing with item ID:', testItemId);
        
        // This should fail gracefully if the function doesn't exist
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_item_satisfaction_rating', {
          p_item_id: testItemId,
          p_satisfaction_rating: 5,
          p_is_completed: true
        });
        console.log('RPC test result:', { rpcData, rpcError });
        
        if (rpcError) {
          Alert.alert('RPC Error', `update_item_satisfaction_rating failed: ${rpcError.message}`);
          return;
        }
      }

      Alert.alert('Success', 'All database tests passed!');
      console.log('=== DATABASE CONNECTION TEST COMPLETE ===');
      
    } catch (error) {
      console.error('Database test error:', error);
      Alert.alert('Test Error', `Database test failed: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Database Connection Test</Text>
      <TouchableOpacity 
        style={[styles.button, testing && styles.buttonDisabled]} 
        onPress={testDatabaseConnection}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Database Connection'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#8EC5FC',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
