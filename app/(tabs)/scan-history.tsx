import ApiService from "@/services/api";
import authService, { User } from "@/services/authService";
import notificationService, {
  Notification,
} from "@/services/notificationservice";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const PER_PAGE = 20;

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
  shadow: "rgba(22,163,74,0.12)",
};

type FilterType = "all" | "verified" | "pending";

interface ScanHistoryItem {
  id: number;
  scan_id: string;
  image_url: string;
  breed: string;
  confidence: number;
  created_at: string;
  status?: "pending" | "verified";
}

// Server-side aggregate stats (all records, not just loaded page)
interface ServerStats {
  total: number;
  verified_count: number;
  pending_count: number;
  avg_confidence: number;
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
          <View style={ns.hRight}>
            {notifications.length > 0 && (
              <TouchableOpacity onPress={onMarkAllAsRead} style={ns.markBtn}>
                <Text style={ns.markText}>Mark all read</Text>
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
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[ns.card, !item.read && ns.unread]}
              onPress={() => onNotificationPress(item)}
              activeOpacity={0.75}
            >
              <View style={[ns.iconW, !item.read && ns.iconWU]}>
                <Feather
                  name={item.type === "scan_verified" ? "check-circle" : "bell"}
                  size={16}
                  color={item.read ? C.textSoft : C.green}
                />
                {!item.read && <View style={ns.dot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ns.cTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={ns.cMsg} numberOfLines={2}>
                  {item.message}
                </Text>
                <Text style={ns.cTime}>
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
                style={{ padding: 6 }}
              >
                <Feather name="trash-2" size={15} color={C.textFaint} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 48 }}>
              <View style={ns.emptyIcon}>
                <Feather name="bell-off" size={28} color={C.textFaint} />
              </View>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: C.textMid }}
              >
                All caught up
              </Text>
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
    maxHeight: Dimensions.get("window").height * 0.82,
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
  title: { fontSize: 16, fontWeight: "700", color: C.text },
  hRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  markBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: C.greenPale,
    borderRadius: 8,
  },
  markText: { fontSize: 12, fontWeight: "600", color: C.green },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.offWhite,
    alignItems: "center",
    justifyContent: "center",
  },
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
  unread: { backgroundColor: C.greenDim, borderColor: C.greenMid },
  iconW: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    position: "relative",
  },
  iconWU: { backgroundColor: C.greenPale },
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
  cTitle: { fontSize: 13, fontWeight: "600", color: C.text, marginBottom: 3 },
  cMsg: { fontSize: 12, color: C.textSoft, lineHeight: 18, marginBottom: 5 },
  cTime: { fontSize: 11, color: C.textFaint },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.offWhite,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
});

// ============================================================================
// STAT CARD
// ============================================================================
const StatCard: React.FC<{
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  sub: string;
  barPercent: number;
  delay?: number;
}> = ({ icon, label, value, sub, barPercent, delay = 0 }) => {
  const bar = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(bar, {
        toValue: barPercent,
        duration: 900,
        useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(t);
  }, [barPercent]);
  const barW = bar.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  return (
    <View style={sc.card}>
      <View style={sc.icon}>
        <Feather name={icon} size={13} color={C.green} />
      </View>
      <Text style={sc.lbl}>{label}</Text>
      <Text style={sc.val}>{value}</Text>
      <Text style={sc.sub}>{sub}</Text>
      <View style={sc.track}>
        <Animated.View style={[sc.fill, { width: barW }]} />
      </View>
    </View>
  );
};
const sc = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    position: "relative",
    paddingBottom: 18,
  },
  icon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: C.greenPale,
    borderWidth: 1,
    borderColor: C.greenMid,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  lbl: {
    fontSize: 9,
    fontWeight: "700",
    color: C.textFaint,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 6,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  val: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  sub: { fontSize: 10, color: C.textFaint },
  track: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: C.borderLight,
  },
  fill: { height: "100%", backgroundColor: C.green },
});

// ============================================================================
// SCAN CARD
// ============================================================================
const ScanCard: React.FC<{
  item: ScanHistoryItem;
  onPress: () => void;
  onDelete: () => void;
  index: number;
}> = ({ item, onPress, onDelete, index }) => {
  const fa = useRef(new Animated.Value(0)).current;
  const sa = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    const t = setTimeout(
      () => {
        Animated.parallel([
          Animated.timing(fa, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(sa, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
        ]).start();
      },
      (index % 10) * 35,
    );
    return () => clearTimeout(t);
  }, []);

  const isVerified = item.status === "verified";
  const cardW = (width - 18 * 2 - 10) / 2;

  return (
    <Animated.View
      style={{ opacity: fa, transform: [{ translateY: sa }], width: cardW }}
    >
      <TouchableOpacity style={cd.root} onPress={onPress} activeOpacity={0.78}>
        <View style={cd.imgWrap}>
          <Image
            source={{ uri: item.image_url }}
            style={cd.img}
            resizeMode="cover"
          />
          <View style={cd.grad} />
          <View style={[cd.statusB, isVerified ? cd.verifiedB : cd.pendingB]}>
            <Feather
              name={isVerified ? "check-circle" : "clock"}
              size={8}
              color={isVerified ? C.green : C.amber}
            />
            <Text style={[cd.statusT, isVerified ? cd.verifiedT : cd.pendingT]}>
              {isVerified ? "Verified" : "Pending"}
            </Text>
          </View>
          <View style={cd.confB}>
            <Text style={cd.confT}>{Math.round(item.confidence)}%</Text>
          </View>
          <TouchableOpacity
            style={cd.delB}
            onPress={onDelete}
            activeOpacity={0.85}
          >
            <Feather name="trash-2" size={12} color={C.white} />
          </TouchableOpacity>
          {(["tl", "tr", "bl", "br"] as const).map((pos) => (
            <View
              key={pos}
              style={[
                cd.corner,
                pos === "tl"
                  ? cd.cTL
                  : pos === "tr"
                    ? cd.cTR
                    : pos === "bl"
                      ? cd.cBL
                      : cd.cBR,
              ]}
            />
          ))}
        </View>
        <View style={cd.body}>
          <Text style={cd.breed} numberOfLines={2}>
            {item.breed}
          </Text>
          <View style={cd.barRow}>
            <Text style={cd.barLbl}>Confidence</Text>
            <Text style={cd.barVal}>{Math.round(item.confidence)}%</Text>
          </View>
          <View style={cd.barTrack}>
            <View
              style={[
                cd.barFill,
                { width: `${Math.min(item.confidence, 100)}%` as any },
              ]}
            />
          </View>
          <View style={cd.dateRow}>
            <Feather name="calendar" size={9} color={C.textFaint} />
            <Text style={cd.dateT}>
              {new Date(item.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
const cd = StyleSheet.create({
  root: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  imgWrap: {
    position: "relative",
    height: 115,
    backgroundColor: C.borderLight,
  },
  img: { width: "100%", height: "100%" },
  grad: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  statusB: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  verifiedB: {
    backgroundColor: "rgba(240,253,244,0.93)",
    borderColor: C.greenMid,
  },
  pendingB: {
    backgroundColor: "rgba(255,251,235,0.93)",
    borderColor: "#fde68a",
  },
  statusT: {
    fontSize: 9,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  verifiedT: { color: C.green },
  pendingT: { color: C.amber },
  confB: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: C.green,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 5,
  },
  confT: {
    fontSize: 10,
    fontWeight: "800",
    color: C.white,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  delB: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 10,
    height: 10,
    borderColor: "rgba(255,255,255,0.65)",
  },
  cTL: { top: 5, left: 5, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  cTR: { top: 5, right: 36, borderTopWidth: 1.5, borderRightWidth: 1.5 },
  cBL: { bottom: 5, left: 5, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  cBR: { bottom: 5, right: 5, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  body: { padding: 11 },
  breed: {
    fontSize: 12,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
    letterSpacing: -0.2,
    lineHeight: 17,
  },
  barRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  barLbl: {
    fontSize: 9,
    fontWeight: "600",
    color: C.textFaint,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  barVal: {
    fontSize: 9,
    fontWeight: "700",
    color: C.green,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  barTrack: {
    height: 3,
    backgroundColor: C.borderLight,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 7,
  },
  barFill: { height: "100%", backgroundColor: C.green, borderRadius: 2 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateT: { fontSize: 10, color: C.textFaint },
});

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function ScanHistoryPage() {
  const router = useRouter();

  // ── data ──
  const [allScans, setAllScans] = useState<ScanHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── server-side aggregate stats (full dataset, not just loaded records) ──
  const [serverStats, setServerStats] = useState<ServerStats>({
    total: 0,
    verified_count: 0,
    pending_count: 0,
    avg_confidence: 0,
  });

  // ── filter / search ──
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  // ── ui ──
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // ── back handler ──
  useEffect(() => {
    const bh = BackHandler.addEventListener("hardwareBackPress", () => {
      if (showNotifications) {
        setShowNotifications(false);
        return true;
      }
      if (showUserMenu) {
        setShowUserMenu(false);
        return true;
      }
      router.push("/scan");
      return true;
    });
    return () => bh.remove();
  }, [showNotifications, showUserMenu]);

  // ── initial load — runs once on mount ──
  useEffect(() => {
    initUser();
  }, []);

  // ── focus effect — silently refreshes data every time this screen is focused
  //    (e.g. user navigates back from scan screen after uploading a new scan) ──
  useFocusEffect(
    useCallback(() => {
      silentRefresh();
    }, []),
  );

  // Loads the user profile once. Does not touch scan data.
  const initUser = async () => {
    try {
      const u = await authService.getCurrentUser();
      setUser(u);
    } catch {
      // non-fatal
    }
  };

  // Full silent refresh: resets to page 1 and reloads everything.
  // Shows a loading state only on the very first load (when allScans is empty).
  const silentRefresh = async () => {
    const isFirstLoad = allScans.length === 0;
    if (isFirstLoad) setLoading(true);

    try {
      await loadPage(1, true);
      await fetchNotifications();
      await fetchUnreadCount();
    } catch {
      setError("Failed to load data.");
    } finally {
      if (isFirstLoad) {
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 450,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  // ── load a single page of results ──
  const loadPage = async (pageNum: number, reset = false) => {
    try {
      setError(null);
      const r = await ApiService.getRecentResults(pageNum, PER_PAGE);

      if (r.success && r.data) {
        const newScans: ScanHistoryItem[] = r.data;
        setAllScans((prev) => (reset ? newScans : [...prev, ...newScans]));

        if (r.pagination) {
          setHasMore(r.pagination.has_more);
          setTotal(r.pagination.total);
          setPage(r.pagination.current_page);
        } else {
          setHasMore(false);
          setTotal(newScans.length);
          setPage(pageNum);
        }

        // Update server-side stats on every page-1 fetch so stats stay fresh
        // after a new scan is uploaded or an existing one is deleted.
        if (r.stats && pageNum === 1) {
          setServerStats(r.stats);
        }
      } else {
        setError(r.message || "Failed to load history");
      }
    } catch (e: any) {
      setError("Failed to load data. Please try again.");
    }
  };

  // ── infinite scroll trigger ──
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await loadPage(page + 1);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page]);

  // ── pull-to-refresh ──
  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadPage(1, true);
    setRefreshing(false);
  };

  // ── notifications ──
  const fetchNotifications = async () => {
    try {
      const r = await notificationService.getNotifications();
      if (r.success && r.notifications) setNotifications(r.notifications.data);
    } catch {
      /* silent */
    }
  };
  const fetchUnreadCount = async () => {
    try {
      const r = await notificationService.getUnreadCount();
      if (r.success && typeof r.count === "number") setUnreadCount(r.count);
    } catch {
      /* silent */
    }
  };
  const handleMarkAsRead = async (id: number) => {
    const r = await notificationService.markAsRead(id);
    if (r.success) {
      setNotifications((p) =>
        p.map((n) =>
          n.id === id
            ? { ...n, read: true, read_at: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((p) => Math.max(0, p - 1));
    }
  };
  const handleMarkAllAsRead = async () => {
    const r = await notificationService.markAllAsRead();
    if (r.success) {
      setNotifications((p) =>
        p.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })),
      );
      setUnreadCount(0);
    }
  };
  const handleDeleteNotification = async (id: number) => {
    const r = await notificationService.deleteNotification(id);
    if (r.success) {
      setNotifications((p) => p.filter((n) => n.id !== id));
      await fetchUnreadCount();
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

  const handleDeleteScan = (scanId: number) => {
    Alert.alert("Delete Scan", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const r = await ApiService.deleteScan(scanId);
            if (r.success) {
              // Optimistically remove from local list
              const deleted = allScans.find((s) => s.id === scanId);
              setAllScans((p) => p.filter((s) => s.id !== scanId));
              setTotal((p) => Math.max(0, p - 1));
              // Keep server stats in sync
              if (deleted) {
                const wasVerified = deleted.status === "verified";
                setServerStats((prev) => ({
                  ...prev,
                  total: Math.max(0, prev.total - 1),
                  verified_count: wasVerified
                    ? Math.max(0, prev.verified_count - 1)
                    : prev.verified_count,
                  pending_count: !wasVerified
                    ? Math.max(0, prev.pending_count - 1)
                    : prev.pending_count,
                }));
              }
            } else Alert.alert("Error", r.message || "Failed to delete");
          } catch {
            Alert.alert("Error", "Failed to delete scan.");
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      await authService.logout();
      router.replace("/");
    } catch {
      Alert.alert("Error", "Failed to logout.");
    }
  };

  const getFirstName = (n?: string) => (n ? n.split(" ")[0] : "User");

  // ── stats — always from server so they match the web ──
  const verifiedCount = serverStats.verified_count;
  const pendingCount = serverStats.pending_count;
  const avgConf = Math.round(serverStats.avg_confidence);

  // ── client-side filter + search on ALL loaded records ──
  const filtered = allScans.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchSearch = q === "" || s.breed.toLowerCase().includes(q);
    const matchFilter =
      filter === "all" ||
      (filter === "verified" && s.status === "verified") ||
      (filter === "pending" && (s.status === "pending" || !s.status));
    return matchSearch && matchFilter;
  });

  // Build 2-column rows for FlatList
  const rows: ScanHistoryItem[][] = [];
  for (let i = 0; i < filtered.length; i += 2)
    rows.push(filtered.slice(i, i + 2));

  // ── list header ──
  const ListHeader = () => (
    <Animated.View
      style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
    >
      {/* Stats 2×2 grid — values from server, always reflects full dataset */}
      <View style={p.statsSection}>
        <View style={p.statsRow}>
          <StatCard
            icon="layers"
            label="Total Scans"
            value={serverStats.total.toLocaleString()}
            sub="All time"
            barPercent={100}
            delay={0}
          />
          <View style={{ width: 8 }} />
          <StatCard
            icon="shield"
            label="Verified"
            value={verifiedCount.toLocaleString()}
            sub="By licensed vets"
            barPercent={
              serverStats.total ? (verifiedCount / serverStats.total) * 100 : 0
            }
            delay={80}
          />
        </View>
        <View style={[p.statsRow, { marginTop: 8 }]}>
          <StatCard
            icon="clock"
            label="Pending"
            value={pendingCount.toLocaleString()}
            sub="Awaiting review"
            barPercent={
              serverStats.total ? (pendingCount / serverStats.total) * 100 : 0
            }
            delay={160}
          />
          <View style={{ width: 8 }} />
          <StatCard
            icon="trending-up"
            label="Avg. Score"
            value={`${avgConf}%`}
            sub="Accuracy score"
            barPercent={avgConf}
            delay={240}
          />
        </View>
      </View>

      {/* Progress bar — shows how many records have been loaded */}
      {serverStats.total > allScans.length && (
        <View style={p.progressWrap}>
          <View style={p.progressBarTrack}>
            <View
              style={[
                p.progressBarFill,
                {
                  width:
                    `${Math.round((allScans.length / serverStats.total) * 100)}%` as any,
                },
              ]}
            />
          </View>
          <Text style={p.progressText}>
            {allScans.length.toLocaleString()} of{" "}
            {serverStats.total.toLocaleString()} records loaded — scroll down
            for more
          </Text>
        </View>
      )}

      {/* Vet banner */}
      <View style={p.vetBanner}>
        <View style={p.vetIconWrap}>
          <Feather name="shield" size={14} color={C.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={p.vetTitle}>Veterinarian Verification</Text>
          <Text style={p.vetDesc}>
            Verified scans are confirmed by licensed vets. Pending scans await
            professional review.
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={p.searchWrap}>
        <Feather
          name="search"
          size={15}
          color={C.textFaint}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={p.searchInput}
          placeholder={`Search in ${allScans.length.toLocaleString()} loaded breeds…`}
          placeholderTextColor={C.textFaint}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS === "android" && (
          <TouchableOpacity
            onPress={() => setSearch("")}
            style={{ padding: 4 }}
          >
            <Feather name="x" size={14} color={C.textSoft} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <View style={p.filterRow}>
        {(["all", "verified", "pending"] as FilterType[]).map((f) => {
          const cnt =
            f === "all"
              ? serverStats.total
              : f === "verified"
                ? verifiedCount
                : pendingCount;
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[p.pill, active && p.pillActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.75}
            >
              {active && <Feather name="check" size={10} color={C.green} />}
              <Text style={[p.pillText, active && p.pillTextActive]}>
                {f === "all"
                  ? "All"
                  : f === "verified"
                    ? "Verified"
                    : "Pending"}{" "}
                <Text style={[p.pillCount, active && p.pillCountActive]}>
                  ({cnt.toLocaleString()})
                </Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Result count + clear */}
      {(filtered.length > 0 || search || filter !== "all") && (
        <View style={p.resultRow}>
          <Text style={p.resultText}>
            {filtered.length.toLocaleString()} result
            {filtered.length !== 1 ? "s" : ""}
            {search || filter !== "all"
              ? ` · ${allScans.length.toLocaleString()} loaded`
              : ""}
          </Text>
          {(search.length > 0 || filter !== "all") && (
            <TouchableOpacity
              style={p.clearBtn}
              onPress={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              <Feather name="x" size={11} color={C.textSoft} />
              <Text style={p.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );

  // ── loading skeleton ──
  if (loading) {
    return (
      <View style={p.root}>
        <View style={p.topBar}>
          <SafeAreaView style={p.topSafe}>
            <View
              style={[
                p.topRow,
                { paddingTop: Platform.OS === "android" ? 10 : 14 },
              ]}
            >
              <View
                style={{
                  width: 140,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              />
              <View
                style={{
                  width: 90,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
              />
            </View>
          </SafeAreaView>
        </View>
        <View style={p.body}>
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: C.greenPale,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: C.greenMid,
              }}
            >
              <ActivityIndicator size="small" color={C.green} />
            </View>
            <Text
              style={{ fontSize: 13, color: C.textSoft, fontWeight: "500" }}
            >
              Loading scan history…
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => showUserMenu && setShowUserMenu(false)}
      style={p.root}
    >
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
      <View style={p.topBar}>
        <SafeAreaView style={p.topSafe}>
          <View style={p.topRow}>
            {/* User button */}
            <TouchableOpacity
              style={p.userBtn}
              onPress={() => setShowUserMenu(!showUserMenu)}
              activeOpacity={0.75}
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={p.avatar} />
              ) : (
                <View style={p.avatarDef}>
                  <Feather name="user" size={16} color={C.green} />
                </View>
              )}
              <View>
                <Text style={p.greeting}>Welcome back</Text>
                <Text style={p.uName}>{getFirstName(user?.name)}</Text>
              </View>
              <Feather
                name={showUserMenu ? "chevron-up" : "chevron-down"}
                size={14}
                color="rgba(255,255,255,0.65)"
              />
            </TouchableOpacity>

            {/* Dropdown */}
            {showUserMenu && (
              <View style={p.dropdown}>
                <View style={p.ddInfo}>
                  <Text style={p.ddName}>{user?.name || "User"}</Text>
                  <Text style={p.ddEmail}>{user?.email || ""}</Text>
                </View>
                <View style={p.ddDiv} />
                <TouchableOpacity style={p.ddItem} onPress={handleLogout}>
                  <Feather name="log-out" size={15} color={C.red} />
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: C.red }}
                  >
                    Sign out
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={p.topActions}>
              <TouchableOpacity
                style={p.notifBtn}
                onPress={() => setShowNotifications(true)}
                activeOpacity={0.75}
              >
                <Feather name="bell" size={18} color={C.white} />
                {unreadCount > 0 && (
                  <View style={p.badge}>
                    <Text style={p.badgeT}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={p.newBtn}
                onPress={() => router.push("/scan")}
                activeOpacity={0.75}
              >
                <Feather name="plus" size={15} color={C.white} />
                <Text style={p.newBtnT}>New Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── BODY ── */}
      <View style={p.body}>
        <View style={p.pageHead}>
          <View style={p.statusPill}>
            <View style={p.statusDot} />
            <Text style={p.statusLabel}>SCAN RECORDS</Text>
          </View>
          <Text style={p.pageTitle}>My Scan History</Text>
          <Text style={p.pageSub}>
            {serverStats.total > 0
              ? `${serverStats.total.toLocaleString()} total`
              : ""}{" "}
            breed identification results.
          </Text>
        </View>

        {error && (
          <View style={p.errorBanner}>
            <Feather name="alert-circle" size={14} color={C.red} />
            <Text style={p.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Feather name="x" size={14} color={C.red} />
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={rows}
          keyExtractor={(_, i) => i.toString()}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={p.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.green}
              colors={[C.green]}
            />
          }
          renderItem={({ item: row }) => (
            <View style={p.row}>
              {row.map((scan, ri) => (
                <ScanCard
                  key={scan.scan_id}
                  item={scan}
                  index={ri}
                  onPress={() =>
                    router.push({
                      pathname: "/scan-result",
                      params: { scan_id: scan.scan_id },
                    })
                  }
                  onDelete={() => handleDeleteScan(scan.id)}
                />
              ))}
              {row.length === 1 && (
                <View style={{ width: (width - 18 * 2 - 10) / 2 }} />
              )}
            </View>
          )}
          ListFooterComponent={
            loadingMore ? (
              <View style={p.moreWrap}>
                <ActivityIndicator size="small" color={C.green} />
                <Text style={p.moreText}>Loading more records…</Text>
              </View>
            ) : hasMore && rows.length > 0 ? (
              <TouchableOpacity
                style={p.moreBtn}
                onPress={handleLoadMore}
                activeOpacity={0.8}
              >
                <Text style={p.moreBtnT}>Load more records</Text>
                <Feather name="chevron-down" size={14} color={C.green} />
              </TouchableOpacity>
            ) : allScans.length > 0 && !hasMore ? (
              <Text style={p.allLoadedText}>
                All {serverStats.total.toLocaleString()} records loaded
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Animated.View style={[p.emptyWrap, { opacity: fadeAnim }]}>
              <View style={p.emptyIcon}>
                <Feather
                  name={search ? "search" : "calendar"}
                  size={28}
                  color={C.textFaint}
                />
              </View>
              <Text style={p.emptyTitle}>
                {search
                  ? "No matches"
                  : filter !== "all"
                    ? `No ${filter} scans`
                    : "No scans yet"}
              </Text>
              <Text style={p.emptySub}>
                {search
                  ? `No breeds matching "${search}" in ${allScans.length.toLocaleString()} loaded records`
                  : filter !== "all"
                    ? `Try "All" to see all ${allScans.length.toLocaleString()} loaded records`
                    : "Start by scanning your first dog!"}
              </Text>
              {(search || filter !== "all") && (
                <TouchableOpacity
                  style={p.clearAllBtn}
                  onPress={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={p.clearAllT}>Clear filters</Text>
                </TouchableOpacity>
              )}
              {allScans.length === 0 && !search && filter === "all" && (
                <TouchableOpacity
                  style={p.emptyCta}
                  onPress={() => router.push("/scan")}
                  activeOpacity={0.85}
                >
                  <Feather name="camera" size={15} color={C.white} />
                  <Text style={p.emptyCtaT}>Scan Your Dog</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          }
        />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const p = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.green },
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
  avatarDef: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  greeting: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  uName: {
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
  ddDiv: { height: 1, backgroundColor: C.borderLight },
  ddItem: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
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
  badgeT: { fontSize: 10, fontWeight: "800", color: C.white },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  newBtnT: { fontSize: 13, fontWeight: "600", color: C.white },

  body: {
    flex: 1,
    backgroundColor: C.offWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -10,
    overflow: "hidden",
  },
  pageHead: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 14 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: C.greenPale,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.greenMid,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  statusLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: C.green,
    letterSpacing: 0.8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSub: { fontSize: 13, color: C.textSoft, lineHeight: 19 },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.redPale,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { flex: 1, fontSize: 12, color: C.red, fontWeight: "500" },

  statsSection: { paddingHorizontal: 18, marginBottom: 10 },
  statsRow: { flexDirection: "row" },

  progressWrap: { marginHorizontal: 18, marginBottom: 12 },
  progressBarTrack: {
    height: 5,
    backgroundColor: C.borderLight,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 5,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: C.greenLight,
    borderRadius: 3,
  },
  progressText: { fontSize: 10, color: C.textFaint, textAlign: "center" },

  vetBanner: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  vetIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.greenPale,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.greenMid,
    flexShrink: 0,
    marginTop: 1,
  },
  vetTitle: { fontSize: 12, fontWeight: "700", color: C.text, marginBottom: 3 },
  vetDesc: { fontSize: 11, color: C.textSoft, lineHeight: 16 },

  searchWrap: {
    marginHorizontal: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.text, paddingVertical: 0 },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillActive: { backgroundColor: C.greenPale, borderColor: C.greenMid },
  pillText: { fontSize: 11, fontWeight: "600", color: C.textSoft },
  pillTextActive: { color: C.green },
  pillCount: { fontSize: 10, fontWeight: "500", color: C.textFaint },
  pillCountActive: { color: C.green },

  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  resultText: { fontSize: 11, fontWeight: "600", color: C.textFaint },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: C.borderLight,
  },
  clearText: { fontSize: 11, color: C.textSoft, fontWeight: "500" },

  listContent: { paddingBottom: 40 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    marginBottom: 10,
  },

  moreWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  moreText: { fontSize: 12, color: C.textSoft },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 18,
    marginTop: 4,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.greenMid,
    backgroundColor: C.greenDim,
  },
  moreBtnT: { fontSize: 13, fontWeight: "600", color: C.green },
  allLoadedText: {
    textAlign: "center",
    fontSize: 11,
    color: C.textFaint,
    paddingVertical: 16,
  },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: C.textSoft,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  clearAllBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    marginBottom: 12,
  },
  clearAllT: { fontSize: 13, fontWeight: "600", color: C.textMid },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.green,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  emptyCtaT: { fontSize: 14, fontWeight: "700", color: C.white },
});
