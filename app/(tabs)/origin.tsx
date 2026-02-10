import ApiService from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ViewOrigin = () => {
  const router = useRouter();
  const { scan_id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [flagError, setFlagError] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(
    null,
  );

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
  }, [scan_id]);

  useEffect(() => {
    const fetchOriginData = async () => {
      if (!scan_id) {
        setError("Missing Scan ID");
        setLoading(false);
        return;
      }

      try {
        const response = await ApiService.getOriginHistory(scan_id as string);
        console.log(
          "🔍 Full Origin API Response:",
          JSON.stringify(response, null, 2),
        );

        if (response.success) {
          console.log(
            "✅ Origin Response Data:",
            JSON.stringify(response.data, null, 2),
          );
          setData(response.data);
        } else {
          console.log("❌ API Error:", response.message);
          setError(response.message || "Failed to load origin data");
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchOriginData();
  }, [scan_id]);

  const toggleAccordion = (id: string) => {
    setExpandedAccordion(expandedAccordion === id ? null : id);
  };

  const handleBack = () => {
    // Navigate back to scan-result page
    router.push({
      pathname: "/scan-result",
      params: { scan_id: scan_id },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  // Safely extract nested data
  const responseData = data?.data || data;
  const breed = responseData?.breed || "Unknown Breed";
  const originData = responseData?.origin_data || {};

  const country = originData?.country || "Unknown";
  const countryCode = (originData?.country_code || "unknown").toLowerCase();
  const region = originData?.region || "Unknown Region";
  const description = originData?.description || "No description available.";
  const timeline = originData?.timeline || [];
  const details = originData?.details || [];

  // Dynamic flag URL using country code
  // Common country codes: us, gb, de, fr, it, es, jp, cn, au, ca, mx, br, etc.
  // Scotland uses 'gb-sct' but standard API uses 'gb' for UK
  const flagUrl = `https://flagcdn.com/w320/${countryCode}.png`;
  const fallbackFlagUrl = "https://flagcdn.com/w320/un.png"; // UN flag as fallback

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#1b1b18" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{breed} Origin & History</Text>
            <Text style={styles.headerSubtitle}>
              Breed heritage and evolution
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Error Message if any */}
          {error && (
            <View style={[styles.errorCard, { borderColor: "red" }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Geographic Origin Card */}
          <View style={styles.originCard}>
            <Text style={styles.originTitle}>Geographic Origin</Text>

            <View style={styles.originContent}>
              <View style={styles.locationSection}>
                <View style={styles.locationHeader}>
                  <Feather name="map-pin" size={24} color="#002680" />
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationTitle}>{country}</Text>
                    <Text style={styles.locationSubtitle}>{region}</Text>
                  </View>
                </View>
                <Text style={styles.locationText}>{description}</Text>
              </View>

              {/* Flag Section - Dynamic based on country code */}
              <View style={styles.flagSection}>
                {!flagError && countryCode !== "unknown" ? (
                  <Image
                    source={{ uri: flagUrl }}
                    style={styles.flagImage}
                    resizeMode="contain"
                    onError={() => {
                      console.log("Flag load error for:", countryCode);
                      setFlagError(true);
                    }}
                  />
                ) : (
                  <View style={[styles.flagImage, styles.flagPlaceholder]}>
                    <Feather name="flag" size={40} color="#9ca3af" />
                  </View>
                )}
                <View style={styles.flagInfo}>
                  <Text style={styles.flagTitle}>{country}</Text>
                  <Text style={styles.flagSubtitle}>{region}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Timeline Card */}
          {timeline.length > 0 && (
            <View style={styles.timelineCard}>
              <Text style={styles.timelineTitle}>History Timeline</Text>
              <View style={styles.timelineContent}>
                {timeline.map((item: any, index: number) => (
                  <View key={index} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineTextContainer}>
                      <Text style={styles.timelineYear}>{item.year}</Text>
                      <Text style={styles.timelineEvent}>{item.event}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Detailed History Card */}
          {details.length > 0 && (
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>Detailed History</Text>

              <View style={styles.accordion}>
                {details.map((item: any, index: number) => (
                  <View key={index} style={styles.accordionItem}>
                    <TouchableOpacity
                      style={styles.accordionTrigger}
                      onPress={() => toggleAccordion(`detail-${index}`)}
                    >
                      <Text style={styles.accordionTriggerText}>
                        {item.title}
                      </Text>
                      <Feather
                        name={
                          expandedAccordion === `detail-${index}`
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={20}
                        color="#1b1b18"
                      />
                    </TouchableOpacity>
                    {expandedAccordion === `detail-${index}` && (
                      <View style={styles.accordionContent}>
                        <Text style={styles.accordionText}>{item.content}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* No Data Message */}
          {!error && timeline.length === 0 && details.length === 0 && (
            <View style={styles.noDataCard}>
              <Text style={styles.noDataText}>
                No origin history data available for this breed.
              </Text>
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
    gap: 16,
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fca5a5",
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
    lineHeight: 20,
  },
  noDataCard: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
    alignItems: "center",
  },
  noDataText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  originCard: {
    backgroundColor: "#ecfeff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a5f3fc",
    padding: 20,
    gap: 16,
  },
  originTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b18",
  },
  originContent: {
    gap: 20,
  },
  locationSection: {
    gap: 12,
  },
  locationHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  locationInfo: {
    flex: 1,
    gap: 4,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1b1b18",
  },
  locationSubtitle: {
    fontSize: 14,
    color: "#4b5563",
  },
  locationText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  flagSection: {
    backgroundColor: "#ddd6fe",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 12,
  },
  flagImage: {
    width: 120,
    height: 80,
    borderRadius: 4,
  },
  flagPlaceholder: {
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  flagInfo: {
    alignItems: "center",
    gap: 4,
  },
  flagTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1b1b18",
  },
  flagSubtitle: {
    fontSize: 14,
    color: "#4b5563",
  },
  timelineCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
    gap: 16,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b18",
    marginBottom: 4,
  },
  timelineContent: {
    gap: 16,
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0891b2",
    marginTop: 4,
  },
  timelineTextContainer: {
    flex: 1,
    gap: 4,
  },
  timelineYear: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0891b2",
  },
  timelineEvent: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
    gap: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1b1b18",
  },
  accordion: {
    gap: 8,
  },
  accordionItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  accordionTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  accordionTriggerText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1b1b18",
    flex: 1,
  },
  accordionContent: {
    paddingBottom: 16,
    gap: 12,
  },
  accordionText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
});

export default ViewOrigin;
