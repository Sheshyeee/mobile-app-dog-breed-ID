import ApiService from "@/services/api";
import authService, { User } from "@/services/authService";
import notificationService, {
  Notification,
} from "@/services/notificationservice";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
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
// NOTIFICATION MODAL COMPONENT
// ============================================================================
const NotificationModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  onRefresh: () => void;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: number) => void;
  onNotificationPress: (notification: Notification) => void;
}> = ({
  visible,
  onClose,
  notifications,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onNotificationPress,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={notificationStyles.overlay}>
        <View style={notificationStyles.container}>
          {/* Header */}
          <View style={notificationStyles.header}>
            <Text style={notificationStyles.headerTitle}>Notifications</Text>
            <View style={notificationStyles.headerActions}>
              {notifications.length > 0 && (
                <TouchableOpacity onPress={onMarkAllAsRead}>
                  <Text style={notificationStyles.markAllText}>
                    Mark all read
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Notification List */}
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  notificationStyles.notificationCard,
                  !item.read && notificationStyles.unreadCard,
                ]}
                onPress={() => onNotificationPress(item)}
              >
                <View style={notificationStyles.notificationIcon}>
                  <Feather
                    name={
                      item.type === "scan_verified" ? "check-circle" : "bell"
                    }
                    size={24}
                    color="#3b82f6"
                  />
                  {!item.read && <View style={notificationStyles.unreadDot} />}
                </View>

                <View style={notificationStyles.notificationContent}>
                  <Text style={notificationStyles.notificationTitle}>
                    {item.title}
                  </Text>
                  <Text style={notificationStyles.notificationMessage}>
                    {item.message}
                  </Text>
                  <Text style={notificationStyles.notificationTime}>
                    {new Date(item.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>

                <TouchableOpacity
                  style={notificationStyles.deleteButton}
                  onPress={() => onDelete(item.id)}
                >
                  <Feather name="trash-2" size={18} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={notificationStyles.emptyState}>
                <Feather name="bell-off" size={48} color="#6b7280" />
                <Text style={notificationStyles.emptyTitle}>
                  No notifications
                </Text>
                <Text style={notificationStyles.emptySubtitle}>
                  You're all caught up!
                </Text>
              </View>
            }
            contentContainerStyle={notificationStyles.listContent}
          />
        </View>
      </View>
    </Modal>
  );
};

const notificationStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  markAllText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#0f0f0f",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  unreadCard: {
    backgroundColor: "#0a1628",
    borderColor: "#1e40af",
  },
  notificationIcon: {
    position: "relative",
    marginRight: 12,
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#9ca3af",
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: "#6b7280",
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
});

// ============================================================================
// LOADING MODAL COMPONENT
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

          <View style={loadingStyles.content}>
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

            <View style={loadingStyles.progressSection}>
              <View style={loadingStyles.progressBar}>
                <Animated.View
                  style={[loadingStyles.progressFill, { width: progressWidth }]}
                />
              </View>
            </View>

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
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [showUserMenu, setShowUserMenu] = useState(false);

  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    console.log("═══════════════════════════════════════");
    console.log("🔍 NOTIFICATION DEBUG - Component Mount");
    console.log("═══════════════════════════════════════");
    console.log("User:", user?.name, user?.id); 
    console.log("Initial unreadCount:", unreadCount);
    console.log("═══════════════════════════════════════");
  }, []);

  useEffect(() => {
    console.log("📊 UNREAD COUNT CHANGED:", unreadCount);
    console.log("Type:", typeof unreadCount);
    console.log("Is number:", typeof unreadCount === "number");
    console.log("Is greater than 0:", unreadCount > 0);
    console.log("Badge should show:", unreadCount > 0 ? "YES ✅" : "NO ❌");
  }, [unreadCount]);

  // Replace your fetchUnreadCount with this version:
  const fetchUnreadCount = async () => {
    console.log("");
    console.log("═══════════════════════════════════════");
    console.log("🔄 FETCHING UNREAD COUNT - START");
    console.log("═══════════════════════════════════════");

    try {
      console.log("Step 1: Calling notificationService.getUnreadCount()");
      const response = await notificationService.getUnreadCount();

      console.log("Step 2: Response received");
      console.log("Response:", JSON.stringify(response, null, 2));

      console.log("Step 3: Checking response structure");
      console.log("response.success:", response.success);
      console.log("response.count:", response.count);
      console.log("typeof response.count:", typeof response.count);

      if (response.success && typeof response.count === "number") {
        console.log("Step 4: Valid response, setting count");
        console.log("Setting unreadCount to:", response.count);
        setUnreadCount(response.count);
        console.log("✅ SUCCESS: Count set successfully");
      } else {
        console.warn("⚠️ WARNING: Invalid response format");
        console.warn("Expected: { success: true, count: number }");
        console.warn("Got:", response);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("═══════════════════════════════════════");
      console.error("❌ ERROR in fetchUnreadCount");
      console.error("═══════════════════════════════════════");
      console.error("Error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      console.error("═══════════════════════════════════════");
      setUnreadCount(0);
    }

    console.log("═══════════════════════════════════════");
    console.log("🔄 FETCHING UNREAD COUNT - END");
    console.log("═══════════════════════════════════════");
    console.log("");
  };

  // Add this test function - call it from a button to manually test
  const testNotificationBadge = async () => {
    console.log("🧪 MANUAL TEST - Force setting count to 5");
    setUnreadCount(5);

    setTimeout(() => {
      console.log("🧪 MANUAL TEST - After 2 seconds, fetch real count");
      fetchUnreadCount();
    }, 2000);
  };

  // Fetch user data and notifications on mount
  useEffect(() => {
    const fetchUserAndNotifications = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        await fetchNotifications();
        await fetchUnreadCount();
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserAndNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await notificationService.getNotifications();
      if (response.success && response.notifications) {
        setNotifications(response.notifications.data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate to scan result if available
    if (notification.data?.scan_id) {
      setShowNotifications(false);
      router.push({
        pathname: "/scan-result",
        params: { scan_id: notification.data.scan_id },
      });
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    const response = await notificationService.markAsRead(notificationId);
    if (response.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const response = await notificationService.markAllAsRead();
    if (response.success) {
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
          read_at: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    }
  };

  const handleDeleteNotification = async (notificationId: number) => {
    const response =
      await notificationService.deleteNotification(notificationId);
    if (response.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      await fetchUnreadCount();
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required");
      return false;
    }
    return true;
  };

  const getFirstName = (fullName: string | undefined) => {
    if (!fullName) return "User";
    return fullName.split(" ")[0];
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required");
      return false;
    }
    return true;
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      await authService.logout();
      router.replace("/");
    } catch (error) {
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
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

        setImageUri(null);
        setResult(null);
        setError(null);
        setProcessing(false);

        router.push({
          pathname: "/scan-result",
          params: { scan_id: response.data.scan_id },
        });
      } else {
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

  const handleScanHistory = () => {
    router.push("/scan-history");
  };

  return (
    <View style={styles.container}>
      <AnalysisLoadingModal visible={processing} />

      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onRefresh={fetchNotifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDelete={handleDeleteNotification}
        onNotificationPress={handleNotificationPress}
      />

      {/* USER HEADER - COLORED BACKGROUND */}
      <View style={styles.userHeader}>
        <SafeAreaView style={styles.userHeaderSafe}>
          <View style={styles.userHeaderContent}>
            {/* Left: Logo + Name */}
            <View style={styles.userInfoSection}>
              {loadingUser ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <View style={styles.userInfoSection}>
                    <TouchableOpacity
                      onPress={() => setShowUserMenu(!showUserMenu)}
                      activeOpacity={0.7}
                      style={styles.userTouchable}
                    >
                      <View style={styles.logoContainer}>
                        {user?.avatar ? (
                          <Image
                            source={{ uri: user.avatar }}
                            style={styles.avatar}
                          />
                        ) : (
                          <View style={styles.defaultAvatar}>
                            <Feather name="user" size={20} color="#60a5fa" />
                          </View>
                        )}
                      </View>

                      <View style={styles.userTextContainer}>
                        <Text style={styles.greetingText}>Welcome,</Text>
                        <Text style={styles.userName}>
                          {getFirstName(user?.name)}
                        </Text>
                      </View>

                      <Feather
                        name={showUserMenu ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#ffffff"
                      />
                    </TouchableOpacity>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                      <View style={styles.userDropdown}>
                        <View style={styles.dropdownUserInfo}>
                          <Text style={styles.dropdownUserName}>
                            {user?.name || "User"}
                          </Text>
                          <Text style={styles.dropdownUserEmail}>
                            {user?.email || ""}
                          </Text>
                        </View>

                        <View style={styles.dropdownDivider} />

                        <TouchableOpacity
                          style={styles.dropdownItem}
                          onPress={handleLogout}
                        >
                          <Feather name="log-out" size={18} color="#ef4444" />
                          <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>

            {/* Right: Notification Bell + History Button */}
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => setShowNotifications(true)}
                activeOpacity={0.7}
              >
                <Feather name="bell" size={20} color="#ffffff" />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.historyButton}
                onPress={handleScanHistory}
                activeOpacity={0.7}
              >
                <Feather name="clock" size={20} color="#ffffff" />
                <Text style={styles.historyButtonText}>History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* MAIN CONTENT CONTAINER - ROUNDED TOP */}
      <View style={styles.mainContentContainer}>
        {/* Header Text */}
        <View style={styles.header}>
          <Text style={styles.title}>Scan Your Pet</Text>
          <Text style={styles.subtitle}>
            Upload a photo or use your camera to identify your pet's breed.
          </Text>
        </View>

        {/* Scrollable Content */}
        <View style={styles.content}>
          {!imageUri ? (
            <>
              <View style={styles.uploadCard}>
                <View style={styles.uploadIconContainer}>
                  <View style={styles.iconCircle}>
                    <Feather name="camera" size={40} color="#60a5fa" />
                  </View>
                </View>
                <Text style={styles.uploadText}>Select an image</Text>
              </View>

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
            <>
              <View style={styles.previewCard}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              </View>

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

        {error && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    </View>
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
    backgroundColor: "#1e3a8a",
  },

  userHeader: {
    backgroundColor: "#1e3a8a",
    paddingBottom: 16,
    marginTop: 35,
  },
  userDropdown: {
    position: "absolute",
    top: 65,
    left: 0,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 2000,
  },
  dropdownUserInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  dropdownUserName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  dropdownUserEmail: {
    fontSize: 13,
    color: "#9ca3af",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "600",
  },
  userHeaderSafe: {
    paddingTop: 8,
  },
  userHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  userInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  defaultAvatar: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(96, 165, 250, 0.2)",
  },
  userTextContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 12,
    color: "#93c5fd",
    fontWeight: "500",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 2,
  },
  userTouchable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    maxWidth: "70%",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationButton: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#2a2a2a",
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#1e3a8a",
  },
  notificationBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  historyButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  mainContentContainer: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    marginTop: -8,
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
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
    marginTop: 6,
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
