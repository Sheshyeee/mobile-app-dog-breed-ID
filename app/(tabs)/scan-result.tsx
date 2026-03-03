import ApiService from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Image,
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
  amber: "#f59e0b",
  violet: "#7c3aed",
  violetPale: "#ede9fe",
  pink: "#ec4899",
  pinkPale: "#fdf2f8",
  blue: "#3b82f6",
  bluePale: "#eff6ff",
};

type PredictionResult = { breed: string; confidence: number };
type Result = {
  scan_id: string;
  image_url: string;
  breed: string;
  confidence: number;
  description: string;
  top_predictions: PredictionResult[];
};

const ScanResults = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [result, setResult] = React.useState<Result | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const scanId = params.scan_id;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const bh = BackHandler.addEventListener("hardwareBackPress", () => {
      router.push("/scan");
      return true;
    });
    return () => bh.remove();
  }, []);

  useEffect(() => {
    const fetchResult = async () => {
      const id = params.scan_id as string;
      if (!id) {
        setError("No scan ID provided");
        setLoading(false);
        return;
      }
      try {
        const response = await ApiService.getResult(id);
        if (response.success && response.data) {
          setResult(response.data as Result);
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
          setError(response.message || "Failed to load results");
        }
      } catch {
        setError("Failed to load results. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [params.scan_id]);

  const filteredPredictions = React.useMemo(() => {
    if (!result?.top_predictions) return [];
    return result.top_predictions.filter((p) => {
      if (!p?.breed) return false;
      const b = p.breed.toLowerCase().trim();
      const invalid = [
        "other breeds",
        "other breed",
        "alternative 1",
        "alternative 2",
        "alternative 3",
        "alternative",
        "unknown",
      ];
      if (invalid.includes(b)) return false;
      if (!p.confidence || p.confidence <= 0) return false;
      if (result?.breed && b === result.breed.toLowerCase().trim())
        return false;
      return true;
    });
  }, [result]);

  const topAlternatives = React.useMemo(
    () =>
      [...filteredPredictions]
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3),
    [filteredPredictions],
  );

  const getConfColor = (c: number) =>
    c >= 80 ? C.green : c >= 60 ? C.amber : C.red;

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.topBar}>
          <SafeAreaView style={s.topSafe}>
            <View style={s.topRow}>
              <Text style={s.topTitle}>Scan Results</Text>
            </View>
          </SafeAreaView>
        </View>
        <View
          style={[s.body, { alignItems: "center", justifyContent: "center" }]}
        >
          <View style={s.loadIconWrap}>
            <ActivityIndicator size="small" color={C.green} />
          </View>
          <Text style={s.loadText}>Analyzing your pet…</Text>
          <Text style={s.loadSub}>This may take a few seconds</Text>
        </View>
      </View>
    );
  }

  if (error || !result) {
    return (
      <View style={s.root}>
        <View style={s.topBar}>
          <SafeAreaView style={s.topSafe}>
            <View style={s.topRow}>
              <TouchableOpacity
                onPress={() => router.push("/scan")}
                style={s.backBtn}
              >
                <Feather name="arrow-left" size={18} color={C.white} />
              </TouchableOpacity>
              <Text style={s.topTitle}>Scan Results</Text>
            </View>
          </SafeAreaView>
        </View>
        <View
          style={[
            s.body,
            { alignItems: "center", justifyContent: "center", padding: 24 },
          ]}
        >
          <View style={s.errIconWrap}>
            <Feather name="alert-circle" size={28} color={C.red} />
          </View>
          <Text style={s.errTitle}>Something went wrong</Text>
          <Text style={s.errMsg}>{error || "No results found"}</Text>
          <TouchableOpacity
            style={s.retryBtn}
            onPress={() => router.push("/scan")}
          >
            <Feather name="refresh-cw" size={14} color={C.white} />
            <Text style={s.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const confColor = getConfColor(result.confidence);

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <SafeAreaView style={s.topSafe}>
          <View style={s.topRow}>
            <TouchableOpacity
              onPress={() => router.push("/scan")}
              style={s.backBtn}
            >
              <Feather name="arrow-left" size={18} color={C.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.topTitle}>Scan Results</Text>
              <Text style={s.topSub}>Here's what we found</Text>
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
                <Text style={s.statusLabel}>IDENTIFICATION COMPLETE</Text>
              </View>
              <Text style={s.pageTitle}>Breed Detected</Text>
            </View>

            <View style={s.primaryCard}>
              <Image
                source={{
                  uri: result.image_url || "https://via.placeholder.com/400",
                }}
                style={[s.petImage, { height: width * 0.56 }]}
                resizeMode="cover"
              />
              <View style={s.primaryBody}>
                <View style={s.primaryTop}>
                  <View style={s.matchBadge}>
                    <Feather name="award" size={10} color={C.green} />
                    <Text style={s.matchBadgeText}>Primary Match</Text>
                  </View>
                  <View
                    style={[s.confBadge, { backgroundColor: confColor + "20" }]}
                  >
                    <Text style={[s.confBadgeText, { color: confColor }]}>
                      {Math.round(result.confidence)}%
                    </Text>
                  </View>
                </View>
                <Text style={s.breedName}>{result.breed}</Text>
                <Text style={s.breedDesc}>{result.description}</Text>
                <View style={s.confRow}>
                  <Text style={s.confLabel}>Confidence Score</Text>
                  <Text style={[s.confValue, { color: confColor }]}>
                    {Math.round(result.confidence)}%
                  </Text>
                </View>
                <View style={s.barTrack}>
                  <View
                    style={[
                      s.barFill,
                      {
                        width: `${result.confidence}%` as any,
                        backgroundColor: confColor,
                      },
                    ]}
                  />
                </View>
                <Text style={s.scanIdText}>ID: {result.scan_id}</Text>
              </View>
            </View>

            {topAlternatives.length > 0 && (
              <View style={s.altCard}>
                <View style={s.sectionHead}>
                  <View style={s.sectionIcon}>
                    <Feather name="list" size={12} color={C.green} />
                  </View>
                  <Text style={s.sectionTitle}>Other Possible Breeds</Text>
                </View>
                {topAlternatives.map((p, i) => (
                  <View key={`${p.breed}-${i}`} style={s.altItem}>
                    <View style={s.altRank}>
                      <Text style={s.altRankText}>{i + 1}</Text>
                    </View>
                    <View style={s.altContent}>
                      <View style={s.altTopRow}>
                        <Text style={s.altBreed}>{p.breed}</Text>
                        <Text style={s.altConf}>
                          {Math.round(p.confidence)}%
                        </Text>
                      </View>
                      <View style={s.altBarTrack}>
                        <View
                          style={[
                            s.altBarFill,
                            { width: `${p.confidence}%` as any },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {topAlternatives.length === 0 && result.confidence >= 80 && (
              <View style={s.highConfCard}>
                <View style={s.highConfIcon}>
                  <Feather name="check-circle" size={16} color={C.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.highConfTitle}>High Confidence Match</Text>
                  <Text style={s.highConfSub}>
                    Our system is very confident about this identification.
                  </Text>
                </View>
              </View>
            )}

            <View style={s.sectionHead2}>
              <View style={s.statusPill}>
                <View style={s.statusDot} />
                <Text style={s.statusLabel}>EXPLORE INSIGHTS</Text>
              </View>
            </View>

            <View style={s.insightsGrid}>
              <TouchableOpacity
                style={[s.insightCard, { borderColor: "#fce7f3" }]}
                onPress={() =>
                  router.push({
                    pathname: "/health-risk",
                    params: { scan_id: scanId },
                  })
                }
                activeOpacity={0.78}
              >
                <View style={[s.insightIcon, { backgroundColor: C.pinkPale }]}>
                  <Feather name="activity" size={18} color={C.pink} />
                </View>
                <Text style={s.insightTitle}>Health Risks</Text>
                <Text style={s.insightDesc}>
                  Breed-specific health considerations
                </Text>
                <View style={[s.insightBtn, { backgroundColor: C.pink }]}>
                  <Text style={s.insightBtnText}>View Risks</Text>
                  <Feather name="arrow-right" size={12} color={C.white} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.insightCard, { borderColor: "#dbeafe" }]}
                onPress={() =>
                  router.push({
                    pathname: "/origin",
                    params: { scan_id: scanId },
                  })
                }
                activeOpacity={0.78}
              >
                <View style={[s.insightIcon, { backgroundColor: C.bluePale }]}>
                  <Feather name="globe" size={18} color={C.blue} />
                </View>
                <Text style={s.insightTitle}>Origin History</Text>
                <Text style={s.insightDesc}>
                  Discover your pet's breed heritage
                </Text>
                <View style={[s.insightBtn, { backgroundColor: C.blue }]}>
                  <Text style={s.insightBtnText}>Explore</Text>
                  <Feather name="arrow-right" size={12} color={C.white} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.insightCard, { borderColor: "#e9d5ff" }]}
                onPress={() =>
                  router.push({
                    pathname: "/view-simulation",
                    params: { scan_id: scanId },
                  })
                }
                activeOpacity={0.78}
              >
                <View
                  style={[s.insightIcon, { backgroundColor: C.violetPale }]}
                >
                  <Feather name="clock" size={18} color={C.violet} />
                </View>
                <Text style={s.insightTitle}>Future Appearance</Text>
                <Text style={s.insightDesc}>
                  See how your pet will look as they age
                </Text>
                <View style={[s.insightBtn, { backgroundColor: C.violet }]}>
                  <Text style={s.insightBtnText}>Simulate</Text>
                  <Feather name="arrow-right" size={12} color={C.white} />
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={s.newScanBtn}
              onPress={() => router.push("/scan")}
              activeOpacity={0.85}
            >
              <Feather name="camera" size={15} color={C.white} />
              <Text style={s.newScanText}>Scan Another Pet</Text>
            </TouchableOpacity>
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
  primaryCard: {
    marginHorizontal: 18,
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  petImage: { width: "100%", backgroundColor: C.borderLight },
  primaryBody: { padding: 16, gap: 8 },
  primaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.greenPale,
    borderWidth: 1,
    borderColor: C.greenMid,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  matchBadgeText: { fontSize: 10, fontWeight: "700", color: C.green },
  confBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  confBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  breedName: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },
  breedDesc: { fontSize: 13, color: C.textSoft, lineHeight: 19 },
  confRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textFaint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  confValue: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  barTrack: {
    height: 5,
    backgroundColor: C.borderLight,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  scanIdText: { fontSize: 10, color: C.textFaint, fontStyle: "italic" },
  altCard: {
    marginHorizontal: 18,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: C.greenPale,
    borderWidth: 1,
    borderColor: C.greenMid,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: C.text },
  altItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  altRank: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: C.greenPale,
    borderWidth: 1,
    borderColor: C.greenMid,
    alignItems: "center",
    justifyContent: "center",
  },
  altRankText: {
    fontSize: 12,
    fontWeight: "800",
    color: C.green,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  altContent: { flex: 1, gap: 5 },
  altTopRow: { flexDirection: "row", justifyContent: "space-between" },
  altBreed: { fontSize: 13, fontWeight: "600", color: C.text },
  altConf: {
    fontSize: 11,
    fontWeight: "700",
    color: C.green,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  altBarTrack: {
    height: 4,
    backgroundColor: C.borderLight,
    borderRadius: 2,
    overflow: "hidden",
  },
  altBarFill: {
    height: "100%",
    backgroundColor: C.greenLight,
    borderRadius: 2,
  },
  highConfCard: {
    marginHorizontal: 18,
    backgroundColor: C.greenDim,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.greenMid,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  highConfIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.greenPale,
    alignItems: "center",
    justifyContent: "center",
  },
  highConfTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    marginBottom: 2,
  },
  highConfSub: { fontSize: 11, color: C.textSoft, lineHeight: 16 },
  sectionHead2: { paddingHorizontal: 18, marginBottom: 12, marginTop: 4 },
  insightsGrid: { paddingHorizontal: 18, gap: 10, marginBottom: 16 },
  insightCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.2,
  },
  insightDesc: { fontSize: 12, color: C.textSoft, lineHeight: 17 },
  insightBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 2,
  },
  insightBtnText: { fontSize: 12, fontWeight: "700", color: C.white },
  newScanBtn: {
    marginHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.green,
    paddingVertical: 15,
    borderRadius: 14,
  },
  newScanText: { fontSize: 14, fontWeight: "700", color: C.white },
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
  loadText: { fontSize: 15, fontWeight: "600", color: C.text, marginBottom: 4 },
  loadSub: { fontSize: 12, color: C.textSoft },
  errIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  errTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 6 },
  errMsg: {
    fontSize: 13,
    color: C.textSoft,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.green,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryText: { fontSize: 14, fontWeight: "600", color: C.white },
});

export default ScanResults;
