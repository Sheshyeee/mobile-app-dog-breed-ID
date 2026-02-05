import ApiService from "@/services/api";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

interface PredictionResult {
  breed: string;
  confidence: number;
}

interface AnalysisResult {
  breed: string;
  confidence: number;
  top_predictions: PredictionResult[];
  message: string;
}

interface AnalysisStage {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  duration: number;
}

// ============================================================================
// LOADING MODAL COMPONENT (Integrated)
// ============================================================================
const AnalysisLoadingModal: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const stages: AnalysisStage[] = [
    { id: "upload", label: "Uploading image", icon: "upload", duration: 800 },
    { id: "identify", label: "Identifying breed", icon: "cpu", duration: 3500 },
    {
      id: "features",
      label: "Extracting features",
      icon: "activity",
      duration: 2000,
    },
    {
      id: "origin",
      label: "Generating origin data",
      icon: "globe",
      duration: 2000,
    },
    {
      id: "health",
      label: "Creating health analysis",
      icon: "heart",
      duration: 2000,
    },
    {
      id: "finalize",
      label: "Finalizing analysis",
      icon: "check-circle",
      duration: 1500,
    },
  ];

  const totalDuration = stages.reduce((sum, stage) => sum + stage.duration, 0);

  // Spin animation
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    );
    spin.start();
    return () => spin.stop();
  }, []);

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Progress tracking
  useEffect(() => {
    if (!visible) {
      setCurrentStageIndex(0);
      setProgress(0);
      progressAnim.setValue(0);
      return;
    }

    let cumulativeTime = 0;
    let currentIndex = 0;

    const interval = setInterval(() => {
      cumulativeTime += 50;
      const newProgress = Math.min((cumulativeTime / totalDuration) * 100, 100);
      setProgress(newProgress);

      Animated.timing(progressAnim, {
        toValue: newProgress,
        duration: 50,
        useNativeDriver: false,
      }).start();

      let timeSum = 0;
      for (let i = 0; i < stages.length; i++) {
        timeSum += stages[i].duration;
        if (cumulativeTime < timeSum) {
          currentIndex = i;
          break;
        }
      }

      setCurrentStageIndex(currentIndex);

      if (cumulativeTime >= totalDuration) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [visible, totalDuration]);

  const currentStage = stages[currentStageIndex];
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={loadingStyles.overlay}>
        <View style={loadingStyles.container}>
          {/* Header */}
          <View style={loadingStyles.header}>
            <View style={loadingStyles.headerContent}>
              <View style={loadingStyles.iconCircle}>
                <Feather name="cpu" size={24} color="#ffffff" />
              </View>
              <View style={loadingStyles.headerText}>
                <Text style={loadingStyles.title}>Analyzing Your Pet</Text>
                <Text style={loadingStyles.subtitle}>
                  AI-powered breed identification
                </Text>
              </View>
            </View>
          </View>

          {/* Content */}
          <View style={loadingStyles.content}>
            {/* Current Stage Card */}
            <View style={loadingStyles.currentStageCard}>
              <View style={loadingStyles.stageIconContainer}>
                <View style={loadingStyles.pulseRing}>
                  <View style={loadingStyles.pulseRingInner} />
                </View>
                <Animated.View
                  style={[
                    loadingStyles.stageIcon,
                    { transform: [{ rotate: spinRotation }] },
                  ]}
                >
                  <Feather
                    name={currentStage?.icon}
                    size={20}
                    color="#ffffff"
                  />
                </Animated.View>
              </View>
              <View style={loadingStyles.stageTextContainer}>
                <Text style={loadingStyles.stageLabel}>
                  {currentStage?.label}...
                </Text>
                <View style={loadingStyles.stageInfo}>
                  <Text style={loadingStyles.stepText}>
                    Step {currentStageIndex + 1} of {stages.length}
                  </Text>
                  <Text style={loadingStyles.dotSeparator}>•</Text>
                  <Text style={loadingStyles.percentText}>
                    {Math.round(progress)}% Complete
                  </Text>
                </View>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={loadingStyles.progressSection}>
              <View style={loadingStyles.progressBar}>
                <Animated.View
                  style={[loadingStyles.progressFill, { width: progressWidth }]}
                />
              </View>
            </View>

            {/* Steps List */}
            <View style={loadingStyles.stepsList}>
              <Text style={loadingStyles.stepsTitle}>PROGRESS STEPS</Text>
              {stages.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;

                return (
                  <View
                    key={stage.id}
                    style={[
                      loadingStyles.stepItem,
                      { opacity: isCompleted || isCurrent ? 1 : 0.4 },
                    ]}
                  >
                    <View style={loadingStyles.stepIndicator}>
                      {isCompleted ? (
                        <View style={loadingStyles.completedIcon}>
                          <Feather name="check" size={12} color="#ffffff" />
                        </View>
                      ) : isCurrent ? (
                        <View style={loadingStyles.currentIcon}>
                          <Animated.View
                            style={{ transform: [{ rotate: spinRotation }] }}
                          >
                            <Feather name="loader" size={12} color="#ffffff" />
                          </Animated.View>
                        </View>
                      ) : (
                        <View style={loadingStyles.pendingIcon} />
                      )}
                    </View>
                    <Text
                      style={[
                        loadingStyles.stepLabel,
                        isCompleted && loadingStyles.stepLabelCompleted,
                        isCurrent && loadingStyles.stepLabelCurrent,
                      ]}
                    >
                      {stage.label}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Footer */}
            <View style={loadingStyles.footer}>
              <Feather name="clock" size={14} color="#f59e0b" />
              <Text style={loadingStyles.footerText}>
                This usually takes 10-15 seconds
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// MAIN SCAN PAGE
// ============================================================================
function ScanPage() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required");
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required");
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setResult(null);
      setError(null);
    }
  };

  const handlePickImage = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageUri) {
      Alert.alert("No image", "Please select an image first");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      console.log("Starting analysis...");

      const response = await ApiService.analyzeImage(imageUri);

      if (response.success && response.data) {
        console.log("Scan successful:", response.data.scan_id);

        // Clear the inputs explicitly before navigating
        setImageUri(null);
        setResult(null);
        setError(null);
        setProcessing(false);

        router.push({
          pathname: "/scan-result",
          params: { scan_id: response.data.scan_id },
        });
      } else {
        // Extract the REAL error message
        let displayMessage = response.message || "Analysis failed";

        if (response.errors) {
          const firstErrorKey = Object.keys(response.errors)[0];
          if (firstErrorKey && response.errors[firstErrorKey]) {
            displayMessage = response.errors[firstErrorKey][0];
          }
        }

        setError(displayMessage);
        setProcessing(false);
        Alert.alert("Upload Failed", displayMessage);
      }
    } catch (err: any) {
      const msg = "Connection failed. Check server.";
      setError(msg);
      setProcessing(false);
      Alert.alert("Error", msg);
    }
  };

  const handleReset = () => {
    setImageUri(null);
    setResult(null);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Loading Modal */}
      <AnalysisLoadingModal visible={processing} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Scan Your Pet</Text>
          <Text style={styles.subtitle}>
            Upload a photo or use your camera to identify your pet's breed.
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {!imageUri ? (
          /* Initial Upload Section */
          <>
            {/* Upload Card */}
            <View style={styles.uploadCard}>
              <View style={styles.uploadIconContainer}>
                <View style={styles.iconCircle}>
                  <Feather name="camera" size={40} color="#60a5fa" />
                </View>
              </View>
              <Text style={styles.uploadText}>Select an image</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <Feather name="image" size={18} color="#ffffff" />
                <Text style={styles.primaryButtonText}>Choose Image</Text>
              </TouchableOpacity>
            </View>

            {/* Tips Card */}
            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Feather name="info" size={18} color="#60a5fa" />
                <Text style={styles.tipsTitle}>Tips for Best Results</Text>
              </View>
              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.tipText}>
                    Ensure your pet is clearly visible
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.tipText}>Use good lighting</Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.tipText}>
                    Center your pet in the frame
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.tipText}>
                    Better angles improve accuracy
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          /* Image Preview Section */
          <>
            {/* Image Preview Card */}
            <View style={styles.previewCard}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            </View>

            {/* Action Buttons for Preview */}
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[
                  styles.analyzeButton,
                  processing && styles.buttonDisabled,
                ]}
                onPress={handleAnalyze}
                disabled={processing}
                activeOpacity={0.8}
              >
                <Feather name="zap" size={20} color="#ffffff" />
                <Text style={styles.analyzeButtonText}>Analyze Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retakeButton}
                onPress={handleReset}
                disabled={processing}
                activeOpacity={0.8}
              >
                <Feather name="refresh-cw" size={18} color="#9ca3af" />
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// LOADING MODAL STYLES
// ============================================================================
const loadingStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  header: {
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: "#93c5fd",
  },
  content: {
    padding: 20,
  },
  currentStageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0c4a6e",
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "#1e40af",
  },
  stageIconContainer: {
    position: "relative",
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    opacity: 0.2,
  },
  pulseRingInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    opacity: 0.2,
  },
  stageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  stageTextContainer: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  stageInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  dotSeparator: {
    fontSize: 12,
    color: "#60a5fa",
  },
  percentText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#60a5fa",
  },
  progressSection: {
    marginTop: 20,
  },
  progressBar: {
    height: 10,
    backgroundColor: "#374151",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 5,
  },
  stepsList: {
    marginTop: 20,
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  stepsTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  stepIndicator: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  completedIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  currentIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  pendingIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#374151",
  },
  stepLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  stepLabelCompleted: {
    color: "#10b981",
    fontWeight: "500",
  },
  stepLabelCurrent: {
    color: "#60a5fa",
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    backgroundColor: "#422006",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#78350f",
  },
  footerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f59e0b",
  },
});

// ============================================================================
// MAIN PAGE STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerTextContainer: {
    gap: 6,
  },
  title: {
    fontSize: 23,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#9ca3af",
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  uploadCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#2a2a2a",
    borderStyle: "dashed",
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  uploadIconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#d1d5db",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 16,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  tipsCard: {
    backgroundColor: "#0a1628",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    borderRadius: 16,
    padding: 18,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  tipsTitle: {
    fontWeight: "600",
    color: "#ffffff",
    fontSize: 15,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bullet: {
    fontSize: 16,
    color: "#60a5fa",
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#d1d5db",
    lineHeight: 20,
  },
  previewCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 12,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  previewActions: {
    gap: 12,
    marginTop: 16,
  },
  analyzeButton: {
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  analyzeButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  retakeButton: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  retakeButtonText: {
    color: "#9ca3af",
    fontSize: 15,
    fontWeight: "600",
  },
  errorBanner: {
    position: "absolute",
    bottom: 100,
    left: 24,
    right: 24,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    flex: 1,
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default ScanPage;
