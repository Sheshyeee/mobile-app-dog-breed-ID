import authService from "@/services/authService";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const response = await authService.signInWithGoogle();

      if (!response.success) {
        Alert.alert("Login Failed", response.message || "Please try again");
      }
      // Don't navigate here - the auth-success deep link route will handle it
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}></Text>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Scanning Frame with Dog Image */}
        <View style={styles.scanningSection}>
          <View style={styles.frameContainer}>
            {/* Corner Borders */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {/* Dog Image with Gradient Blend */}
            <View style={styles.imageWrapper}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1568572933382-74d440642117",
                }}
                style={styles.dogImage}
                resizeMode="cover"
              />

              {/* Top Gradient Overlay */}
              <LinearGradient
                colors={[
                  "rgba(15, 15, 15, 0.9)",
                  "rgba(15, 15, 15, 0.3)",
                  "transparent",
                ]}
                style={styles.topGradient}
              />

              {/* Bottom Gradient Overlay */}
              <LinearGradient
                colors={[
                  "transparent",
                  "rgba(15, 15, 15, 0.3)",
                  "rgba(15, 15, 15, 0.9)",
                ]}
                style={styles.bottomGradient}
              />

              {/* Edge Blending Gradients */}
              <LinearGradient
                colors={[
                  "rgba(15, 15, 15, 1)",
                  "rgba(15, 15, 15, 0.8)",
                  "transparent",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.leftGradient}
              />

              <LinearGradient
                colors={[
                  "transparent",
                  "rgba(15, 15, 15, 0.8)",
                  "rgba(15, 15, 15, 1)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.rightGradient}
              />

              {/* Text Overlays */}
              <View style={styles.textOverlayTop}>
                <Text style={styles.overlayTextLarge}>Dog Lens</Text>
                <Text style={styles.overlayTextSmall}>Breed Recognition</Text>
              </View>

              <View style={styles.textOverlayBottom}>
                <Text style={styles.overlayTextSmall}>Instant Results</Text>
              </View>
            </View>
          </View>

          <Text style={styles.tagline}>Precision Analysis with Features</Text>
        </View>

        {/* Feature Boxes */}
        <View style={styles.featuresGrid}>
          <View style={styles.featureBox}>
            <Feather name="clock" size={24} color="#60a5fa" />
            <Text style={styles.featureTitle}>Origin</Text>
            <Text style={styles.featureSubtitle}>History</Text>
          </View>

          <View style={styles.featureBox}>
            <Feather name="heart" size={24} color="#60a5fa" />
            <Text style={styles.featureTitle}>Health Risk</Text>
            <Text style={styles.featureSubtitle}>Medical</Text>
          </View>

          <View style={styles.featureBox}>
            <Feather name="cpu" size={24} color="#60a5fa" />
            <Text style={styles.featureTitle}>Simulation</Text>
            <Text style={styles.featureSubtitle}>Visualize</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Image
                  source={{
                    uri: "https://www.google.com/favicon.ico",
                  }}
                  style={styles.googleIcon}
                />
                <Text style={styles.startButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secondaryButtons}>
            <TouchableOpacity style={styles.secondaryButton}>
              <Feather name="zap" size={20} color="#9ca3af" />
              <Text style={styles.secondaryButtonText}>Instant Results!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: "center",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  scanningSection: {
    alignItems: "center",
    marginTop: 20,
  },
  frameContainer: {
    width: width * 0.75,
    height: width * 0.75,
    position: "relative",
    marginBottom: 24,
    marginTop: 20,
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#60a5fa",
    borderWidth: 3,
    zIndex: 10,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  dogImage: {
    width: "100%",
    height: "100%",
    opacity: 0.85,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "35%",
    zIndex: 1,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "35%",
    zIndex: 1,
  },
  leftGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 40,
    zIndex: 1,
  },
  rightGradient: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 40,
    zIndex: 1,
  },
  textOverlayTop: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  textOverlayBottom: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2,
  },
  overlayTextLarge: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  overlayTextSmall: {
    fontSize: 13,
    fontWeight: "500",
    color: "#d1d5db",
    textAlign: "center",
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tagline: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    marginTop: 20,
  },
  featuresGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginVertical: 32,
    marginTop: 10,
  },
  featureBox: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
  },
  featureSubtitle: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
  },
  actionButtons: {
    gap: 16,
  },
  startButton: {
    backgroundColor: "#3b82f6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  secondaryButtons: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
  },
});

export default LandingPage;
