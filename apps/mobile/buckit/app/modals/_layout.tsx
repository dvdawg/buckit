import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack>
      <Stack.Screen name="new-bucket" options={{ presentation: 'modal', title: 'New Bucket' }} />
      <Stack.Screen name="new-item" options={{ presentation: 'modal', title: 'New Item' }} />
    </Stack>
  );
}
