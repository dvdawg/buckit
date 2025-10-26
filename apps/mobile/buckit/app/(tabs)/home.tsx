import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

// Dummy data for posts
const posts = [
  {
    id: "1",
    user: {
      name: "Jenny",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786",
    },
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b",
    title: "At-Home Yoga",
    location: "Home Studio",
    likes: 12,
    comments: 3,
  },
  {
    id: "2", 
    user: {
      name: "Jenny",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786",
    },
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
    title: "Cloud Watching",
    location: "Golden Gate Park",
    likes: 8,
    comments: 1,
  },
];

export default function Home() {
  const { user, isSessionValid } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If no valid session, redirect to splash
    if (!user || !isSessionValid) {
      console.log('Home: No valid session, redirecting to splash');
      router.replace('/splash');
    }
  }, [user, isSessionValid, router]);

  // If no valid session, show loading
  if (!user || !isSessionValid) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Buckit</Text>
      </View>

      {/* Posts Feed */}
      {posts.map((post) => (
        <View key={post.id} style={styles.postContainer}>
          {/* User Profile Above Post */}
          <View style={styles.postUserProfile}>
            <Image source={{ uri: post.user.avatar }} style={styles.postUserAvatar} />
            <Text style={styles.postUserName}>{post.user.name}</Text>
          </View>

          {/* Post Image */}
          <View style={styles.postImageContainer}>
            <Image source={{ uri: post.image }} style={styles.postImage} />
            
            {/* Post Title Overlay */}
            <View style={styles.postTitleOverlay}>
              <Text style={styles.postTitle}>{post.title}</Text>
              <View style={styles.locationContainer}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.locationText}>{post.location}</Text>
              </View>
            </View>
            
            {/* Like Button */}
            <TouchableOpacity style={styles.likeButton}>
              <Ionicons name="star-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Comment Section */}
          <View style={styles.commentSection}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#666"
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  postContainer: {
    marginBottom: 20,
  },
  postUserProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  postUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  postUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  postImageContainer: {
    position: 'relative',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 500,
  },
  postTitleOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPin: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  likeButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  commentInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
});
