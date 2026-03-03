import ApiService from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  violet: "#7c3aed",
  violetPale: "#ede9fe",
  violetMid: "#c4b5fd",
  amber: "#f59e0b",
  amberPale: "#fffbeb",
  amberMid: "#fde68a",
  blue: "#3b82f6",
};

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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bh = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => bh.remove();
  }, [scanId]);

  const handleBack = () =>
    router.push({ pathname: "/scan-result", params: { scan_id: scanId } });

  useEffect(() => {
    const fetchSimulationData = async () => {
      try {
        const response = await ApiService.getSimulation(scanId);
        if (response.success && response.data) {
          setBreed(response.data.breed);
          setOriginalImage(response.data.original_image);
          setSimulations(response.data.simulations);
          setStatus(response.data.status);
          if (
            response.data.status !== "complete" &&
            response.data.status !== "failed"
          ) {
            setIsPolling(true);
          }
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
          Alert.alert(
            "Error",
            response.message || "Failed to load simulation data",
          );
        }
      } catch {
        Alert.alert("Error", "Failed to load simulation data");
      } finally {
        setLoading(false);
      }
    };
    if (scanId) fetchSimulationData();
  }, [scanId]);

  useEffect(() => {
    if (!isPolling) return;
    const pollInterval = setInterval(async () => {
      try {
        const response = await ApiService.getSimulationStatus(scanId);
        if (response.success && response.data) {
          setStatus(response.data.status);
          setSimulations(response.data.simulations);
          if (
            response.data.status === "complete" ||
            response.data.status === "failed"
          ) {
            setIsPolling(false);
          }
        }
      } catch {
        /* silent */
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [isPolling, scanId]);

  const switchTab = (tab: "1" | "3") => {
    setActiveTab(tab);
    Animated.timing(tabAnim, {
      toValue: tab === "1" ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const hasSimulations = simulations["1_years"] || simulations["3_years"];
  const isGenerating = status === "pending" || status === "generating";

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.topBar}>
          <SafeAreaView style={s.topSafe}>
            <View style={s.topRow}>
              <Text style={s.topTitle}>Future Appearance</Text>
            </View>
          </SafeAreaView>
        </View>
        <View
          style={[s.body, { alignItems: "center", justifyContent: "center" }]}
        >
          <View style={s.loadIconWrap}>
            <ActivityIndicator size="small" color={C.green} />
          </View>
          <Text style={s.loadText}>Loading simulation…</Text>
        </View>
      </View>
    );
  }

  const currentSim =
    activeTab === "1" ? simulations["1_years"] : simulations["3_years"];

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <SafeAreaView style={s.topSafe}>
          <View style={s.topRow}>
            <TouchableOpacity onPress={handleBack} style={s.backBtn}>
              <Feather name="arrow-left" size={18} color={C.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.topTitle}>Future Appearance</Text>
              <Text style={s.topSub}>Age progression simulation</Text>
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
                <Text style={s.statusLabel}>AGE SIMULATION</Text>
              </View>
              <Text style={s.pageTitle}>{breed || "Your Dog"}</Text>
            </View>

            {/* NOTE CARD */}
            <View style={s.noteCard}>
              <Feather
                name="info"
                size={13}
                color={C.amber}
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <Text style={s.noteText}>
                Predictions are based on current age, breed patterns, and
                genetic markers. Actual aging varies by genetics and
                environment.
              </Text>
            </View>

            {/* GENERATING STATE */}
            {isGenerating && !hasSimulations && (
              <View style={s.generatingCard}>
                <View style={s.genIconWrap}>
                  <ActivityIndicator size="large" color={C.violet} />
                </View>
                <Text style={s.genTitle}>
                  {status === "pending"
                    ? "Analyzing features…"
                    : "Generating predictions…"}
                </Text>
                <Text style={s.genSub}>
                  Creating age progression images. This takes 20–40 seconds.
                </Text>
                <View style={s.genDots}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={[s.genDot, { opacity: 0.3 + i * 0.35 }]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* FAILED STATE */}
            {status === "failed" && !hasSimulations && (
              <View style={s.failedCard}>
                <View style={s.failedIcon}>
                  <Feather name="alert-circle" size={24} color={C.red} />
                </View>
                <Text style={s.failedTitle}>Generation Failed</Text>
                <Text style={s.failedSub}>
                  We couldn't generate the simulations. Please try again later.
                </Text>
                <TouchableOpacity style={s.backBtnPrimary} onPress={handleBack}>
                  <Text style={s.backBtnText}>Back to Results</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TABS + SIMULATION */}
            {hasSimulations && (
              <>
                {isGenerating && (
                  <View style={s.genBanner}>
                    <ActivityIndicator size="small" color={C.violet} />
                    <Text style={s.genBannerText}>
                      Generating remaining images…
                    </Text>
                  </View>
                )}

                {/* TAB SELECTOR */}
                <View style={s.tabsWrap}>
                  {(
                    [
                      { id: "1", label: "In 1 Year", icon: "clock" },
                      { id: "3", label: "In 3 Years", icon: "calendar" },
                    ] as const
                  ).map((tab) => (
                    <TouchableOpacity
                      key={tab.id}
                      style={[s.tab, activeTab === tab.id && s.tabActive]}
                      onPress={() => switchTab(tab.id)}
                      activeOpacity={0.75}
                    >
                      <Feather
                        name={tab.icon}
                        size={13}
                        color={activeTab === tab.id ? C.violet : C.textFaint}
                      />
                      <Text
                        style={[
                          s.tabText,
                          activeTab === tab.id && s.tabTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* SIDE-BY-SIDE COMPARISON */}
                <View style={s.comparisonCard}>
                  <View style={s.compRow}>
                    {/* CURRENT */}
                    <View style={s.imgSection}>
                      <View style={s.imgLabelRow}>
                        <View
                          style={[s.imgLabelDot, { backgroundColor: C.green }]}
                        />
                        <Text style={s.imgLabel}>Today</Text>
                      </View>
                      <View style={s.imgWrap}>
                        <Image
                          source={
                            originalImage ? { uri: originalImage } : undefined
                          }
                          style={s.dogImg}
                          resizeMode="cover"
                        />
                      </View>
                      <Text style={s.imgCaption}>Current appearance</Text>
                    </View>

                    {/* DIVIDER */}
                    <View style={s.compDivider}>
                      <View style={s.compArrow}>
                        <Feather
                          name="arrow-right"
                          size={14}
                          color={C.violet}
                        />
                      </View>
                    </View>

                    {/* FUTURE */}
                    <View style={s.imgSection}>
                      <View style={s.imgLabelRow}>
                        <View
                          style={[s.imgLabelDot, { backgroundColor: C.violet }]}
                        />
                        <Text style={s.imgLabel}>
                          {activeTab === "1" ? "+1 Year" : "+3 Years"}
                        </Text>
                      </View>
                      <View style={s.imgWrap}>
                        {currentSim ? (
                          <Image
                            source={{ uri: currentSim }}
                            style={s.dogImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[s.dogImg, s.imgPlaceholder]}>
                            <ActivityIndicator size="small" color={C.violet} />
                            <Text style={s.imgPlaceholderText}>
                              Generating…
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.imgCaption}>
                        {activeTab === "1" ? "One" : "Three"} year
                        {activeTab === "3" ? "s" : ""} from today
                      </Text>
                    </View>
                  </View>
                </View>

                {/* STATUS BAR */}
                <View style={s.simStatusCard}>
                  <View style={s.simStatusRow}>
                    {[
                      { label: "1-Year Sim", ready: !!simulations["1_years"] },
                      { label: "3-Year Sim", ready: !!simulations["3_years"] },
                    ].map((item) => (
                      <View key={item.label} style={s.simStatusItem}>
                        <View
                          style={[
                            s.simStatusIcon,
                            {
                              backgroundColor: item.ready
                                ? C.greenPale
                                : C.amberPale,
                              borderColor: item.ready ? C.greenMid : C.amberMid,
                            },
                          ]}
                        >
                          <Feather
                            name={item.ready ? "check" : "clock"}
                            size={12}
                            color={item.ready ? C.green : C.amber}
                          />
                        </View>
                        <View>
                          <Text style={s.simStatusLabel}>{item.label}</Text>
                          <Text
                            style={[
                              s.simStatusValue,
                              { color: item.ready ? C.green : C.amber },
                            ]}
                          >
                            {item.ready ? "Ready" : "Pending"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
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

  noteCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    gap: 10,
    backgroundColor: C.amberPale,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.amberMid,
    padding: 12,
    alignItems: "flex-start",
  },
  noteText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 18 },

  generatingCard: {
    marginHorizontal: 18,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  genIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: C.violetPale,
    borderWidth: 1,
    borderColor: C.violetMid,
    alignItems: "center",
    justifyContent: "center",
  },
  genTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  genSub: {
    fontSize: 12,
    color: C.textSoft,
    textAlign: "center",
    lineHeight: 18,
  },
  genDots: { flexDirection: "row", gap: 6 },
  genDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.violet },

  failedCard: {
    marginHorizontal: 18,
    backgroundColor: C.redPale,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  failedIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  failedTitle: { fontSize: 15, fontWeight: "700", color: "#991b1b" },
  failedSub: {
    fontSize: 12,
    color: "#dc2626",
    textAlign: "center",
    lineHeight: 18,
  },
  backBtnPrimary: {
    backgroundColor: C.green,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 4,
  },
  backBtnText: { fontSize: 13, fontWeight: "700", color: C.white },

  genBanner: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: C.violetPale,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.violetMid,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  genBannerText: { fontSize: 12, color: C.violet, fontWeight: "500" },

  tabsWrap: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: C.violetPale },
  tabText: { fontSize: 13, fontWeight: "600", color: C.textFaint },
  tabTextActive: { color: C.violet },

  comparisonCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  compRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  imgSection: { flex: 1, gap: 8 },
  imgLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  imgLabelDot: { width: 6, height: 6, borderRadius: 3 },
  imgLabel: { fontSize: 11, fontWeight: "700", color: C.textMid },
  imgWrap: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: C.borderLight,
    borderWidth: 1,
    borderColor: C.border,
  },
  dogImg: {
    width: "100%",
    aspectRatio: 1,
  },
  imgPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.borderLight,
  },
  imgPlaceholderText: { fontSize: 11, color: C.textFaint },
  imgCaption: { fontSize: 10, color: C.textFaint, textAlign: "center" },
  compDivider: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 30,
  },
  compArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.violetPale,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.violetMid,
  },

  simStatusCard: {
    marginHorizontal: 18,
    backgroundColor: C.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  simStatusRow: { flexDirection: "row", gap: 12 },
  simStatusItem: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  simStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  simStatusLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.text,
    marginBottom: 1,
  },
  simStatusValue: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },

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

export default ViewSimulation;
