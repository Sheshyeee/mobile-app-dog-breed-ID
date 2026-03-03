import ApiService from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  blue: "#3b82f6",
  bluePale: "#eff6ff",
  blueMid: "#bfdbfe",
  cyan: "#0891b2",
  cyanPale: "#ecfeff",
  cyanMid: "#a5f3fc",
  red: "#ef4444",
};

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
    const fetchOriginData = async () => {
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
    fetchOriginData();
  }, [scan_id]);

  const toggleAccordion = (id: string) =>
    setExpandedAccordion(expandedAccordion === id ? null : id);

  const handleBack = () =>
    router.push({ pathname: "/scan-result", params: { scan_id } });

  const responseData = data?.data || data;
  const breed = responseData?.breed || "Unknown Breed";
  const originData = responseData?.origin_data || {};
  const country = originData?.country || "Unknown";
  const countryCode = (originData?.country_code || "unknown").toLowerCase();
  const region = originData?.region || "Unknown Region";
  const description = originData?.description || "No description available.";
  const timeline = originData?.timeline || [];
  const details = originData?.details || [];
  const flagUrl = `https://flagcdn.com/w320/${countryCode}.png`;

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.topBar}>
          <SafeAreaView style={s.topSafe}>
            <View style={s.topRow}>
              <Text style={s.topTitle}>Origin History</Text>
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

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <SafeAreaView style={s.topSafe}>
          <View style={s.topRow}>
            <TouchableOpacity onPress={handleBack} style={s.backBtn}>
              <Feather name="arrow-left" size={18} color={C.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.topTitle}>Origin History</Text>
              <Text style={s.topSub}>Breed heritage and evolution</Text>
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
                <Text style={s.statusLabel}>BREED HERITAGE</Text>
              </View>
              <Text style={s.pageTitle}>{breed}</Text>
            </View>

            {error && (
              <View style={s.errCard}>
                <Feather name="alert-circle" size={14} color={C.red} />
                <Text style={s.errText}>{error}</Text>
              </View>
            )}

            {/* GEOGRAPHIC CARD */}
            <View style={s.geoCard}>
              <View style={s.cardHeader}>
                <View style={s.cardIcon}>
                  <Feather name="map-pin" size={12} color={C.green} />
                </View>
                <Text style={s.cardTitle}>Geographic Origin</Text>
              </View>

              <View style={s.geoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.countryName}>{country}</Text>
                  <View style={s.regionPill}>
                    <Feather name="map" size={10} color={C.cyan} />
                    <Text style={s.regionText}>{region}</Text>
                  </View>
                  <Text style={s.geoDesc}>{description}</Text>
                </View>

                <View style={s.flagWrap}>
                  {!flagError && countryCode !== "unknown" ? (
                    <Image
                      source={{ uri: flagUrl }}
                      style={s.flagImg}
                      resizeMode="cover"
                      onError={() => setFlagError(true)}
                    />
                  ) : (
                    <View style={[s.flagImg, s.flagPlaceholder]}>
                      <Feather name="flag" size={20} color={C.textFaint} />
                    </View>
                  )}
                  <Text style={s.flagCountry}>{country}</Text>
                </View>
              </View>
            </View>

            {/* TIMELINE */}
            {timeline.length > 0 && (
              <View style={s.timelineCard}>
                <View style={s.cardHeader}>
                  <View
                    style={[
                      s.cardIcon,
                      { backgroundColor: "#eff6ff", borderColor: C.blueMid },
                    ]}
                  >
                    <Feather name="git-branch" size={12} color={C.blue} />
                  </View>
                  <Text style={s.cardTitle}>History Timeline</Text>
                </View>
                {timeline.map((item: any, index: number) => (
                  <View key={index} style={s.timelineItem}>
                    <View style={s.timelineLeft}>
                      <View style={s.timelineDot} />
                      {index < timeline.length - 1 && (
                        <View style={s.timelineLine} />
                      )}
                    </View>
                    <View style={s.timelineRight}>
                      <Text style={s.timelineYear}>{item.year}</Text>
                      <Text style={s.timelineEvent}>{item.event}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* DETAILED HISTORY */}
            {details.length > 0 && (
              <View style={s.detailCard}>
                <View style={s.cardHeader}>
                  <View
                    style={[
                      s.cardIcon,
                      { backgroundColor: C.cyanPale, borderColor: C.cyanMid },
                    ]}
                  >
                    <Feather name="book-open" size={12} color={C.cyan} />
                  </View>
                  <Text style={s.cardTitle}>Detailed History</Text>
                </View>
                {details.map((item: any, index: number) => {
                  const isOpen = expandedAccordion === `detail-${index}`;
                  return (
                    <View key={index} style={s.accordionItem}>
                      <TouchableOpacity
                        style={[
                          s.accordionTrigger,
                          isOpen && s.accordionTriggerOpen,
                        ]}
                        onPress={() => toggleAccordion(`detail-${index}`)}
                        activeOpacity={0.75}
                      >
                        <Text style={s.accordionTriggerText}>{item.title}</Text>
                        <View
                          style={[s.chevronWrap, isOpen && s.chevronWrapOpen]}
                        >
                          <Feather
                            name={isOpen ? "chevron-up" : "chevron-down"}
                            size={14}
                            color={isOpen ? C.green : C.textFaint}
                          />
                        </View>
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={s.accordionContent}>
                          <Text style={s.accordionText}>{item.content}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {!error && timeline.length === 0 && details.length === 0 && (
              <View style={s.noDataCard}>
                <View style={s.noDataIcon}>
                  <Feather name="info" size={20} color={C.textFaint} />
                </View>
                <Text style={s.noDataTitle}>No Data Available</Text>
                <Text style={s.noDataText}>
                  No origin history data available for this breed.
                </Text>
              </View>
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
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    alignItems: "center",
  },
  errText: { flex: 1, fontSize: 12, color: C.red, fontWeight: "500" },

  // GEO CARD
  geoCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
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
  geoRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  countryName: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  regionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: C.cyanPale,
    borderWidth: 1,
    borderColor: C.cyanMid,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  regionText: { fontSize: 10, fontWeight: "600", color: C.cyan },
  geoDesc: { fontSize: 12, color: C.textSoft, lineHeight: 18 },
  flagWrap: { alignItems: "center", gap: 6 },
  flagImg: {
    width: 80,
    height: 54,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  flagPlaceholder: {
    backgroundColor: C.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  flagCountry: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textSoft,
    textAlign: "center",
  },

  // TIMELINE
  timelineCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 4,
  },
  timelineItem: { flexDirection: "row", gap: 12, minHeight: 48 },
  timelineLeft: { alignItems: "center", paddingTop: 4 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.cyan,
    borderWidth: 2,
    borderColor: C.cyanPale,
  },
  timelineLine: { flex: 1, width: 2, backgroundColor: C.cyanMid, marginTop: 4 },
  timelineRight: { flex: 1, paddingBottom: 14 },
  timelineYear: {
    fontSize: 11,
    fontWeight: "800",
    color: C.cyan,
    marginBottom: 3,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  timelineEvent: { fontSize: 13, color: C.textMid, lineHeight: 19 },

  // DETAIL ACCORDION
  detailCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 0,
  },
  accordionItem: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  accordionTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  accordionTriggerOpen: {},
  accordionTriggerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
  },
  chevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: C.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronWrapOpen: { backgroundColor: C.greenPale },
  accordionContent: { paddingBottom: 14 },
  accordionText: { fontSize: 13, color: C.textSoft, lineHeight: 20 },

  // NO DATA
  noDataCard: {
    marginHorizontal: 18,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  noDataIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  noDataTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  noDataText: {
    fontSize: 13,
    color: C.textSoft,
    textAlign: "center",
    lineHeight: 19,
  },

  // LOADING
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
