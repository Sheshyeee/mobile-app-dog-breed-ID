import ApiService from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, ProgressChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

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
  amberMid: "#fde68a",
  cyan: "#0891b2",
  cyanPale: "#ecfeff",
  cyanMid: "#a5f3fc",
};

const ViewHealthRisk = () => {
  const router = useRouter();
  const { scan_id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const bh = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => bh.remove();
  }, [scan_id]);

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
        } else {
          setError(response.message || "Failed to load health data");
        }
      } catch {
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchHealthData();
  }, [scan_id]);

  const handleBack = () =>
    router.push({ pathname: "/scan-result", params: { scan_id } });

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.topBar}>
          <SafeAreaView style={s.topSafe}>
            <View style={s.topRow}>
              <Text style={s.topTitle}>Health Insights</Text>
            </View>
          </SafeAreaView>
        </View>
        <View
          style={[s.body, { alignItems: "center", justifyContent: "center" }]}
        >
          <View style={s.loadIconWrap}>
            <ActivityIndicator size="small" color={C.green} />
          </View>
          <Text style={s.loadText}>Loading health data…</Text>
        </View>
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

  const getRiskValue = (level: string) => {
    const l = level?.toLowerCase();
    if (l?.includes("high")) return 3;
    if (l?.includes("moderate") || l?.includes("mod")) return 2;
    return 1;
  };

  const getRiskColor = (level: string) => {
    const l = level?.toLowerCase();
    if (l?.includes("high")) return C.red;
    if (l?.includes("moderate") || l?.includes("mod")) return C.amber;
    return C.green;
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

  const numericLifespan = parseInt(lifespan.split("-")[0]) || 10;
  const progressData = {
    labels: ["Lifespan"],
    data: [Math.min(numericLifespan / 20, 1)],
  };

  const chartConfig = {
    backgroundGradientFrom: C.white,
    backgroundGradientTo: C.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(22,163,74,${opacity})`,
    labelColor: (opacity = 1) => `rgba(100,116,139,${opacity})`,
    style: { borderRadius: 12 },
    propsForBackgroundLines: { strokeDasharray: "", stroke: C.borderLight },
    propsForLabels: { fontSize: 10 },
  };

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <SafeAreaView style={s.topSafe}>
          <View style={s.topRow}>
            <TouchableOpacity onPress={handleBack} style={s.backBtn}>
              <Feather name="arrow-left" size={18} color={C.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.topTitle}>Health Insights</Text>
              <Text style={s.topSub}>Breed-specific considerations</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <View style={s.body}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View style={s.pageHead}>
              <View style={s.statusPill}>
                <View style={s.statusDot} />
                <Text style={s.statusLabel}>HEALTH PROFILE</Text>
              </View>
              <Text style={s.pageTitle}>{breed}</Text>
            </View>

            {error && (
              <View style={s.errCard}>
                <Feather name="alert-circle" size={14} color={C.red} />
                <Text style={s.errText}>{error}</Text>
              </View>
            )}

            {/* DISCLAIMER */}
            <View style={s.disclaimerCard}>
              <View style={s.disclaimerIcon}>
                <Feather name="alert-triangle" size={14} color={C.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.disclaimerTitle}>Medical Disclaimer</Text>
                <Text style={s.disclaimerText}>
                  For educational purposes only. Always consult a licensed
                  veterinarian.
                </Text>
              </View>
            </View>

            {/* STATS ROW */}
            <View style={s.statsRow}>
              {/* LIFESPAN */}
              <View style={s.lifespanMini}>
                <ProgressChart
                  data={progressData}
                  width={100}
                  height={100}
                  strokeWidth={10}
                  radius={30}
                  chartConfig={chartConfig}
                  hideLegend={true}
                />
                <View style={s.lifespanMiniInfo}>
                  <Text style={s.lifespanYears}>{lifespan}</Text>
                  <Text style={s.lifespanLabel}>yrs lifespan</Text>
                </View>
              </View>

              {/* RISK SUMMARY */}
              <View style={s.riskSummary}>
                {[
                  {
                    label: "High Risk",
                    count: concerns.filter((c: any) =>
                      c.risk_level?.toLowerCase().includes("high"),
                    ).length,
                    color: C.red,
                    bgColor: C.redPale,
                  },
                  {
                    label: "Moderate",
                    count: concerns.filter((c: any) =>
                      c.risk_level?.toLowerCase().includes("mod"),
                    ).length,
                    color: C.amber,
                    bgColor: C.amberPale,
                  },
                  {
                    label: "Low Risk",
                    count: concerns.filter(
                      (c: any) =>
                        !c.risk_level?.toLowerCase().includes("high") &&
                        !c.risk_level?.toLowerCase().includes("mod"),
                    ).length,
                    color: C.green,
                    bgColor: C.greenPale,
                  },
                ].map((r) => (
                  <View
                    key={r.label}
                    style={[s.riskStat, { backgroundColor: r.bgColor }]}
                  >
                    <Text style={[s.riskStatNum, { color: r.color }]}>
                      {r.count}
                    </Text>
                    <Text style={[s.riskStatLabel, { color: r.color }]}>
                      {r.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* BAR CHART */}
            {concerns.length > 0 && (
              <View style={s.chartCard}>
                <View style={s.cardHeader}>
                  <View style={s.cardIcon}>
                    <Feather name="bar-chart-2" size={12} color={C.green} />
                  </View>
                  <Text style={s.cardTitle}>Risk Severity Analysis</Text>
                </View>
                <BarChart
                  data={barData}
                  width={width - 68}
                  height={160}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={chartConfig}
                  verticalLabelRotation={10}
                  fromZero
                  style={{ marginLeft: -12, borderRadius: 8 }}
                />
                <View style={s.legend}>
                  <View style={[s.legendDot, { backgroundColor: C.green }]} />
                  <Text style={s.legendText}>1 Low</Text>
                  <View style={[s.legendDot, { backgroundColor: C.amber }]} />
                  <Text style={s.legendText}>2 Moderate</Text>
                  <View style={[s.legendDot, { backgroundColor: C.red }]} />
                  <Text style={s.legendText}>3 High</Text>
                </View>
              </View>
            )}

            {/* CONCERNS */}
            <View style={s.sectionHead}>
              <View style={s.statusPill}>
                <View style={s.statusDot} />
                <Text style={s.statusLabel}>HEALTH CONCERNS</Text>
              </View>
            </View>

            {concerns.length > 0 ? (
              concerns.map((concern: any, index: number) => {
                const color = getRiskColor(concern.risk_level);
                const bgColor =
                  color === C.red
                    ? C.redPale
                    : color === C.amber
                      ? C.amberPale
                      : C.greenPale;
                const borderColor =
                  color === C.red
                    ? "#fecaca"
                    : color === C.amber
                      ? C.amberMid
                      : C.greenMid;
                return (
                  <View key={index} style={s.concernCard}>
                    <View style={s.concernHeader}>
                      <Text style={s.concernTitle}>{concern.name}</Text>
                      <View
                        style={[
                          s.riskPill,
                          { backgroundColor: bgColor, borderColor },
                        ]}
                      >
                        <View style={[s.riskDot, { backgroundColor: color }]} />
                        <Text style={[s.riskPillText, { color }]}>
                          {concern.risk_level}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[s.barMini, { backgroundColor: C.borderLight }]}
                    >
                      <View
                        style={[
                          s.barMiniFill,
                          {
                            width:
                              `${getRiskValue(concern.risk_level) * 33.3}%` as any,
                            backgroundColor: color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={s.concernLabel}>About</Text>
                    <Text style={s.concernText}>{concern.description}</Text>
                    <View style={s.divider} />
                    <Text style={s.concernLabel}>Prevention</Text>
                    <Text style={s.concernText}>{concern.prevention}</Text>
                  </View>
                );
              })
            ) : (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>No specific concerns recorded.</Text>
              </View>
            )}

            {/* SCREENINGS */}
            {screenings.length > 0 && (
              <>
                <View style={s.sectionHead}>
                  <View style={s.statusPill}>
                    <View style={s.statusDot} />
                    <Text style={s.statusLabel}>RECOMMENDED SCREENINGS</Text>
                  </View>
                </View>
                <View style={s.screeningsCard}>
                  {screenings.map((screen: any, index: number) => (
                    <View
                      key={index}
                      style={[
                        s.screenItem,
                        index < screenings.length - 1 && s.screenItemBorder,
                      ]}
                    >
                      <View style={s.screenIcon}>
                        <Feather name="check-circle" size={14} color={C.cyan} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.screenTitle}>{screen.name}</Text>
                        <Text style={s.screenText}>{screen.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* CARE TIPS */}
            {careTips.length > 0 && (
              <>
                <View style={s.sectionHead}>
                  <View style={s.statusPill}>
                    <View style={s.statusDot} />
                    <Text style={s.statusLabel}>CARE TIPS</Text>
                  </View>
                </View>
                <View style={s.tipsCard}>
                  {careTips.map((tip: string, index: number) => (
                    <View key={index} style={s.tipItem}>
                      <View style={s.tipBullet} />
                      <Text style={s.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.green },
  topBar: { backgroundColor: C.green },
  topSafe: { paddingTop: Platform.OS === "android" ? 36 : 0 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    letterSpacing: -0.2,
  },
  topSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  body: {
    flex: 1,
    backgroundColor: C.offWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -10,
    overflow: "hidden",
  },
  scroll: { paddingBottom: 40 },
  pageHead: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 4 },
  sectionHead: { paddingHorizontal: 18, marginBottom: 10, marginTop: 6 },
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
    marginBottom: 14,
  },
  errCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    gap: 8,
    backgroundColor: C.redPale,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    alignItems: "center",
  },
  errText: { flex: 1, fontSize: 12, color: C.red, fontWeight: "500" },

  disclaimerCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.redPale,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  disclaimerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#b91c1c",
    marginBottom: 2,
  },
  disclaimerText: { fontSize: 11, color: "#b91c1c", lineHeight: 17 },

  statsRow: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    gap: 10,
  },
  lifespanMini: {
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  lifespanMiniInfo: { gap: 2 },
  lifespanYears: {
    fontSize: 20,
    fontWeight: "800",
    color: C.green,
    letterSpacing: -0.5,
  },
  lifespanLabel: { fontSize: 10, color: C.textFaint },
  riskSummary: { flex: 1, gap: 6 },
  riskStat: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  riskStatNum: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  riskStatLabel: { fontSize: 10, fontWeight: "600" },

  chartCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: C.greenPale,
    borderWidth: 1,
    borderColor: C.greenMid,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: C.text },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: C.textFaint, marginRight: 4 },

  concernCard: {
    marginHorizontal: 18,
    marginBottom: 10,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  concernHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  concernTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    flex: 1,
    marginRight: 8,
  },
  riskPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskPillText: { fontSize: 10, fontWeight: "700" },
  barMini: { height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 10 },
  barMiniFill: { height: "100%", borderRadius: 2 },
  concernLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textFaint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  concernText: { fontSize: 12, color: C.textSoft, lineHeight: 18 },
  divider: { height: 1, backgroundColor: C.borderLight, marginVertical: 10 },

  screeningsCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  screenItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  screenItemBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  screenIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.cyanPale,
    borderWidth: 1,
    borderColor: C.cyanMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  screenTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
    marginBottom: 2,
  },
  screenText: { fontSize: 12, color: C.textSoft, lineHeight: 18 },

  tipsCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  tipItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: { flex: 1, fontSize: 13, color: C.textMid, lineHeight: 19 },

  emptyCard: {
    marginHorizontal: 18,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    alignItems: "center",
  },
  emptyText: { fontSize: 13, color: C.textSoft },

  loadIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.greenPale,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.greenMid,
    marginBottom: 12,
  },
  loadText: { fontSize: 15, fontWeight: "600", color: C.text },
});

export default ViewHealthRisk;
