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
  blue: "#3b82f6",
  bluePale: "#eff6ff",
  blueMid: "#bfdbfe",
  violet: "#7c3aed",
  violetPale: "#ede9fe",
  violetMid: "#c4b5fd",
  teal: "#0d9488",
  tealPale: "#f0fdfa",
  tealMid: "#99f6e4",
  orange: "#ea580c",
  orangePale: "#fff7ed",
  orangeMid: "#fed7aa",
};

// ── Country code → flag emoji ─────────────────────────────────────────────────
const countryFlag = (code?: string): string => {
  if (!code || code.length !== 2) return "🌍";
  const offset = 127397;
  return (
    String.fromCodePoint(code.toUpperCase().charCodeAt(0) + offset) +
    String.fromCodePoint(code.toUpperCase().charCodeAt(1) + offset)
  );
};

// ── Detail section icons ───────────────────────────────────────────────────────
const detailIcon = (title: string): keyof typeof Feather.glyphMap => {
  const t = title.toLowerCase();
  if (t.includes("ancestry") || t.includes("lineage")) return "git-branch";
  if (t.includes("purpose") || t.includes("work")) return "tool";
  if (t.includes("modern") || t.includes("role")) return "star";
  return "info";
};

const detailColor = (index: number) => {
  const palette = [
    { bg: C.violetPale, border: C.violetMid, icon: C.violet },
    { bg: C.tealPale, border: C.tealMid, icon: C.teal },
    { bg: C.orangePale, border: C.orangeMid, icon: C.orange },
    { bg: C.bluePale, border: C.blueMid, icon: C.blue },
  ];
  return palette[index % palette.length];
};

// ── Component ─────────────────────────────────────────────────────────────────
const ViewOrigin = () => {
  const router = useRouter();
  const { scan_id } = useLocalSearchParams();

  // ── ALL HOOKS unconditionally at the top ──────────────────────────────────
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
    const fetchData = async () => {
      if (!scan_id) {
        setError("Missing Scan ID");
        setLoading(false);
        return;
      }
      try {
        const response = await ApiService.getOriginHistory(scan_id as string);
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
          setError(response.message || "Failed to load origin data");
        }
      } catch {
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [scan_id]);

  // ── DERIVED DATA — unconditional ──────────────────────────────────────────
  const breed: string = data?.breed || "Unknown Breed";
  const originData: any = data?.origin_data || {};
  const country: string = originData?.country || "";
  const countryCode: string = originData?.country_code || "";
  const region: string = originData?.region || "";
  const description: string = originData?.description || "";
  const timeline: any[] = originData?.timeline || [];
  const details: any[] = originData?.details || [];
  const flag = countryFlag(countryCode);

  const handleBack = () =>
    router.push({ pathname: "/scan-result", params: { scan_id } });

  // ── LOADING STATE ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.topBar}>
          <SafeAreaView style={s.topSafe}>
            <View style={s.topRow}>
              <Text style={s.topTitle}>Breed Origin</Text>
            </View>
          </SafeAreaView>
        </View>
        <View
          style={[s.body, { alignItems: "center", justifyContent: "center" }]}
        >
          <View style={s.loadIconWrap}>
            <ActivityIndicator size="small" color={C.green} />
          </View>
          <Text style={s.loadText}>Loading origin data…</Text>
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
              <Text style={s.topTitle}>Breed Origin</Text>
              <Text style={s.topSub}>History & heritage</Text>
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
                <Text style={s.statusLabel}>BREED ORIGIN</Text>
              </View>
              <Text style={s.pageTitle}>{breed}</Text>
            </View>

            {error && (
              <View style={s.errCard}>
                <Feather name="alert-circle" size={14} color={C.red} />
                <Text style={s.errText}>{error}</Text>
              </View>
            )}

            {/* ORIGIN HERO CARD — country, flag, region */}
            {(country || region) && (
              <View style={s.heroCard}>
                <View style={s.heroTop}>
                  <Text style={s.heroFlag}>{flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.heroCountry}>{country || "Unknown"}</Text>
                    {region ? (
                      <View style={s.heroRegionRow}>
                        <Feather name="map-pin" size={11} color={C.textSoft} />
                        <Text style={s.heroRegion}>{region}</Text>
                      </View>
                    ) : null}
                  </View>
                  {countryCode ? (
                    <View style={s.heroCodeBadge}>
                      <Text style={s.heroCode}>
                        {countryCode.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {description ? (
                  <>
                    <View style={s.heroDivider} />
                    <Text style={s.heroDesc}>{description}</Text>
                  </>
                ) : null}
              </View>
            )}

            {/* QUICK STATS — country + region pills */}
            {(country || region) && (
              <View style={s.quickRow}>
                {country ? (
                  <View style={s.quickChip}>
                    <View
                      style={[s.quickChipIcon, { backgroundColor: C.bluePale }]}
                    >
                      <Feather name="globe" size={11} color={C.blue} />
                    </View>
                    <Text style={s.quickChipText}>{country}</Text>
                  </View>
                ) : null}
                {region ? (
                  <View style={s.quickChip}>
                    <View
                      style={[s.quickChipIcon, { backgroundColor: C.tealPale }]}
                    >
                      <Feather name="map" size={11} color={C.teal} />
                    </View>
                    <Text style={s.quickChipText}>{region}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* HISTORICAL TIMELINE */}
            {timeline.length > 0 && (
              <>
                <View style={s.sectionHead}>
                  <View style={s.statusPill}>
                    <View style={s.statusDot} />
                    <Text style={s.statusLabel}>HISTORICAL TIMELINE</Text>
                  </View>
                </View>
                <View style={s.timelineCard}>
                  {timeline.map((item: any, index: number) => {
                    const isLast = index === timeline.length - 1;
                    return (
                      <View key={index} style={s.timelineItem}>
                        {/* Vertical line */}
                        <View style={s.timelineLeft}>
                          <View style={s.timelineDot}>
                            <View style={s.timelineDotInner} />
                          </View>
                          {!isLast && <View style={s.timelineLine} />}
                        </View>
                        {/* Content */}
                        <View
                          style={[
                            s.timelineContent,
                            !isLast && { paddingBottom: 20 },
                          ]}
                        >
                          <View style={s.timelineYearBadge}>
                            <Text style={s.timelineYear}>{item.year}</Text>
                          </View>
                          <Text style={s.timelineEvent}>{item.event}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* BREED DETAILS — Ancestry, Purpose, Modern Roles */}
            {details.length > 0 && (
              <>
                <View style={s.sectionHead}>
                  <View style={s.statusPill}>
                    <View style={s.statusDot} />
                    <Text style={s.statusLabel}>BREED DETAILS</Text>
                  </View>
                </View>
                {details.map((detail: any, index: number) => {
                  const palette = detailColor(index);
                  const icon = detailIcon(detail.title || "");
                  return (
                    <View
                      key={index}
                      style={[
                        s.detailCard,
                        {
                          borderColor: palette.border,
                          backgroundColor: palette.bg,
                        },
                      ]}
                    >
                      <View style={s.detailHeader}>
                        <View
                          style={[
                            s.detailIcon,
                            { backgroundColor: palette.border },
                          ]}
                        >
                          <Feather name={icon} size={13} color={palette.icon} />
                        </View>
                        <Text style={[s.detailTitle, { color: palette.icon }]}>
                          {detail.title}
                        </Text>
                      </View>
                      <Text style={s.detailContent}>{detail.content}</Text>
                    </View>
                  );
                })}
              </>
            )}

            {/* EMPTY STATE */}
            {!country &&
              !region &&
              timeline.length === 0 &&
              details.length === 0 &&
              !error && (
                <View style={s.emptyCard}>
                  <View style={s.emptyIcon}>
                    <Feather name="globe" size={28} color={C.textFaint} />
                  </View>
                  <Text style={s.emptyTitle}>No origin data available</Text>
                  <Text style={s.emptySub}>
                    Origin history for this breed hasn't been generated yet.
                  </Text>
                </View>
              )}
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
};

// ── STYLES ────────────────────────────────────────────────────────────────────
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

  // ── HERO CARD ──
  heroCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroFlag: { fontSize: 42, lineHeight: 50 },
  heroCountry: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroRegionRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroRegion: { fontSize: 12, color: C.textSoft, fontWeight: "500" },
  heroCodeBadge: {
    backgroundColor: C.greenPale,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.greenMid,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroCode: {
    fontSize: 13,
    fontWeight: "800",
    color: C.green,
    letterSpacing: 1.5,
  },
  heroDivider: {
    height: 1,
    backgroundColor: C.borderLight,
    marginVertical: 12,
  },
  heroDesc: { fontSize: 13, color: C.textMid, lineHeight: 21 },

  // ── QUICK CHIPS ──
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  quickChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  quickChipText: { fontSize: 12, fontWeight: "600", color: C.textMid },

  // ── TIMELINE ──
  timelineCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  timelineItem: { flexDirection: "row", gap: 14 },
  timelineLeft: { alignItems: "center", width: 20 },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.greenPale,
    borderWidth: 2,
    borderColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: C.borderLight,
    marginTop: 4,
  },
  timelineContent: { flex: 1, paddingBottom: 0 },
  timelineYearBadge: {
    alignSelf: "flex-start",
    backgroundColor: C.greenDim,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.greenMid,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  timelineYear: {
    fontSize: 10,
    fontWeight: "800",
    color: C.green,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  timelineEvent: { fontSize: 13, color: C.textMid, lineHeight: 20 },

  // ── DETAIL CARDS ──
  detailCard: {
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  detailIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
    flex: 1,
  },
  detailContent: { fontSize: 13, color: C.textMid, lineHeight: 21 },

  // ── EMPTY ──
  emptyCard: {
    marginHorizontal: 18,
    marginTop: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 28,
    alignItems: "center",
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: C.offWhite,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: C.textSoft,
    textAlign: "center",
    lineHeight: 18,
  },

  // ── LOADING ──
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

export default ViewOrigin;
