// app/auth-success.tsx
// This screen handles the OAuth callback from the deep link
// It's automatically shown when the browser redirects back to your app

import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function AuthSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Small delay to ensure smooth transition
    const timer = setTimeout(() => {
      router.replace("/scan");
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.text}>Signing you in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: "#ffffff",
  },
});
