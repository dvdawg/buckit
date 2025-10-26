import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/hooks/useSession';

export default function CollaboratorDebug() {
  const { user } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebugTest = async () => {
    setLoading(true);
    console.log('=== COLLABORATOR DEBUG TEST ===');
    
    try {
      // Step 1: Get auth user
      const { data: authUser } = await supabase.auth.getUser();
      console.log('Auth user:', authUser?.user?.id);
      
      // Step 2: Get user ID from database
      let userId = null;
      const { data: meUserId } = await supabase.rpc('me_user_id');
      console.log('me_user_id result:', meUserId);
      
      if (meUserId) {
        userId = meUserId;
      } else {
        // Fallback
        if (authUser?.user?.id) {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', authUser.user.id)
            .single();
          userId = existingUser?.id;
          console.log('Fallback user ID:', userId);
        }
      }
      
      if (!userId) {
        Alert.alert('Error', 'Could not get user ID');
        return;
      }
      
      // Step 3: Test the database function directly
      console.log('Testing get_user_buckets_by_id with user ID:', userId);
      const { data: buckets, error: bucketsError } = await supabase.rpc('get_user_buckets_by_id', {
        p_user_id: userId
      });
      
      console.log('Buckets result:', { buckets, bucketsError });
      
      // Step 4: Check collaborator records
      const { data: collaborators, error: collabError } = await supabase
        .from('bucket_collaborators')
        .select('*')
        .eq('user_id', userId);
      
      console.log('Collaborator records:', { collaborators, collabError });
      
      // Step 5: List all buckets and their owners
      const { data: allBuckets, error: allBucketsError } = await supabase
        .from('buckets')
        .select('id, title, owner_id')
        .limit(10);
      
      console.log('All buckets:', { allBuckets, allBucketsError });
      
      // Compile debug info
      const debugData = {
        authUserId: authUser?.user?.id,
        databaseUserId: userId,
        bucketsReturned: buckets?.length || 0,
        buckets: buckets || [],
        collaboratorRecords: collaborators?.length || 0,
        collaborators: collaborators || [],
        allBuckets: allBuckets || [],
        errors: {
          bucketsError,
          collabError,
          allBucketsError
        }
      };
      
      setDebugInfo(debugData);
      console.log('=== DEBUG COMPLETE ===');
      
    } catch (error) {
      console.error('Debug test error:', error);
      Alert.alert('Error', `Debug test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Collaborator Debug</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={runDebugTest}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Running Test...' : 'Run Debug Test'}
        </Text>
      </TouchableOpacity>
      
      {debugInfo && (
        <ScrollView style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Results:</Text>
          
          <Text style={styles.debugText}>
            Auth User ID: {debugInfo.authUserId || 'None'}
          </Text>
          
          <Text style={styles.debugText}>
            Database User ID: {debugInfo.databaseUserId || 'None'}
          </Text>
          
          <Text style={styles.debugText}>
            Buckets Returned: {debugInfo.bucketsReturned}
          </Text>
          
          <Text style={styles.debugText}>
            Collaborator Records: {debugInfo.collaboratorRecords}
          </Text>
          
          {debugInfo.buckets.length > 0 && (
            <View>
              <Text style={styles.debugSubtitle}>Buckets:</Text>
              {debugInfo.buckets.map((bucket: any, index: number) => (
                <Text key={index} style={styles.debugText}>
                  {index + 1}. {bucket.title} (Collaborator: {bucket.is_collaborator ? 'Yes' : 'No'})
                </Text>
              ))}
            </View>
          )}
          
          {debugInfo.collaborators.length > 0 && (
            <View>
              <Text style={styles.debugSubtitle}>Collaborator Records:</Text>
              {debugInfo.collaborators.map((collab: any, index: number) => (
                <Text key={index} style={styles.debugText}>
                  {index + 1}. Bucket: {collab.bucket_id}, User: {collab.user_id}
                </Text>
              ))}
            </View>
          )}
          
          {Object.keys(debugInfo.errors).some(key => debugInfo.errors[key]) && (
            <View>
              <Text style={styles.debugSubtitle}>Errors:</Text>
              {Object.entries(debugInfo.errors).map(([key, error]) => (
                error && (
                  <Text key={key} style={styles.errorText}>
                    {key}: {JSON.stringify(error)}
                  </Text>
                )
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#8EC5FC',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  debugContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  debugSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8EC5FC',
    marginTop: 10,
    marginBottom: 5,
  },
  debugText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    marginBottom: 5,
  },
});
