import ApiService from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  redMid: "#fecaca",
  amber: "#f59e0b",
  amberPale: "#fffbeb",
  amberMid: "#fde68a",
  cyan: "#0891b2",
  cyanPale: "#ecfeff",
  cyanMid: "#a5f3fc",
  violet: "#7c3aed",
  violetPale: "#ede9fe",
  violetMid: "#c4b5fd",
  violetDark: "#5b21b6",
  teal: "#0d9488",
  tealPale: "#f0fdfa",
  tealMid: "#99f6e4",
  pink: "#db2777",
  pinkPale: "#fdf2f8",
  pinkMid: "#f9a8d4",
};

const fmtWH = (
  v: { male?: string; female?: string } | string | undefined,
): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  const parts: string[] = [];
  if (v.male) parts.push(`♂ ${v.male}`);
  if (v.female) parts.push(`♀ ${v.female}`);
  return parts.join("  ·  ") || null;
};

interface VisualFeature {
  label: string;
  value: string;
}

const normalizeVisual = (
  vf: VisualFeature[] | string[] | undefined | null,
): VisualFeature[] => {
  if (!vf || vf.length === 0) return [];
  if (typeof vf[0] === "string") {
    return (vf as string[]).map((s) => {
      const idx = s.indexOf(":");
      return idx > 0
        ? { label: s.slice(0, idx).trim(), value: s.slice(idx + 1).trim() }
        : { label: "Feature", value: s };
    });
  }
  return vf as VisualFeature[];
};

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

const ViewHealthRisk = () => {
  const router = useRouter();
  const { scan_id } = useLocalSearchParams();

  // ── ALL HOOKS — declared unconditionally before any return ────────────────
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

  // ── DERIVED DATA — all computed unconditionally (fixes hooks-order error) ──
  const responseData = data?.data || data;
  const breed: string = responseData?.breed || "Unknown Breed";
  const healthRisks: any = responseData?.health_data || {};
  const concerns: any[] = healthRisks?.concerns || [];
  const screenings: any[] = healthRisks?.screenings || [];
  const careTips: string[] = healthRisks?.care_tips || [];
  const lifespan: string = healthRisks?.lifespan || "0";
  const weightStr = fmtWH(healthRisks?.weight);
  const heightStr = fmtWH(healthRisks?.height);

  // ✅ FIX: useMemo calls are BEFORE the loading early return — no hooks violation
  const visualList = useMemo(
    () => normalizeVisual(healthRisks?.visual_features),
    [healthRisks],
  );

  const numericLifespan = useMemo(
    () => parseInt(String(lifespan).split("-")[0]) || 10,
    [lifespan],
  );

  const progressData = useMemo(
    () => ({ labels: ["Lifespan"], data: [Math.min(numericLifespan / 20, 1)] }),
    [numericLifespan],
  );

  const barData = useMemo(
    () => ({
      labels: concerns
        .slice(0, 4)
        .map((c: any) =>
          (c.name?.length ?? 0) > 8 ? c.name.substring(0, 8) + ".." : c.name,
        ),
      datasets: [
        {
          data: concerns
            .slice(0, 4)
            .map((c: any) => getRiskValue(c.risk_level)),
        },
      ],
    }),
    [concerns],
  );

  const riskCounts = useMemo(
    () => ({
      high: concerns.filter((c: any) =>
        c.risk_level?.toLowerCase().includes("high"),
      ).length,
      moderate: concerns.filter((c: any) =>
        c.risk_level?.toLowerCase().includes("mod"),
      ).length,
      low: concerns.filter(
        (c: any) =>
          !c.risk_level?.toLowerCase().includes("high") &&
          !c.risk_level?.toLowerCase().includes("mod"),
      ).length,
    }),
    [concerns],
  );

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

  const handleBack = () =>
    router.push({ pathname: "/scan-result", params: { scan_id } });

  // ── LOADING STATE (after all hooks) ───────────────────────────────────────
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

  // ── MAIN RENDER ───────────────────────────────────────────────────────────
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
            {/* PAGE HEADER */}
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
                  veterinarian for your pet's health.
                </Text>
              </View>
            </View>

            {/* LIFESPAN STAT */}
            <View style={s.quickStats}>
              <View
                style={[
                  s.statCard,
                  {
                    borderColor: C.pinkMid,
                    backgroundColor: C.pinkPale,
                    flex: 1,
                  },
                ]}
              >
                <View style={[s.statIcon, { backgroundColor: C.pink }]}>
                  <Feather name="heart" size={14} color={C.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.statLabel, { color: C.pink }]}>
                    AVG LIFESPAN
                  </Text>
                  <Text style={[s.statValue, { color: C.pink }]}>
                    {lifespan}
                    <Text style={[s.statUnit, { color: C.pink }]}> yrs</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* WEIGHT + HEIGHT */}
            {(weightStr || heightStr) && (
              <View style={s.wHRow}>
                {weightStr && (
                  <View
                    style={[
                      s.wHCard,
                      {
                        borderColor: C.violetMid,
                        backgroundColor: C.violetPale,
                      },
                    ]}
                  >
                    <View style={[s.wHIcon, { backgroundColor: C.violet }]}>
                      <Feather name="target" size={13} color={C.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.wHLabel, { color: C.violet }]}>
                        TYPICAL WEIGHT
                      </Text>
                      {weightStr.includes("·") ? (
                        weightStr.split("·").map((p, i) => (
                          <Text
                            key={i}
                            style={[s.wHValue, { color: C.violetDark }]}
                          >
                            {p.trim()}
                          </Text>
                        ))
                      ) : (
                        <Text style={[s.wHValue, { color: C.violetDark }]}>
                          {weightStr}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
                {heightStr && (
                  <View
                    style={[
                      s.wHCard,
                      { borderColor: C.tealMid, backgroundColor: C.tealPale },
                    ]}
                  >
                    <View style={[s.wHIcon, { backgroundColor: C.teal }]}>
                      <Feather name="arrow-up" size={13} color={C.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.wHLabel, { color: C.teal }]}>
                        TYPICAL HEIGHT
                      </Text>
                      {heightStr.includes("·") ? (
                        heightStr.split("·").map((p, i) => (
                          <Text key={i} style={[s.wHValue, { color: C.teal }]}>
                            {p.trim()}
                          </Text>
                        ))
                      ) : (
                        <Text style={[s.wHValue, { color: C.teal }]}>
                          {heightStr}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* RISK OVERVIEW */}
            <View style={s.statsRow}>
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
              <View style={s.riskSummary}>
                {[
                  {
                    label: "High Risk",
                    count: riskCounts.high,
                    color: C.red,
                    bgColor: C.redPale,
                  },
                  {
                    label: "Moderate",
                    count: riskCounts.moderate,
                    color: C.amber,
                    bgColor: C.amberPale,
                  },
                  {
                    label: "Low Risk",
                    count: riskCounts.low,
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

            {/* VISUAL FEATURES */}
            {visualList.length > 0 && (
              <>
                <View style={s.sectionHead}>
                  <View style={s.statusPill}>
                    <View style={s.statusDot} />
                    <Text style={s.statusLabel}>VISUAL FEATURES</Text>
                  </View>
                </View>
                <View style={s.visualCard}>
                  {visualList.map((f, i) => (
                    <View
                      key={i}
                      style={[
                        s.visualRow,
                        i < visualList.length - 1 && s.visualRowBorder,
                      ]}
                    >
                      <Text style={s.visualLabel}>{f.label}</Text>
                      <Text style={s.visualValue} numberOfLines={2}>
                        {f.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* BAR CHART */}
            {concerns.length > 0 && barData.labels.length > 0 && (
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

            {/* HEALTH CONCERNS */}
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
                    ? C.redMid
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

            {/* RECOMMENDED SCREENINGS */}
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
    borderColor: C.redMid,
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
    borderColor: C.redMid,
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
  quickStats: {
    marginHorizontal: 18,
    marginBottom: 8,
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  statValue: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  statUnit: { fontSize: 12, fontWeight: "600" },
  wHRow: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    gap: 8,
  },
  wHCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  wHIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  wHLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  wHValue: { fontSize: 11, fontWeight: "700" },
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
  visualCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  visualRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  visualRowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  visualLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textFaint,
    flex: 1,
    letterSpacing: 0.3,
  },
  visualValue: {
    fontSize: 12,
    fontWeight: "600",
    color: C.text,
    flex: 1.5,
    textAlign: "right",
  },
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
