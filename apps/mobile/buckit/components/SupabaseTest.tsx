import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';

export default function SupabaseTest() {
  const { user, loading } = useSession();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string, isSuccess: boolean = true) => {
    const timestamp = new Date().toLocaleTimeString();
    const status = isSuccess ? '✅' : '❌';
    setTestResults(prev => [...prev, `${status} [${timestamp}] ${message}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testConnection = async () => {
    try {
      addResult('Testing basic connection...');
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) throw error;
      addResult('Basic connection successful');
    } catch (error: any) {
      addResult(`Connection failed: ${error.message}`, false);
    }
  };

  const testAuth = async () => {
    try {
      addResult('Testing authentication...');
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      addResult(`Session status: ${session ? 'Authenticated' : 'Not authenticated'}`);
    } catch (error: any) {
      addResult(`Auth test failed: ${error.message}`, false);
    }
  };

  const testSignUp = async () => {
    try {
      addResult('Testing sign up...');
      const testEmail = `test-${Date.now()}@example.com`;
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: 'testpassword123'
      });
      if (error) throw error;
      addResult(`Sign up successful: ${data.user ? 'User created' : 'Check email for confirmation'}`);
    } catch (error: any) {
      addResult(`Sign up failed: ${error.message}`, false);
    }
  };

  const testRPCFunctions = async () => {
    try {
      addResult('Testing RPC functions...');
      
      // Test me_user_id
      const { data: meData, error: meError } = await supabase.rpc('me_user_id');
      if (meError) {
        addResult(`me_user_id failed: ${meError.message}`, false);
      } else {
        addResult(`me_user_id returned: ${meData}`);
      }

      // Test home_feed
      const { data: feedData, error: feedError } = await supabase.rpc('home_feed', { 
        limit_rows: 5, 
        offset_rows: 0 
      });
      if (feedError) {
        addResult(`home_feed failed: ${feedError.message}`, false);
      } else {
        addResult(`home_feed returned ${feedData?.length || 0} items`);
      }
    } catch (error: any) {
      addResult(`RPC test failed: ${error.message}`, false);
    }
  };

  const testDatabaseOperations = async () => {
    try {
      addResult('Testing database operations...');
      
      // Test reading from users table
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      if (usersError) throw usersError;
      addResult(`Users table: ${usersData?.length || 0} records accessible`);

      // Test reading from buckets table
      const { data: bucketsData, error: bucketsError } = await supabase
        .from('buckets')
        .select('*')
        .limit(1);
      if (bucketsError) throw bucketsError;
      addResult(`Buckets table: ${bucketsData?.length || 0} records accessible`);

      // Test reading from items table
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .limit(1);
      if (itemsError) throw itemsError;
      addResult(`Items table: ${itemsData?.length || 0} records accessible`);

    } catch (error: any) {
      addResult(`Database operations failed: ${error.message}`, false);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();
    
    addResult('Starting comprehensive Supabase tests...');
    
    await testConnection();
    await testAuth();
    await testRPCFunctions();
    await testDatabaseOperations();
    
    if (user) {
      addResult('User is authenticated, testing user-specific operations...');
      // Add more tests here for authenticated users
    } else {
      addResult('User not authenticated, skipping user-specific tests');
    }
    
    addResult('All tests completed!');
    setIsRunning(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Supabase Backend Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {user ? 'Authenticated' : 'Not authenticated'}
        </Text>
        <Text style={styles.statusText}>
          User: {user?.email || 'None'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Run All Tests"
          onPress={runAllTests}
          disabled={isRunning}
        />
        <Button
          title="Clear Results"
          onPress={clearResults}
        />
        <Button
          title="Test Connection"
          onPress={testConnection}
          disabled={isRunning}
        />
        <Button
          title="Test Auth"
          onPress={testAuth}
          disabled={isRunning}
        />
        <Button
          title="Test Sign Up"
          onPress={testSignUp}
          disabled={isRunning}
        />
        <Button
          title="Test RPC Functions"
          onPress={testRPCFunctions}
          disabled={isRunning}
        />
        <Button
          title="Test Database Operations"
          onPress={testDatabaseOperations}
          disabled={isRunning}
        />
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 5,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
});
