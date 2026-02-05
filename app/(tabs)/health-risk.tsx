import ApiService from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, ProgressChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

const ViewHealthRisk = () => {
  const router = useRouter();
  const { scan_id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealthData = async () => {
      if (!scan_id) {
        setError("Missing Scan ID");
        setLoading(false);
        return;
      }

      try {
        const response = await ApiService.getHealthRisk(scan_id as string);
        if (response.success) {
          setData(response.data);
        } else {
          setError(response.message || "Failed to load health data");
        }
      } catch (err) {
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();
  }, [scan_id]);

  const handleBack = () => {
    if (scan_id) {
      router.push({
        pathname: "/scan-result",
        params: { scan_id: scan_id },
      });
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  const responseData = data?.data || data;
  const breed = responseData?.breed || "Unknown Breed";
  const healthRisks = responseData?.health_data || {};
  const concerns = healthRisks?.concerns || [];
  const screenings = healthRisks?.screenings || [];
  const careTips = healthRisks?.care_tips || [];
  const lifespan = healthRisks?.lifespan || "0";

  // Data Formatting for Bar Chart
  const getRiskValue = (level: string) => {
    const l = level?.toLowerCase();
    if (l?.includes("high")) return 3;
    if (l?.includes("moderate")) return 2;
    return 1;
  };

  const barData = {
    labels: concerns
      .slice(0, 4)
      .map((c: any) =>
        c.name.length > 8 ? c.name.substring(0, 8) + ".." : c.name,
      ),
    datasets: [
      {
        data: concerns.slice(0, 4).map((c: any) => getRiskValue(c.risk_level)),
      },
    ],
  };

  // Data Formatting for Lifespan Progress (Assuming 20 is max dog age)
  const numericLifespan = parseInt(lifespan.split("-")[0]) || 10;
  const progressData = {
    labels: ["Lifespan"],
    data: [numericLifespan / 20],
  };

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(8, 145, 178, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: { borderRadius: 16 },
    propsForBackgroundLines: { strokeDasharray: "" },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#1b1b18" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Health Insights</Text>
            <Text style={styles.headerSubtitle}>
              Breed-specific considerations for {breed}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* VISUAL DASHBOARD SECTION */}
          <View style={styles.chartContainer}>
            <Text style={styles.graphTitle}>Risk Severity Analysis</Text>
            <BarChart
              data={barData}
              width={screenWidth - 48}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={chartConfig}
              verticalLabelRotation={15}
              fromZero
              style={styles.chartStyle}
            />
            <View style={styles.legend}>
              <Text style={styles.legendText}>
                Levels: 1:Low | 2:Mod | 3:High
              </Text>
            </View>
          </View>

          {/* MEDICAL DISCLAIMER */}
          <View style={styles.disclaimerCard}>
            <View style={styles.disclaimerIcon}>
              <Feather name="alert-triangle" size={24} color="#cc0000" />
            </View>
            <View style={styles.disclaimerContent}>
              <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
              <Text style={styles.disclaimerText}>
                This information is for educational purposes only. Always
                consult a vet.
              </Text>
            </View>
          </View>

          {/* LIFESPAN PROGRESS CARD */}
          <View style={styles.lifespanCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ProgressChart
                data={progressData}
                width={120}
                height={120}
                strokeWidth={12}
                radius={32}
                chartConfig={chartConfig}
                hideLegend={true}
              />
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={styles.lifespanYears}>{lifespan} Years</Text>
                <Text style={styles.lifespanLabel}>Expected Lifespan</Text>
              </View>
            </View>
          </View>

          {/* HEALTH CONCERNS LIST */}
          <Text style={styles.sectionTitle}>Common Health Concerns</Text>
          {concerns.length > 0 ? (
            concerns.map((concern: any, index: number) => (
              <View key={index} style={styles.concernCard}>
                <View style={styles.concernHeader}>
                  <Text style={styles.concernTitle}>{concern.name}</Text>
                  <View
                    style={[
                      styles.riskBadge,
                      {
                        backgroundColor:
                          concern.risk_level === "High Risk"
                            ? "#fee2e2"
                            : "#fef3c7",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskBadgeText,
                        {
                          color:
                            concern.risk_level === "High Risk"
                              ? "#ef4444"
                              : "#b45309",
                        },
                      ]}
                    >
                      {concern.risk_level}
                    </Text>
                  </View>
                </View>
                <View style={styles.concernSection}>
                  <Text style={styles.concernLabel}>Description</Text>
                  <Text style={styles.concernText}>{concern.description}</Text>
                </View>
                <View style={styles.concernSection}>
                  <Text style={styles.concernLabel}>
                    Prevention & Management
                  </Text>
                  <Text style={styles.concernText}>{concern.prevention}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.concernText}>
              No specific concerns recorded.
            </Text>
          )}

          {/* SCREENINGS */}
          <View style={styles.screeningsCard}>
            <Text style={styles.screeningsTitle}>Recommended Screenings</Text>
            <View style={styles.screeningsGrid}>
              {screenings.map((screen: any, index: number) => (
                <View key={index} style={styles.screeningItem}>
                  <Text style={styles.screeningItemTitle}>{screen.name}</Text>
                  <Text style={styles.screeningItemText}>
                    {screen.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* CARE TIPS */}
          <View style={styles.lifespanCard}>
            <Text style={styles.lifespanTitle}>Essential Care Tips</Text>
            <View style={styles.tipsSection}>
              {careTips.map((tip: string, index: number) => (
                <Text key={index} style={styles.tipItem}>
                  • {tip}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFDFC" },
  header: { flexDirection: "row", padding: 16, paddingTop: 40 },
  backButton: { padding: 4, marginRight: 12 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1b1b18" },
  headerSubtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  chartContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  graphTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  chartStyle: { marginVertical: 8, borderRadius: 16 },
  legend: { marginTop: 4 },
  legendText: { fontSize: 12, color: "#9ca3af", fontStyle: "italic" },
  disclaimerCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fca5a5",
    padding: 16,
    flexDirection: "row",
    gap: 12,
  },
  disclaimerIcon: { paddingTop: 2 },
  disclaimerContent: { flex: 1, gap: 4 },
  disclaimerTitle: { fontSize: 14, fontWeight: "bold", color: "#b91c1c" },
  disclaimerText: { fontSize: 13, color: "#b91c1c", lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#1b1b18" },
  concernCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    gap: 12,
  },
  concernHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  concernTitle: { fontSize: 16, fontWeight: "600", color: "#1b1b18" },
  riskBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 16 },
  riskBadgeText: { fontSize: 12, fontWeight: "600" },
  concernSection: { gap: 4 },
  concernLabel: { fontSize: 14, fontWeight: "600", color: "#1b1b18" },
  concernText: { fontSize: 14, color: "#6b7280", lineHeight: 20 },
  screeningsCard: {
    backgroundColor: "#ecfeff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a5f3fc",
    padding: 16,
    gap: 16,
  },
  screeningsTitle: { fontSize: 16, fontWeight: "600", color: "#1b1b18" },
  screeningsGrid: { gap: 12 },
  screeningItem: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    gap: 8,
  },
  screeningItemTitle: { fontSize: 14, fontWeight: "600" },
  screeningItemText: { fontSize: 13, color: "#6b7280" },
  lifespanCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 16,
    gap: 12,
  },
  lifespanTitle: { fontSize: 16, fontWeight: "600" },
  lifespanYears: { fontSize: 24, fontWeight: "bold", color: "#0891b2" },
  lifespanLabel: { fontSize: 14, color: "#6b7280" },
  tipsSection: { gap: 8 },
  tipItem: { fontSize: 14, color: "#4b5563", lineHeight: 20 },
});

export default ViewHealthRisk;
