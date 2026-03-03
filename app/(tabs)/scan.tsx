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
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const C = {
  green: "#16a34a",
  greenLight: "#22c55e",
  greenPale: "#dcfce7",
  greenMid: "#bbf7d0",
  greenDim: "#f0fdf4",
  white: "#ffffff",
  offWhite: "#f8fafc",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  text: "#0f172a",
  textMid: "#334155",
  textSoft: "#64748b",
  textFaint: "#94a3b8",
  red: "#ef4444",
  redPale: "#fef2f2",
  amber: "#f59e0b",
  amberPale: "#fffbeb",
  shadow: "rgba(22,163,74,0.12)",
};

// ─── INTERFACES ─────────────────────────────────────────────────────────────
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
// NOTIFICATION MODAL
// ============================================================================
const NotificationModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  onRefresh: () => void;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: number) => void;
  onNotificationPress: (n: Notification) => void;
}> = ({
  visible,
  onClose,
  notifications,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onNotificationPress,
}) => (
  <Modal visible={visible} animationType="slide" transparent>
    <View style={ns.overlay}>
      <View style={ns.sheet}>
        <View style={ns.handle} />
        <View style={ns.header}>
          <Text style={ns.title}>Notifications</Text>
          <View style={ns.headerRight}>
            {notifications.length > 0 && (
              <TouchableOpacity onPress={onMarkAllAsRead} style={ns.markAllBtn}>
                <Text style={ns.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={ns.closeBtn}>
              <Feather name="x" size={18} color={C.textMid} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={ns.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[ns.card, !item.read && ns.unreadCard]}
              onPress={() => onNotificationPress(item)}
              activeOpacity={0.75}
            >
              <View style={[ns.iconWrap, !item.read && ns.iconWrapUnread]}>
                <Feather
                  name={item.type === "scan_verified" ? "check-circle" : "bell"}
                  size={16}
                  color={item.read ? C.textSoft : C.green}
                />
                {!item.read && <View style={ns.dot} />}
              </View>
              <View style={ns.cardBody}>
                <Text style={ns.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={ns.cardMsg} numberOfLines={2}>
                  {item.message}
                </Text>
                <Text style={ns.cardTime}>
                  {new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onDelete(item.id)}
                style={ns.delBtn}
              >
                <Feather name="trash-2" size={15} color={C.textFaint} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={ns.empty}>
              <View style={ns.emptyIcon}>
                <Feather name="bell-off" size={28} color={C.textFaint} />
              </View>
              <Text style={ns.emptyTitle}>All caught up</Text>
              <Text style={ns.emptySub}>No new notifications</Text>
            </View>
          }
        />
      </View>
    </View>
  </Modal>
);

const ns = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.82,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: C.greenPale,
    borderRadius: 8,
  },
  markAllText: { fontSize: 12, fontWeight: "600", color: C.green },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.offWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.offWhite,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  unreadCard: { backgroundColor: C.greenDim, borderColor: C.greenMid },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    position: "relative",
  },
  iconWrapUnread: { backgroundColor: C.greenPale },
  dot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.red,
    borderWidth: 1.5,
    borderColor: C.white,
  },
  cardBody: { flex: 1 },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
    marginBottom: 3,
  },
  cardMsg: { fontSize: 12, color: C.textSoft, lineHeight: 18, marginBottom: 5 },
  cardTime: { fontSize: 11, color: C.textFaint },
  delBtn: { padding: 6 },
  empty: { alignItems: "center", paddingVertical: 48 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.offWhite,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 14, fontWeight: "600", color: C.textMid },
  emptySub: { fontSize: 12, color: C.textFaint, marginTop: 4 },
});

// ============================================================================
// ANALYSIS LOADING MODAL
// ============================================================================
const AnalysisLoadingModal: React.FC<{ visible: boolean }> = ({ visible }) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const stages: AnalysisStage[] = [
    {
      id: "upload",
      label: "Uploading image",
      icon: "upload-cloud",
      duration: 800,
    },
    { id: "identify", label: "Identifying breed", icon: "cpu", duration: 6000 },
    {
      id: "features",
      label: "Extracting features",
      icon: "layers",
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
      label: "Building health profile",
      icon: "heart",
      duration: 2000,
    },
    {
      id: "finalize",
      label: "Finalizing results",
      icon: "check-circle",
      duration: 1500,
    },
  ];
  const totalDuration = stages.reduce((s, st) => s + st.duration, 0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    if (!visible) {
      setCurrentStageIndex(0);
      setProgress(0);
      progressAnim.setValue(0);
      return;
    }
    let elapsed = 0;
    const iv = setInterval(() => {
      elapsed += 50;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(pct);
      Animated.timing(progressAnim, {
        toValue: pct,
        duration: 50,
        useNativeDriver: false,
      }).start();
      let sum = 0;
      for (let i = 0; i < stages.length; i++) {
        sum += stages[i].duration;
        if (elapsed < sum) {
          setCurrentStageIndex(i);
          break;
        }
      }
      if (elapsed >= totalDuration) clearInterval(iv);
    }, 50);
    return () => clearInterval(iv);
  }, [visible]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  const current = stages[currentStageIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={ls.overlay}>
        <View style={ls.card}>
          {/* Header */}
          <View style={ls.cardHeader}>
            <Animated.View
              style={[ls.bigIcon, { transform: [{ scale: pulseAnim }] }]}
            >
              <Feather name="cpu" size={22} color={C.white} />
            </Animated.View>
            <View>
              <Text style={ls.cardTitle}>Analyzing Your Pet</Text>
              <Text style={ls.cardSub}>
                Breed identification in progress
              </Text>
            </View>
          </View>

          {/* Current stage */}
          <View style={ls.stageRow}>
            <Animated.View
              style={[ls.stageIcon, { transform: [{ rotate: spin }] }]}
            >
              <Feather name={current?.icon} size={18} color={C.green} />
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text style={ls.stageLabel}>{current?.label}...</Text>
              <Text style={ls.stageStep}>
                Step {currentStageIndex + 1} of {stages.length} ·{" "}
                {Math.round(progress)}%
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={ls.barTrack}>
            <Animated.View style={[ls.barFill, { width: progressWidth }]} />
          </View>

          {/* Steps list */}
          <View style={ls.stepsList}>
            {stages.map((s, i) => {
              const done = i < currentStageIndex;
              const curr = i === currentStageIndex;
              return (
                <View
                  key={s.id}
                  style={[ls.stepRow, { opacity: done || curr ? 1 : 0.35 }]}
                >
                  <View
                    style={[
                      ls.stepDot,
                      done
                        ? ls.stepDotDone
                        : curr
                          ? ls.stepDotCurr
                          : ls.stepDotPend,
                    ]}
                  >
                    {done ? (
                      <Feather name="check" size={9} color={C.white} />
                    ) : curr ? (
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Feather name="loader" size={9} color={C.white} />
                      </Animated.View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      ls.stepLabel,
                      done && ls.stepLabelDone,
                      curr && ls.stepLabelCurr,
                    ]}
                  >
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ls = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  bigIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
  },
  cardSub: { fontSize: 12, color: C.textSoft, marginTop: 2 },
  stageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.greenDim,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.greenMid,
  },
  stageIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.greenPale,
    alignItems: "center",
    justifyContent: "center",
  },
  stageLabel: { fontSize: 13, fontWeight: "600", color: C.text },
  stageStep: { fontSize: 11, color: C.textSoft, marginTop: 2 },
  barTrack: {
    height: 6,
    backgroundColor: C.borderLight,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  barFill: { height: "100%", backgroundColor: C.green, borderRadius: 3 },
  stepsList: { gap: 8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotDone: { backgroundColor: C.green },
  stepDotCurr: { backgroundColor: C.greenLight },
  stepDotPend: { backgroundColor: C.border },
  stepLabel: { fontSize: 12, color: C.textFaint },
  stepLabelDone: { color: C.green, fontWeight: "500" },
  stepLabelCurr: { color: C.text, fontWeight: "600" },
});

// ============================================================================
// MAIN SCAN PAGE
// ============================================================================
function ScanPage() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const init = async () => {
      try {
        const u = await authService.getCurrentUser();
        setUser(u);
        await fetchNotifications();
        await fetchUnreadCount();
      } catch {
        /* silent */
      } finally {
        setLoadingUser(false);
      }
    };
    init();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const r = await notificationService.getUnreadCount();
      if (r.success && typeof r.count === "number") setUnreadCount(r.count);
      else setUnreadCount(0);
    } catch {
      setUnreadCount(0);
    }
  };

  const fetchNotifications = async () => {
    try {
      const r = await notificationService.getNotifications();
      if (r.success && r.notifications) setNotifications(r.notifications.data);
    } catch {
      /* silent */
    }
  };

  const handleNotificationPress = async (n: Notification) => {
    if (!n.read) await handleMarkAsRead(n.id);
    if (n.data?.scan_id) {
      setShowNotifications(false);
      router.push({
        pathname: "/scan-result",
        params: { scan_id: n.data.scan_id },
      });
    }
  };

  const handleMarkAsRead = async (id: number) => {
    const r = await notificationService.markAsRead(id);
    if (r.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const r = await notificationService.markAllAsRead();
    if (r.success) {
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

  const handleDeleteNotification = async (id: number) => {
    const r = await notificationService.deleteNotification(id);
    if (r.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await fetchUnreadCount();
    }
  };

  const getFirstName = (name?: string) => (name ? name.split(" ")[0] : "User");

  const requestCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required");
      return false;
    }
    return true;
  };

  const requestGallery = async () => {
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
    } catch {
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const handleTakePhoto = async () => {
    if (!(await requestCamera())) return;
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (!r.canceled) {
      setImageUri(r.assets[0].uri);
      setError(null);
    }
  };

  const handlePickImage = async () => {
    if (!(await requestGallery())) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });
    if (!r.canceled) {
      setImageUri(r.assets[0].uri);
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
      const response = await ApiService.analyzeImage(imageUri);
      if (response.success && response.data) {
        setImageUri(null);
        setError(null);
        setProcessing(false);
        router.push({
          pathname: "/scan-result",
          params: { scan_id: response.data.scan_id },
        });
      } else {
        let msg = response.message || "Analysis failed";
        if (response.errors) {
          const k = Object.keys(response.errors)[0];
          if (k && response.errors[k]) msg = response.errors[k][0];
        }
        setError(msg);
        setProcessing(false);
        Alert.alert("Upload Failed", msg);
      }
    } catch {
      setError("Connection failed. Check server.");
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setImageUri(null);
    setError(null);
  };

  // ─── HOW IT WORKS DATA ────────────────────────────────────────────────────
  const howItWorks = [
    {
      icon: "upload-cloud",
      title: "Upload Photo",
      desc: "Choose from gallery or take a live photo of your dog",
    },
    {
      icon: "cpu",
      title: "Analysis",
      desc: "Our model identifies visual breed characteristics",
    },
    {
      icon: "bar-chart-2",
      title: "Ranked Results",
      desc: "Results ranked by confidence score with top 5 breeds",
    },
    {
      icon: "shield",
      title: "Vet Verification",
      desc: "Optional expert verification for extra accuracy",
    },
  ];

  // ─── CAPTURE TIPS DATA ────────────────────────────────────────────────────
  const captureTips = [
    { icon: "sun", text: "Good natural lighting, avoid harsh shadows" },
    { icon: "target", text: "Dog centred and clearly visible in frame" },
    { icon: "image", text: "Front or side angle works best" },
    { icon: "aperture", text: "Plain or simple backgrounds preferred" },
    { icon: "dog", text: "Only dog images are accepted by the AI" },
  ];

  return (
    <View style={s.root}>
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

      {/* ── TOP BAR ── */}
      <View style={s.topBar}>
        <SafeAreaView style={s.topSafe}>
          <View style={s.topRow}>
            {/* User info */}
            <TouchableOpacity
              style={s.userBtn}
              onPress={() => setShowUserMenu(!showUserMenu)}
              activeOpacity={0.75}
            >
              {loadingUser ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <>
                  {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={s.avatar} />
                  ) : (
                    <View style={s.avatarDefault}>
                      <Feather name="user" size={16} color={C.green} />
                    </View>
                  )}
                  <View>
                    <Text style={s.greeting}>Welcome back</Text>
                    <Text style={s.userName}>{getFirstName(user?.name)}</Text>
                  </View>
                  <Feather
                    name={showUserMenu ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="rgba(255,255,255,0.7)"
                  />
                </>
              )}
            </TouchableOpacity>

            {/* Dropdown */}
            {showUserMenu && (
              <View style={s.dropdown}>
                <View style={s.ddInfo}>
                  <Text style={s.ddName}>{user?.name || "User"}</Text>
                  <Text style={s.ddEmail}>{user?.email || ""}</Text>
                </View>
                <View style={s.ddDivider} />
                <TouchableOpacity style={s.ddItem} onPress={handleLogout}>
                  <Feather name="log-out" size={15} color={C.red} />
                  <Text style={s.ddLogout}>Sign out</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Right actions */}
            <View style={s.topActions}>
              <TouchableOpacity
                style={s.notifBtn}
                onPress={() => setShowNotifications(true)}
                activeOpacity={0.75}
              >
                <Feather name="bell" size={18} color={C.white} />
                {unreadCount > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.historyBtn}
                onPress={() => router.push("/scan-history")}
                activeOpacity={0.75}
              >
                <Feather name="clock" size={15} color={C.white} />
                <Text style={s.historyBtnText}>History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── BODY ── */}
      <View style={s.body}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Page title */}
            <View style={s.pageHead}>
              <View style={s.statusPill}>
                <View style={s.statusDot} />
                <Text style={s.statusLabel}>BREED DETECTION</Text>
              </View>
              <Text style={s.pageTitle}>Scan Your Dog</Text>
              <Text style={s.pageSub}>
                Upload a photo or take one to identify your dog's breed.
              </Text>
            </View>

            {/* ── SCAN CARD ── */}
            <View style={s.scanCard}>
              <View style={s.scanCardBar}>
                <View style={s.scanCardBarDots}>
                  {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
                    <View key={i} style={[s.winDot, { backgroundColor: c }]} />
                  ))}
                </View>
                <Text style={s.scanCardBarLabel}>doglens://scan</Text>
                <View style={s.scanCardBarStatus}>
                  <View
                    style={[
                      s.scanStatusDot,
                      processing && s.scanStatusDotActive,
                    ]}
                  />
                  <Text style={s.scanStatusText}>
                    {processing ? "PROCESSING" : imageUri ? "READY" : "WAITING"}
                  </Text>
                </View>
              </View>

              <View style={s.scanCardBody}>
                {/* STATE A – No image */}
                {!imageUri && (
                  <View style={s.stateA}>
                    <View style={s.dropZone}>
                      <View style={s.dropIconWrap}>
                        <Feather
                          name="upload-cloud"
                          size={28}
                          color={C.green}
                        />
                      </View>
                      <Text style={s.dropTitle}>Drop your dog image here</Text>
                      <Text style={s.dropSub}>
                        Supports JPG, PNG, WEBP · Max 10 MB
                      </Text>
                    </View>

                    <View style={s.orRow}>
                      <View style={s.orLine} />
                      <Text style={s.orText}>or choose an option</Text>
                      <View style={s.orLine} />
                    </View>

                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={handleTakePhoto}
                        activeOpacity={0.8}
                      >
                        <View style={s.actionBtnIcon}>
                          <Feather name="camera" size={18} color={C.green} />
                        </View>
                        <Text style={s.actionBtnText}>Take Photo</Text>
                        <Text style={s.actionBtnSub}>Use camera</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={handlePickImage}
                        activeOpacity={0.8}
                      >
                        <View style={s.actionBtnIcon}>
                          <Feather name="image" size={18} color={C.green} />
                        </View>
                        <Text style={s.actionBtnText}>Gallery</Text>
                        <Text style={s.actionBtnSub}>Browse files</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* STATE B – Image selected */}
                {imageUri && (
                  <View style={s.stateB}>
                    <View style={s.previewWrap}>
                      <Image
                        source={{ uri: imageUri }}
                        style={s.previewImg}
                        resizeMode="cover"
                      />
                      <View style={s.previewOverlay}>
                        <View style={s.previewBadge}>
                          <Feather
                            name="check-circle"
                            size={10}
                            color={C.white}
                          />
                          <Text style={s.previewBadgeText}>Image Ready</Text>
                        </View>
                      </View>
                      {/* Corner brackets */}
                      {["tl", "tr", "bl", "br"].map((p) => (
                        <View
                          key={p}
                          style={[
                            s.corner,
                            p === "tl"
                              ? s.cornerTL
                              : p === "tr"
                                ? s.cornerTR
                                : p === "bl"
                                  ? s.cornerBL
                                  : s.cornerBR,
                          ]}
                        />
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[s.analyzeBtn, processing && s.analyzeBtnDisabled]}
                      onPress={handleAnalyze}
                      disabled={processing}
                      activeOpacity={0.85}
                    >
                      <Feather name="zap" size={17} color={C.white} />
                      <Text style={s.analyzeBtnText}>
                        {processing ? "Analyzing…" : "Analyze Image"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={s.retakeBtn}
                      onPress={handleReset}
                      disabled={processing}
                      activeOpacity={0.75}
                    >
                      <Feather name="refresh-cw" size={14} color={C.textSoft} />
                      <Text style={s.retakeBtnText}>
                        Choose different photo
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* ── ERROR BANNER ── */}
            {error && (
              <View style={s.errorBanner}>
                <Feather name="alert-circle" size={15} color={C.red} />
                <Text style={s.errorText}>{error}</Text>
                <TouchableOpacity
                  onPress={() => setError(null)}
                  style={s.errorClose}
                >
                  <Feather name="x" size={14} color={C.red} />
                </TouchableOpacity>
              </View>
            )}

            {/* ── HOW IT WORKS ── */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <View style={s.sectionIconWrap}>
                  <Feather name="eye" size={13} color={C.green} />
                </View>
                <Text style={s.sectionTitle}>HOW IT WORKS</Text>
              </View>

              <View style={s.stepsCard}>
                {howItWorks.map((step, i) => (
                  <View
                    key={i}
                    style={[
                      s.stepItem,
                      i < howItWorks.length - 1 && s.stepItemBorder,
                    ]}
                  >
                    <View style={s.stepNum}>
                      <Text style={s.stepNumText}>0{i + 1}</Text>
                    </View>
                    <View style={s.stepIconWrap}>
                      <Feather
                        name={step.icon as any}
                        size={15}
                        color={C.green}
                      />
                    </View>
                    <View style={s.stepText}>
                      <Text style={s.stepTitle}>{step.title}</Text>
                      <Text style={s.stepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* ── CAPTURE TIPS ── */}
            <View style={[s.section, { marginBottom: 32 }]}>
              <View style={s.sectionHead}>
                <View style={s.sectionIconWrap}>
                  <Feather name="zap" size={13} color={C.green} />
                </View>
                <Text style={s.sectionTitle}>CAPTURE TIPS</Text>
              </View>

              <View style={s.tipsGrid}>
                {captureTips.map((tip, i) => (
                  <View key={i} style={s.tipCard}>
                    <View style={s.tipIconWrap}>
                      <Feather
                        name={tip.icon as any}
                        size={16}
                        color={C.green}
                      />
                    </View>
                    <Text style={s.tipText}>{tip.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.green },

  // TOP BAR
  topBar: { backgroundColor: C.green },
  topSafe: { paddingTop: Platform.OS === "android" ? 36 : 0 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    position: "relative",
  },
  userBtn: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarDefault: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  greeting: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.white,
    letterSpacing: -0.2,
  },
  dropdown: {
    position: "absolute",
    top: 70,
    left: 20,
    backgroundColor: C.white,
    borderRadius: 16,
    minWidth: 210,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    zIndex: 99,
    borderWidth: 1,
    borderColor: C.border,
  },
  ddInfo: { padding: 16 },
  ddName: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 3 },
  ddEmail: { fontSize: 12, color: C.textSoft },
  ddDivider: { height: 1, backgroundColor: C.borderLight },
  ddItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  ddLogout: { fontSize: 14, fontWeight: "600", color: C.red },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  notifBtn: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: C.red,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: C.green,
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: C.white },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  historyBtnText: { fontSize: 13, fontWeight: "600", color: C.white },

  // BODY
  body: {
    flex: 1,
    backgroundColor: C.offWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -10,
    overflow: "hidden",
  },
  scroll: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 24 },

  // PAGE HEAD
  pageHead: { marginBottom: 20 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: C.greenPale,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.greenMid,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  statusLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.green,
    letterSpacing: 0.8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  pageSub: { fontSize: 13, color: C.textSoft, lineHeight: 19 },

  // SCAN CARD
  scanCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  scanCardBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  scanCardBarDots: { flexDirection: "row", gap: 5, marginRight: 10 },
  winDot: { width: 8, height: 8, borderRadius: 4 },
  scanCardBarLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    color: C.textFaint,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  scanCardBarStatus: { flexDirection: "row", alignItems: "center", gap: 5 },
  scanStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.textFaint,
  },
  scanStatusDotActive: { backgroundColor: C.green },
  scanStatusText: {
    fontSize: 9,
    fontWeight: "700",
    color: C.textFaint,
    letterSpacing: 0.6,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  scanCardBody: { padding: 16 },

  // STATE A – no image
  stateA: { gap: 14 },
  dropZone: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.greenMid,
    borderStyle: "dashed",
    backgroundColor: C.greenDim,
    gap: 10,
  },
  dropIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.greenPale,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.greenMid,
  },
  dropTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.2,
  },
  dropSub: { fontSize: 11, color: C.textSoft },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: C.border },
  orText: { fontSize: 11, color: C.textFaint, fontWeight: "500" },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    backgroundColor: C.offWhite,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  actionBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.greenPale,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700", color: C.text },
  actionBtnSub: { fontSize: 11, color: C.textFaint },

  // STATE B – image selected
  stateB: { gap: 12 },
  previewWrap: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: C.borderLight,
  },
  previewImg: {
    width: "100%",
    height: Math.round(width * 0.55),
    borderRadius: 16,
  },
  previewOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(22,163,74,0.88)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  previewBadgeText: { fontSize: 10, fontWeight: "700", color: C.white },
  corner: {
    position: "absolute",
    width: 16,
    height: 16,
    borderColor: C.green,
    borderStyle: "solid",
  },
  cornerTL: {
    top: 8,
    left: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 8,
    right: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 4,
  },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.green,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  analyzeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.white,
    letterSpacing: -0.2,
  },
  analyzeBtnDisabled: { opacity: 0.55 },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  retakeBtnText: { fontSize: 13, fontWeight: "500", color: C.textSoft },

  // ERROR
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.redPale,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: "500", color: C.red },
  errorClose: { padding: 4 },

  // SECTION
  section: { marginBottom: 14 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: C.greenPale,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.greenMid,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMid,
    letterSpacing: 0.8,
  },

  // HOW IT WORKS
  stepsCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  stepItemBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  stepNum: { width: 22 },
  stepNumText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.greenLight,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  stepIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.greenPale,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.greenMid,
  },
  stepText: { flex: 1 },
  stepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  stepDesc: { fontSize: 11, color: C.textSoft, lineHeight: 16 },

  // CAPTURE TIPS
  tipsGrid: { gap: 8 },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  tipIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.greenPale,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.greenMid,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: C.textMid,
    lineHeight: 18,
    paddingTop: 7,
    fontWeight: "500",
  },
});

export default ScanPage;
