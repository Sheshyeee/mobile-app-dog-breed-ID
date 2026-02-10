import ApiService from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ViewSimulation = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const scanId = params.scan_id as string;

  const [activeTab, setActiveTab] = useState<"1" | "3">("1");
  const [loading, setLoading] = useState(true);
  const [breed, setBreed] = useState("");
  const [originalImage, setOriginalImage] = useState("");
  const [simulations, setSimulations] = useState<{
    "1_years": string | null;
    "3_years": string | null;
  }>({
    "1_years": null,
    "3_years": null,
  });
  const [status, setStatus] = useState<
    "pending" | "generating" | "complete" | "failed"
  >("pending");
  const [isPolling, setIsPolling] = useState(false);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleBack();
        return true;
      },
    );

    return () => backHandler.remove();
  }, [scanId]);

  const handleBack = () => {
    // Navigate back to scan-result page
    router.push({
      pathname: "/scan-result",
      params: { scan_id: scanId },
    });
  };

  // Fetch initial simulation data
  useEffect(() => {
    const fetchSimulationData = async () => {
      try {
        console.log("🔥 Fetching simulation data for:", scanId);
        const response = await ApiService.getSimulation(scanId);

        if (response.success && response.data) {
          console.log("✅ Simulation data received:", response.data);
          setBreed(response.data.breed);
          setOriginalImage(response.data.original_image);
          setSimulations(response.data.simulations);
          setStatus(response.data.status);

          // Start polling if not complete
          if (
            response.data.status !== "complete" &&
            response.data.status !== "failed"
          ) {
            setIsPolling(true);
          }
        } else {
          Alert.alert(
            "Error",
            response.message || "Failed to load simulation data",
          );
        }
      } catch (error) {
        console.error("❌ Error fetching simulation:", error);
        Alert.alert("Error", "Failed to load simulation data");
      } finally {
        setLoading(false);
      }
    };

    if (scanId) {
      fetchSimulationData();
    }
  }, [scanId]);

  // Poll for simulation updates
  useEffect(() => {
    if (!isPolling) return;

    console.log("🔄 Starting simulation polling...");

    const pollInterval = setInterval(async () => {
      try {
        console.log("📡 Polling simulation status...");
        const response = await ApiService.getSimulationStatus(scanId);

        if (response.success && response.data) {
          console.log(
            "📊 Status:",
            response.data.status,
            "Has 1yr:",
            response.data.has_1_year,
            "Has 3yr:",
            response.data.has_3_years,
          );

          setStatus(response.data.status);
          setSimulations(response.data.simulations);

          // Stop polling if complete or failed
          if (
            response.data.status === "complete" ||
            response.data.status === "failed"
          ) {
            console.log("✅ Simulation complete, stopping poll");
            setIsPolling(false);
          }
        }
      } catch (error) {
        console.error("❌ Polling error:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      console.log("🛑 Stopping polling");
      clearInterval(pollInterval);
    };
  }, [isPolling, scanId]);

  const tabs = [
    { id: "1" as const, label: "In 1 Year" },
    { id: "3" as const, label: "In 3 Years" },
  ];

  const getImageSource = (imageUrl: string | null) => {
    if (!imageUrl) {
      return; // Use a placeholder
    }
    return { uri: imageUrl };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading simulation data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasSimulations = simulations["1_years"] || simulations["3_years"];
  const isGenerating = status === "pending" || status === "generating";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#1b1b18" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Future Appearance Simulation</Text>
            <Text style={styles.headerSubtitle}>
              See how your {breed || "dog"} will look as they age
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Note Card */}
          <View style={styles.noteCard}>
            <Text style={styles.noteText}>
              <Text style={styles.noteBold}>Note: </Text>
              <Text style={styles.noteDescription}>
                This prediction shows your dog 1 and 3 years from today based on
                current age and breed patterns. Actual aging may vary depending
                on genetics, health, and environment.
              </Text>
            </Text>
          </View>

          {/* Loading State */}
          {isGenerating && !hasSimulations && (
            <View style={styles.generatingCard}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.generatingTitle}>
                {status === "pending"
                  ? "Analyzing current age and features..."
                  : "Generating future appearance predictions..."}
              </Text>
              <Text style={styles.generatingSubtitle}>
                Creating personalized age progression images. This takes 20-40
                seconds.
              </Text>
            </View>
          )}

          {/* Failed State */}
          {status === "failed" && !hasSimulations && (
            <View style={styles.failedCard}>
              <Feather name="alert-circle" size={48} color="#ef4444" />
              <Text style={styles.failedTitle}>
                Simulation generation failed
              </Text>
              <Text style={styles.failedSubtitle}>
                We couldn't generate the age simulations. Please try again
                later.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
                <Text style={styles.retryButtonText}>Back to Results</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Simulation Tabs */}
          {hasSimulations && (
            <View style={styles.tabsContainer}>
              {/* Generating Banner */}
              {isGenerating && (
                <View style={styles.generatingBanner}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={styles.generatingBannerText}>
                    Still generating remaining images...
                  </Text>
                </View>
              )}

              {/* Tab List */}
              <View style={styles.tabsList}>
                {tabs.map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.tab,
                      activeTab === tab.id && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        activeTab === tab.id && styles.tabTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tab Content */}
              <View style={styles.tabContent}>
                <View style={styles.comparisonContainer}>
                  {/* Current Appearance */}
                  <View style={styles.imageSection}>
                    <Text style={styles.sectionTitle}>Current Appearance</Text>
                    <View style={styles.imageWrapper}>
                      <Image
                        source={getImageSource(originalImage)}
                        style={styles.dogImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.imageCaption}>
                      How your dog looks today
                    </Text>
                  </View>

                  {/* Future Appearance */}
                  <View style={styles.imageSection}>
                    <Text style={styles.sectionTitle}>
                      {activeTab === "1" ? "In 1 Year" : "In 3 Years"}
                    </Text>
                    <View style={styles.imageWrapper}>
                      {activeTab === "1" && simulations["1_years"] ? (
                        <Image
                          source={getImageSource(simulations["1_years"])}
                          style={styles.dogImage}
                          resizeMode="contain"
                        />
                      ) : activeTab === "3" && simulations["3_years"] ? (
                        <Image
                          source={getImageSource(simulations["3_years"])}
                          style={styles.dogImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.placeholderContainer}>
                          <ActivityIndicator size="large" color="#9ca3af" />
                          <Text style={styles.placeholderText}>
                            Generating...
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.imageCaption}>
                      How your dog will look{" "}
                      {activeTab === "1" ? "one" : "three"} year
                      {activeTab === "3" ? "s" : ""} from today
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFDFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    paddingTop: 40,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1b1b18",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  noteCard: {
    backgroundColor: "#fff7ed",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fed7aa",
    padding: 16,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
  },
  noteBold: {
    fontWeight: "bold",
    color: "#9a3412",
  },
  noteDescription: {
    color: "#c2410c",
  },
  generatingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  generatingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
  },
  generatingSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  failedCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  failedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#991b1b",
    textAlign: "center",
  },
  failedSubtitle: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  generatingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  generatingBannerText: {
    fontSize: 14,
    color: "#1e40af",
  },
  tabsContainer: {
    gap: 16,
  },
  tabsList: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#ffffff",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#1b1b18",
  },
  tabContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
  },
  comparisonContainer: {
    gap: 24,
  },
  imageSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b18",
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  dogImage: {
    width: "100%",
    height: undefined,
    aspectRatio: 1,
    borderRadius: 12,
  },
  placeholderContainer: {
    width: "100%",
    height: undefined,
    aspectRatio: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: "#6b7280",
  },
  imageCaption: {
    fontSize: 14,
    color: "#4b5563",
  },
});

export default ViewSimulation;
