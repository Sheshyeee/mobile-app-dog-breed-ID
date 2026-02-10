import ApiService from "@/services/api";
import authService, { User } from "@/services/authService";
import notificationService, {
  Notification,
} from "@/services/notificationservice";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface ScanHistoryItem {
  id: number;
  scan_id: string;
  image_url: string;
  breed: string;
  confidence: number;
  created_at: string;
  status?: "pending" | "verified";
}

// ============================================================================
// NOTIFICATION MODAL COMPONENT (Same as ScanPage)
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
                  <Feather name="trash-2" size={12} color="#ef4444" />
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
    maxHeight: Dimensions.get("window").height * 0.8,
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

function ScanHistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notification states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  // User menu dropdown state
  const [showUserMenu, setShowUserMenu] = useState(false);

  const fetchUserAndScans = async () => {
    try {
      setError(null);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      const response = await ApiService.getRecentResults(20);

      if (response.success && response.data) {
        setScans(response.data);
      } else {
        setError(response.message || "Failed to load scan history");
      }

      // Fetch notifications
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await notificationService.getNotifications();
      if (response.success && response.notifications) {
        setNotifications(response.notifications.data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      if (response.success && response.count !== undefined) {
        setUnreadCount(response.count);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
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

  const handleDeleteScan = async (scanId: number) => {
    Alert.alert(
      "Delete Scan",
      "Are you sure you want to delete this scan? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await ApiService.deleteScan(scanId);
              if (response.success) {
                // Remove from local state
                setScans((prev) => prev.filter((scan) => scan.id !== scanId));
                Alert.alert("Success", "Scan deleted successfully");
              } else {
                Alert.alert(
                  "Error",
                  response.message || "Failed to delete scan",
                );
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete scan. Please try again.");
            }
          },
        },
      ],
    );
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

  useEffect(() => {
    fetchUserAndScans();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUserAndScans();
  };

  const handleScanPress = (scanId: string) => {
    router.push({
      pathname: "/scan-result",
      params: { scan_id: scanId },
    });
  };

  const handleNewScan = () => {
    router.push("/scan");
  };

  // Extract first name from full name
  const getFirstName = (fullName: string | undefined) => {
    if (!fullName) return "User";
    return fullName.split(" ")[0];
  };

  const renderHeader = () => (
    <View style={styles.headerComponentContainer}>
      {/* USER HEADER - Matches Scan Page exactly */}
      <View style={styles.userHeader}>
        <SafeAreaView style={styles.userHeaderSafe}>
          <View style={styles.userHeaderContent}>
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

            {/* Right: Notification Bell + New Scan Button */}
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
                onPress={handleNewScan}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={20} color="#ffffff" />
                <Text style={styles.historyButtonText}>New</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Transitional Header Section inside the black area */}
      <View style={styles.mainContentHeader}>
        <View style={styles.headerTextSection}>
          <Text style={styles.title}>My Scan History</Text>
          <Text style={styles.subtitle}>
            View and manage your pet breed identification results.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Feather name="info" size={20} color="#60a5fa" />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Veterinarian Verification</Text>
            <Text style={styles.infoText}>
              Verified scans have been confirmed by professional vets.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyIconCircle}>
        <Feather name="calendar" size={48} color="#9ca3af" />
      </View>
      <Text style={styles.emptyTitle}>No scans yet</Text>
      <Text style={styles.emptySubtitle}>
        Start by scanning your first pet!
      </Text>
      <TouchableOpacity style={styles.emptyScanButton} onPress={handleNewScan}>
        <Feather name="camera" size={20} color="#ffffff" />
        <Text style={styles.emptyScanButtonText}>Scan Your Pet</Text>
      </TouchableOpacity>
    </View>
  );

  const renderScanCard = ({ item }: { item: ScanHistoryItem }) => {
    const isVerified = item.status === "verified";
    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return (
      <View style={styles.scanCard}>
        <TouchableOpacity
          onPress={() => handleScanPress(item.scan_id)}
          activeOpacity={0.7}
        >
          <View style={styles.scanImageContainer}>
            <Image source={{ uri: item.image_url }} style={styles.scanImage} />
            {/* Delete Button Overlay */}
            <TouchableOpacity
              style={styles.deleteButtonOverlay}
              onPress={() => handleDeleteScan(item.id)}
              activeOpacity={0.8}
            >
              <Feather name="trash-2" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.scanContent}>
            <Text style={styles.scanBreed} numberOfLines={1}>
              {item.breed}
            </Text>

            <View style={styles.dateRow}>
              <Feather name="calendar" size={10} color="#9ca3af" />
              <Text style={styles.scanDateText}>{formattedDate}</Text>
            </View>

            <View style={styles.scanFooter}>
              <View
                style={[
                  styles.statusBadge,
                  isVerified ? styles.verifiedBadge : styles.pendingBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isVerified ? styles.verifiedText : styles.pendingText,
                  ]}
                >
                  {isVerified ? "Verified" : "Pending"}
                </Text>
              </View>
              <Text style={styles.confidenceScoreText}>
                {Math.round(item.confidence)}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => showUserMenu && setShowUserMenu(false)}
      style={styles.container}
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

      <FlatList
        data={scans}
        renderItem={renderScanCard}
        keyExtractor={(item) => item.scan_id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={scans.length > 0 ? styles.columnWrapper : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    justifyContent: "center",
    alignItems: "center",
  },
  headerComponentContainer: {
    backgroundColor: "#1e3a8a",
  },
  userHeader: {
    backgroundColor: "#1e3a8a",
    paddingBottom: 16,
    marginTop: 35,
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
    position: "relative",
    flex: 1,
    zIndex: 1000,
  },
  userTouchable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    maxWidth: "70%",
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
  dropdownDivider: {
    height: 1,
    backgroundColor: "#2a2a2a",
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
  mainContentHeader: {
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -8,
    paddingBottom: 8,
  },
  headerTextSection: {
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
  infoCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: "#0a1628",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    gap: 12,
  },
  infoIconContainer: {
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: "600",
    color: "#ffffff",
    fontSize: 15,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#d1d5db",
    lineHeight: 18,
  },
  listContent: {
    backgroundColor: "#0f0f0f",
    paddingBottom: 40,
    flexGrow: 1,
  },
  columnWrapper: {
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  scanCard: {
    width: (width - 60) / 2,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginBottom: 12,
    overflow: "hidden",
  },
  scanImageContainer: {
    width: "100%",
    height: 120,
    position: "relative",
  },
  scanImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  deleteButtonOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scanContent: {
    padding: 12,
  },
  scanBreed: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  scanDateText: {
    fontSize: 10,
    color: "#9ca3af",
  },
  scanFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidenceScoreText: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  verifiedBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  verifiedText: {
    color: "#10b981",
  },
  pendingBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  pendingText: {
    color: "#f59e0b",
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    backgroundColor: "#0f0f0f",
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    marginBottom: 20,
  },
  emptyScanButton: {
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  emptyScanButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});

export default ScanHistoryPage;
