import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test data
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_FRIEND_ID = '00000000-0000-0000-0000-000000000002';
const TEST_BUCKET_ID = '00000000-0000-0000-0000-000000000003';

async function setupTestData() {
  console.log('Setting up test data...');
  
  // Create test users
  await supabase.from('users').upsert([
    {
      id: TEST_USER_ID,
      auth_id: 'test-auth-user-1',
      handle: 'testuser1',
      full_name: 'Test User 1',
    },
    {
      id: TEST_FRIEND_ID,
      auth_id: 'test-auth-user-2',
      handle: 'testuser2',
      full_name: 'Test User 2',
    },
  ]);

  // Create test bucket
  await supabase.from('buckets').upsert([
    {
      id: TEST_BUCKET_ID,
      owner_id: TEST_USER_ID,
      title: 'Test Bucket',
      description: 'Test bucket for recommendations',
      visibility: 'public',
    },
  ]);

  // Create test items with embeddings and locations
  const testItems = [
    {
      id: '00000000-0000-0000-0000-000000000010',
      bucket_id: TEST_BUCKET_ID,
      owner_id: TEST_USER_ID,
      title: 'Visit Central Park',
      description: 'A beautiful park in Manhattan with lots of activities',
      location_name: 'Central Park, NYC',
      location_point: 'POINT(-73.965355 40.782865)', // Central Park coordinates
      visibility: 'public',
      difficulty: 2,
      price_min: 0,
      price_max: 50,
      embedding: generateTestEmbedding('park outdoor nature'),
    },
    {
      id: '00000000-0000-0000-0000-000000000011',
      bucket_id: TEST_BUCKET_ID,
      owner_id: TEST_USER_ID,
      title: 'Try New Restaurant',
      description: 'Amazing Italian restaurant with great pasta',
      location_name: 'Little Italy, NYC',
      location_point: 'POINT(-73.9979 40.7196)', // Little Italy coordinates
      visibility: 'public',
      difficulty: 1,
      price_min: 25,
      price_max: 75,
      embedding: generateTestEmbedding('restaurant food italian dining'),
    },
    {
      id: '00000000-0000-0000-0000-000000000012',
      bucket_id: TEST_BUCKET_ID,
      owner_id: TEST_FRIEND_ID,
      title: 'Museum Visit',
      description: 'Explore art and history at the Met',
      location_name: 'Metropolitan Museum, NYC',
      location_point: 'POINT(-73.9632 40.7794)', // Met Museum coordinates
      visibility: 'public',
      difficulty: 3,
      price_min: 15,
      price_max: 30,
      embedding: generateTestEmbedding('museum art culture history'),
    },
  ];

  await supabase.from('items').upsert(testItems);

  // Create friendship
  await supabase.from('friendships').upsert([
    {
      user_id: TEST_USER_ID,
      friend_id: TEST_FRIEND_ID,
      status: 'accepted',
    },
  ]);

  // Create some completions for popularity
  await supabase.from('completions').upsert([
    {
      id: '00000000-0000-0000-0000-000000000020',
      item_id: '00000000-0000-0000-0000-000000000010',
      user_id: TEST_FRIEND_ID,
      verified: true,
    },
    {
      id: '00000000-0000-0000-0000-000000000021',
      item_id: '00000000-0000-0000-0000-000000000011',
      user_id: TEST_FRIEND_ID,
      verified: true,
    },
  ]);

  // Create some events for user vectors
  await supabase.from('events').upsert([
    {
      id: '00000000-0000-0000-0000-000000000030',
      user_id: TEST_USER_ID,
      item_id: '00000000-0000-0000-0000-000000000010',
      event_type: 'view',
      strength: 0.25,
    },
    {
      id: '00000000-0000-0000-0000-000000000031',
      user_id: TEST_USER_ID,
      item_id: '00000000-0000-0000-0000-000000000010',
      event_type: 'like',
      strength: 1.0,
    },
  ]);

  console.log('Test data setup complete');
}

function generateTestEmbedding(text: string): number[] {
  // Generate deterministic embeddings based on text content
  const hash = text.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const embedding = new Array(1536).fill(0);
  for (let i = 0; i < 1536; i++) {
    const seed = hash + i * 0.01;
    embedding[i] = Math.sin(seed) * 0.1;
  }
  
  return embedding;
}

async function testRecommendationCandidates() {
  console.log('Testing recommendation candidates RPC...');
  
  const { data: candidates, error } = await supabase.rpc('get_recommendation_candidates', {
    p_user_id: TEST_USER_ID,
    p_lat: 40.782865, // Central Park latitude
    p_lon: -73.965355, // Central Park longitude
    p_radius_km: 10,
    p_limit: 10,
  });

  if (error) {
    throw new Error(`Candidates RPC error: ${error.message}`);
  }

  console.log(`Found ${candidates?.length || 0} candidates`);
  
  // Verify we get results within radius
  if (!candidates || candidates.length === 0) {
    throw new Error('No candidates returned');
  }

  // Check that all candidates are within radius
  for (const candidate of candidates) {
    if (candidate.distance_km > 10) {
      throw new Error(`Candidate ${candidate.id} is outside radius: ${candidate.distance_km}km`);
    }
  }

  console.log('✓ Candidates RPC test passed');
  return candidates;
}

async function testRecommendationEndpoint() {
  console.log('Testing recommendation endpoint...');
  
  const response = await supabase.functions.invoke('recommend', {
    body: {
      userId: TEST_USER_ID,
      lat: 40.782865,
      lon: -73.965355,
      radiusKm: 10,
      k: 5,
    },
  });

  if (response.error) {
    throw new Error(`Recommendation endpoint error: ${response.error.message}`);
  }

  const { items } = response.data;
  
  if (!items || items.length === 0) {
    throw new Error('No recommendations returned');
  }

  // Verify recommendation structure
  for (const item of items) {
    if (!item.id || typeof item.score !== 'number' || !item.reasons) {
      throw new Error('Invalid recommendation structure');
    }
    
    if (!item.reasons.trait && !item.reasons.state && !item.reasons.social && !item.reasons.cost && !item.reasons.poprec) {
      throw new Error('Missing recommendation reasons');
    }
  }

  console.log(`✓ Recommendation endpoint test passed - got ${items.length} recommendations`);
  return items;
}

async function testEventsLogging() {
  console.log('Testing events logging...');
  
  // Test impression logging
  const { error: impError } = await supabase.from('events').insert({
    user_id: TEST_USER_ID,
    item_id: '00000000-0000-0000-0000-000000000010',
    event_type: 'impression',
    strength: 0.0,
    context: { lat: 40.782865, lon: -73.965355 },
  });

  if (impError) {
    throw new Error(`Events logging error: ${impError.message}`);
  }

  console.log('✓ Events logging test passed');
}

async function testMaterializedViewsRefresh() {
  console.log('Testing materialized views refresh...');
  
  const { error } = await supabase.rpc('refresh_recs_materialized');
  
  if (error) {
    throw new Error(`Materialized views refresh error: ${error.message}`);
  }

  console.log('✓ Materialized views refresh test passed');
}

async function cleanupTestData() {
  console.log('Cleaning up test data...');
  
  // Delete in reverse order to respect foreign key constraints
  await supabase.from('events').delete().in('user_id', [TEST_USER_ID, TEST_FRIEND_ID]);
  await supabase.from('completions').delete().in('item_id', [
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
  ]);
  await supabase.from('friendships').delete().in('user_id', [TEST_USER_ID, TEST_FRIEND_ID]);
  await supabase.from('items').delete().in('id', [
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
  ]);
  await supabase.from('buckets').delete().eq('id', TEST_BUCKET_ID);
  await supabase.from('users').delete().in('id', [TEST_USER_ID, TEST_FRIEND_ID]);
  
  console.log('Test data cleanup complete');
}

async function runTests() {
  try {
    console.log('Starting recommendation system tests...\n');
    
    await setupTestData();
    await testRecommendationCandidates();
    await testRecommendationEndpoint();
    await testEventsLogging();
    await testMaterializedViewsRefresh();
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await cleanupTestData();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export {
  setupTestData,
  testRecommendationCandidates,
  testRecommendationEndpoint,
  testEventsLogging,
  testMaterializedViewsRefresh,
  cleanupTestData,
  runTests,
};
