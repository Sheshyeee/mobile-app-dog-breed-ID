import ApiService, {
  AgeProfile,
  AgeProfiles,
  CurrentHealth,
  HealthNote,
  VisualFeature,
} from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
const MAX_POLLING = 120;

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
  violet: "#7c3aed",
  violetPale: "#ede9fe",
  violetMid: "#c4b5fd",
  violetDark: "#5b21b6",
  amber: "#f59e0b",
  amberPale: "#fffbeb",
  amberMid: "#fde68a",
  amberDark: "#92400e",
  blue: "#3b82f6",
  bluePale: "#eff6ff",
  blueMid: "#bfdbfe",
  emerald: "#10b981",
  emeraldPale: "#d1fae5",
  emeraldMid: "#6ee7b7",
};

// ── helpers ───────────────────────────────────────────────────────────────────
const formatWH = (
  v: { male?: string; female?: string } | string | undefined | null,
): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  const parts: string[] = [];
  if (v.male) parts.push(`♂ ${v.male}`);
  if (v.female) parts.push(`♀ ${v.female}`);
  return parts.join("  ·  ") || null;
};

const normalizeVisual = (
  vf: VisualFeature[] | string[] | undefined | null,
): VisualFeature[] => {
  if (!vf || vf.length === 0) return [];
  if (typeof vf[0] === "string") {
    return (vf as string[]).map((s) => {
      const idx = s.indexOf(":");
      if (idx > 0)
        return {
          label: s.slice(0, idx).trim(),
          value: s.slice(idx + 1).trim(),
        };
      return { label: "Feature", value: s };
    });
  }
  return vf as VisualFeature[];
};

// ── Corner overlay (scan-style frame corners) ─────────────────────────────────
const ScanCorners = ({
  color = "rgba(168,85,247,0.7)",
}: {
  color?: string;
}) => (
  <>
    {(["tl", "tr", "bl", "br"] as const).map((pos) => (
      <View
        key={pos}
        style={[
          co.corner,
          { borderColor: color },
          pos === "tl" && co.cTL,
          pos === "tr" && co.cTR,
          pos === "bl" && co.cBL,
          pos === "br" && co.cBR,
        ]}
      />
    ))}
  </>
);

const co = StyleSheet.create({
  corner: { position: "absolute", width: 14, height: 14, borderStyle: "solid" },
  cTL: { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 },
  cTR: { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 },
  cBL: { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 },
  cBR: { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },
});

// ── PhysicalComparison ────────────────────────────────────────────────────────
function PhysicalComparison({
  current,
  future,
  futureLabel,
}: {
  current: CurrentHealth | null | undefined;
  future: AgeProfile | null | undefined;
  futureLabel: string;
}) {
  if (!future) return null;

  const curWeight = formatWH(current?.weight);
  const curHeight = formatWH(current?.height);
  const curVisual = normalizeVisual(current?.visual_features);
  const curHealth = (current as any)?.health_notes ?? [];
  const futWeight = formatWH(future.weight);
  const futHeight = formatWH(future.height);
  const futVisual = normalizeVisual(future.visual_features);
  const futHealth = future.health_notes ?? [];

  // Show component as long as future profile exists, even if some fields are empty

  const Col = ({
    label,
    isViolet,
    weight,
    height,
    visual,
    healthNotes,
  }: {
    label: string;
    isViolet: boolean;
    weight: string | null;
    height: string | null;
    visual: VisualFeature[];
    healthNotes: HealthNote[];
  }) => (
    <View style={[pc.col, isViolet ? pc.colViolet : pc.colEmerald]}>
      {/* Header */}
      <View style={pc.colHeader}>
        <View
          style={[pc.colHeaderIcon, isViolet ? pc.iconViolet : pc.iconEmerald]}
        >
          <Feather
            name={isViolet ? "star" : "crosshair"}
            size={10}
            color={isViolet ? C.violet : C.emerald}
          />
        </View>
        <Text
          style={[pc.colHeaderText, { color: isViolet ? C.violet : C.emerald }]}
        >
          {label}
        </Text>
      </View>

      {/* Weight */}
      {weight && (
        <View style={pc.dataBox}>
          <View style={pc.dataBoxRow}>
            <Feather
              name="target"
              size={10}
              color={isViolet ? C.violet : C.textFaint}
            />
            <Text style={pc.dataBoxLabel}>WEIGHT</Text>
          </View>
          {weight.includes("·") ? (
            weight.split("·").map((p, i) => (
              <Text
                key={i}
                style={[
                  pc.dataBoxValue,
                  { color: isViolet ? C.violetDark : C.textMid },
                ]}
              >
                {p.trim()}
              </Text>
            ))
          ) : (
            <Text
              style={[
                pc.dataBoxValue,
                { color: isViolet ? C.violetDark : C.textMid },
              ]}
            >
              {weight}
            </Text>
          )}
        </View>
      )}

      {/* Height */}
      {height && (
        <View style={pc.dataBox}>
          <View style={pc.dataBoxRow}>
            <Feather
              name="arrow-up"
              size={10}
              color={isViolet ? C.violet : C.textFaint}
            />
            <Text style={pc.dataBoxLabel}>HEIGHT</Text>
          </View>
          {height.includes("·") ? (
            height.split("·").map((p, i) => (
              <Text
                key={i}
                style={[
                  pc.dataBoxValue,
                  { color: isViolet ? C.violetDark : C.textMid },
                ]}
              >
                {p.trim()}
              </Text>
            ))
          ) : (
            <Text
              style={[
                pc.dataBoxValue,
                { color: isViolet ? C.violetDark : C.textMid },
              ]}
            >
              {height}
            </Text>
          )}
        </View>
      )}

      {/* Visual Features */}
      {visual.length > 0 && (
        <View style={pc.dataBox}>
          <View style={pc.dataBoxRow}>
            <Feather
              name="eye"
              size={10}
              color={isViolet ? C.violet : C.textFaint}
            />
            <Text style={pc.dataBoxLabel}>VISUAL FEATURES</Text>
          </View>
          {visual.map((f, i) => (
            <View
              key={i}
              style={[
                pc.featureRow,
                i < visual.length - 1 && pc.featureRowBorder,
              ]}
            >
              <Text style={pc.featureLabel}>{f.label}</Text>
              <Text
                style={[
                  pc.featureValue,
                  { color: isViolet ? C.violetDark : C.textMid },
                ]}
                numberOfLines={2}
              >
                {f.value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Health Notes */}
      {healthNotes.length > 0 && (
        <View style={pc.healthBox}>
          <View style={pc.dataBoxRow}>
            <Feather name="alert-triangle" size={10} color={C.amber} />
            <Text style={[pc.dataBoxLabel, { color: "#b45309" }]}>
              WATCH OUT FOR
            </Text>
          </View>
          {healthNotes.map((h, i) => (
            <View key={i} style={pc.healthItem}>
              <View style={pc.healthDot} />
              <Text style={pc.healthText}>
                <Text style={pc.healthIssue}>{h.issue}: </Text>
                {h.note}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={pc.container}>
      <View style={pc.header}>
        <View style={pc.headerIcon}>
          <Feather name="zap" size={11} color={C.violet} />
        </View>
        <Text style={pc.headerTitle}>PHYSICAL CHANGES</Text>
        <View style={pc.headerBadge}>
          <Text style={pc.headerBadgeText}>Today → {futureLabel}</Text>
        </View>
      </View>
      <View style={pc.cols}>
        <Col
          label="Today"
          isViolet={false}
          weight={curWeight}
          height={curHeight}
          visual={curVisual}
          healthNotes={curHealth}
        />
        <Col
          label={futureLabel}
          isViolet={true}
          weight={futWeight}
          height={futHeight}
          visual={futVisual}
          healthNotes={futHealth}
        />
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  headerIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: C.violetPale,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.violetMid,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textMid,
    letterSpacing: 0.8,
  },
  headerBadge: {
    marginLeft: "auto",
    backgroundColor: C.violetPale,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.violetMid,
  },
  headerBadgeText: { fontSize: 9, fontWeight: "600", color: C.violet },
  cols: { flexDirection: "row", padding: 10, gap: 8 },
  col: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, gap: 8 },
  colEmerald: { backgroundColor: "#f8fffe", borderColor: C.emeraldMid },
  colViolet: { backgroundColor: "#faf8ff", borderColor: C.violetMid },
  colHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  colHeaderIcon: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconEmerald: { backgroundColor: C.emeraldPale, borderColor: C.emeraldMid },
  iconViolet: { backgroundColor: C.violetPale, borderColor: C.violetMid },
  colHeaderText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.6 },
  dataBox: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    padding: 8,
    gap: 4,
  },
  dataBoxRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dataBoxLabel: {
    fontSize: 8,
    fontWeight: "600",
    color: C.textFaint,
    letterSpacing: 0.5,
  },
  dataBoxValue: { fontSize: 11, fontWeight: "700" },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4,
    gap: 6,
  },
  featureRowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  featureLabel: {
    fontSize: 8,
    fontWeight: "600",
    color: C.textFaint,
    letterSpacing: 0.3,
    flex: 1,
  },
  featureValue: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "right",
    flex: 1.5,
  },
  healthBox: {
    backgroundColor: C.amberPale,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.amberMid,
    padding: 8,
    gap: 6,
  },
  healthItem: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  healthDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.amber,
    marginTop: 4,
    flexShrink: 0,
  },
  healthText: { flex: 1, fontSize: 10, color: C.textMid, lineHeight: 14 },
  healthIssue: { fontWeight: "700", color: C.amberDark },
});

// ── Image Card — mirrors web's ImageCard ──────────────────────────────────────
const ImageCard = ({
  src,
  label,
  sublabel,
  isToday = false,
  isLoading = false,
}: {
  src: string | null;
  label: string;
  sublabel: string;
  isToday?: boolean;
  isLoading?: boolean;
}) => {
  const imgHeight = Math.round(width - 36) * 0.75; // 4:3 portrait

  return (
    <View style={ic.card}>
      {/* Card header bar */}
      <View style={ic.header}>
        <View
          style={[
            ic.headerIcon,
            isToday ? ic.headerIconGreen : ic.headerIconViolet,
          ]}
        >
          <Feather
            name={isToday ? "camera" : "clock"}
            size={11}
            color={isToday ? C.emerald : C.violet}
          />
        </View>
        <Text style={ic.headerLabel}>{label}</Text>
        {/* Status badge */}
        {!isLoading && !isToday && src && (
          <View style={ic.aiBadge}>
            <View style={ic.aiDot} />
            <Text style={ic.aiText}>AI GENERATED</Text>
          </View>
        )}
        {isToday && (
          <View style={ic.todayBadge}>
            <Text style={ic.todayText}>TODAY</Text>
          </View>
        )}
      </View>

      {/* Image area */}
      <View style={[ic.imgWrap, { height: imgHeight }]}>
        {isLoading ? (
          <View style={ic.loadWrap}>
            <View style={ic.loadIconWrap}>
              <ActivityIndicator size="large" color={C.violet} />
            </View>
            <Text style={ic.loadTitle}>Generating…</Text>
            <Text style={ic.loadSub}>AI processing your dog</Text>
          </View>
        ) : src ? (
          <>
            <Image source={{ uri: src }} style={ic.img} resizeMode="cover" />
            {/* Scan corners */}
            <ScanCorners
              color={
                isToday ? "rgba(16,185,129,0.65)" : "rgba(168,85,247,0.65)"
              }
            />
            {/* Overlay badge */}
            <View style={ic.imgOverlayBadge}>
              <Text
                style={[
                  ic.imgOverlayText,
                  { color: isToday ? C.emerald : C.violet },
                ]}
              >
                {isToday ? "TODAY" : "AI GENERATED"}
              </Text>
            </View>
          </>
        ) : (
          <View style={ic.noImgWrap}>
            <Text style={ic.noImgText}>No image available</Text>
          </View>
        )}
      </View>

      {/* Caption */}
      <View style={ic.caption}>
        <Text style={ic.captionText}>{sublabel}</Text>
      </View>
    </View>
  );
};

const ic = StyleSheet.create({
  card: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  headerIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerIconGreen: {
    backgroundColor: C.emeraldPale,
    borderColor: C.emeraldMid,
  },
  headerIconViolet: { backgroundColor: C.violetPale, borderColor: C.violetMid },
  headerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMid,
    letterSpacing: 0.4,
    flex: 1,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.violetPale,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.violetMid,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.violet },
  aiText: {
    fontSize: 9,
    fontWeight: "700",
    color: C.violet,
    letterSpacing: 0.5,
  },
  todayBadge: {
    backgroundColor: C.emeraldPale,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.emeraldMid,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  todayText: {
    fontSize: 9,
    fontWeight: "700",
    color: C.emerald,
    letterSpacing: 0.5,
  },
  imgWrap: {
    width: "100%",
    backgroundColor: C.borderLight,
    position: "relative",
  },
  img: { width: "100%", height: "100%" },
  loadWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 32,
  },
  loadIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: C.violetPale,
    borderWidth: 1,
    borderColor: C.violetMid,
    alignItems: "center",
    justifyContent: "center",
  },
  loadTitle: { fontSize: 14, fontWeight: "700", color: C.text },
  loadSub: { fontSize: 11, color: C.textSoft },
  noImgWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  noImgText: { fontSize: 12, color: C.textFaint },
  imgOverlayBadge: {
    position: "absolute",
    bottom: 8,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  imgOverlayText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  caption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
  },
  captionText: { fontSize: 12, color: C.textSoft, lineHeight: 18 },
});

// ── Main ViewSimulation ───────────────────────────────────────────────────────
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
  }>({ "1_years": null, "3_years": null });
  const [status, setStatus] = useState<
    "pending" | "generating" | "complete" | "failed"
  >("pending");
  const [isPolling, setIsPolling] = useState(false);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const [ageProfiles, setAgeProfiles] = useState<AgeProfiles | null>(null);
  const [currentHealth, setCurrentHealth] = useState<CurrentHealth | null>(
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
          const initialProfiles = response.data.age_profiles ?? null;
          setAgeProfiles(initialProfiles);
          setCurrentHealth(response.data.current_health ?? null);

          // Start polling if:
          // 1. Still generating (normal case), OR
          // 2. Complete but age_profiles not yet available (race condition:
          //    backend marks "complete" before profiles are saved ~30s later)
          const shouldPoll =
            response.data.status !== "failed" &&
            (response.data.status !== "complete" || initialProfiles === null);
          if (shouldPoll) {
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
    if (!isPolling || pollingAttempts >= MAX_POLLING) {
      if (pollingAttempts >= MAX_POLLING) {
        setStatus("failed");
        setIsPolling(false);
      }
      return;
    }
    const iv = setInterval(async () => {
      try {
        const response = await ApiService.getSimulationStatus(scanId);
        if (response.success && response.data) {
          const newStatus = response.data.status;
          const newProfiles = response.data.age_profiles ?? null;

          setStatus(newStatus);
          setSimulations(response.data.simulations);
          if (newProfiles) setAgeProfiles(newProfiles);
          setPollingAttempts((p) => p + 1);

          // KEY FIX: the backend sets status="complete" BEFORE age_profiles are
          // generated (~30s later). Keep polling until profiles arrive OR we've
          // tried enough times after "complete" to give up gracefully.
          const isDone =
            newStatus === "failed" ||
            (newStatus === "complete" && newProfiles !== null);
          if (isDone) {
            setIsPolling(false);
          }
        }
      } catch {
        setPollingAttempts((p) => p + 1);
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [isPolling, scanId, pollingAttempts]);

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const activeFutureLabel = activeTab === "1" ? "In 1 Year" : "In 3 Years";

  const activeFutureProfile = useMemo<AgeProfile | null>(() => {
    if (!ageProfiles) return null;
    return activeTab === "1"
      ? (ageProfiles["1_year"] ?? null)
      : (ageProfiles["3_years"] ?? null);
  }, [ageProfiles, activeTab]);

  const hasSimulations = !!(simulations["1_years"] || simulations["3_years"]);
  const isGenerating = status === "pending" || status === "generating";
  const activeImage =
    activeTab === "1" ? simulations["1_years"] : simulations["3_years"];

  // ── Info strip data (mirrors web bottom strip) ────────────────────────────
  const infoStrip = [
    { label: "BREED", value: breed || "Unknown", color: C.text },
    { label: "ENGINE", value: "AI Powered", color: C.violet },
    {
      label: "1-YEAR SIM",
      value: simulations["1_years"] ? "Ready" : "Generating",
      color: simulations["1_years"] ? C.green : C.amber,
    },
    {
      label: "3-YEAR SIM",
      value: simulations["3_years"] ? "Ready" : "Generating",
      color: simulations["3_years"] ? C.green : C.amber,
    },
  ];

  // ── LOADING ───────────────────────────────────────────────────────────────
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
            {/* PAGE HEADER */}
            <View style={s.pageHead}>
              <View style={s.statusPill}>
                <View style={s.pulsingDot} />
                <Text style={s.statusLabel}>AGE SIMULATION</Text>
              </View>
              <Text style={s.pageTitle}>{breed || "Your Dog"}</Text>
            </View>

            {/* DISCLAIMER */}
            <View style={s.noteCard}>
              <Feather
                name="alert-triangle"
                size={13}
                color={C.amber}
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={s.noteTitle}>Predictive Simulation</Text>
                <Text style={s.noteText}>
                  This prediction shows your dog 1 and 3 years from today based
                  on current age and breed patterns. Actual aging may vary
                  depending on genetics and environment.
                </Text>
              </View>
            </View>

            {/* ── GENERATING (no images yet) ── */}
            {isGenerating && !hasSimulations && (
              <View style={s.generatingCard}>
                <View style={s.genIconWrap}>
                  <ActivityIndicator size="large" color={C.violet} />
                  <View style={s.genRing} />
                </View>
                <Text style={s.genTitle}>
                  {status === "pending"
                    ? "Preparing simulation…"
                    : "Generating predictions…"}
                </Text>
                <Text style={s.genSub}>
                  Creating AI age progression images. This takes 40–60 seconds.
                </Text>
                <View style={s.genCheckRow}>
                  <Feather name="loader" size={10} color={C.textFaint} />
                  <Text style={s.genCheck}>
                    CHECK {pollingAttempts}/{MAX_POLLING}
                  </Text>
                </View>
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

            {/* ── FAILED ── */}
            {status === "failed" && !hasSimulations && (
              <View style={s.failedCard}>
                <View style={s.failedIcon}>
                  <Feather name="alert-circle" size={28} color={C.red} />
                </View>
                <Text style={s.failedTitle}>Simulation Failed</Text>
                <Text style={s.failedSub}>
                  We couldn't generate the age simulations. Please try again
                  later.
                </Text>
                <TouchableOpacity style={s.backBtnPrimary} onPress={handleBack}>
                  <Feather name="arrow-left" size={13} color={C.white} />
                  <Text style={s.backBtnText}>Back to Results</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── RESULTS ── */}
            {hasSimulations && (
              <>
                {/* Still generating banner */}
                {isGenerating && (
                  <View style={s.genBanner}>
                    <ActivityIndicator size="small" color={C.blue} />
                    <Text style={s.genBannerText}>
                      Still generating remaining images…
                    </Text>
                  </View>
                )}

                {/* Tab selector — mirrors web */}
                <View style={s.tabsWrap}>
                  {(
                    [
                      { id: "1", label: "1 Year View", icon: "star" },
                      { id: "3", label: "3 Year View", icon: "clock" },
                    ] as const
                  ).map((tab) => (
                    <TouchableOpacity
                      key={tab.id}
                      style={[s.tab, activeTab === tab.id && s.tabActive]}
                      onPress={() => setActiveTab(tab.id)}
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

                {/* ── CURRENT IMAGE CARD (mirrors web left card) ── */}
                <ImageCard
                  src={originalImage}
                  label="Current Appearance"
                  sublabel="How your dog looks today"
                  isToday={true}
                />

                {/* ── FUTURE IMAGE CARD (mirrors web right card) ── */}
                <ImageCard
                  key={`future-${activeTab}`}
                  src={activeImage}
                  label={activeFutureLabel}
                  sublabel={
                    activeTab === "1"
                      ? "How your dog will look one year from today"
                      : "How your dog will look three years from today"
                  }
                  isLoading={!activeImage}
                />

                {/* ── PHYSICAL COMPARISON — same gate as web: activeImage && ── */}
                {activeImage && (
                  <PhysicalComparison
                    key={`phys-${activeTab}`}
                    current={currentHealth}
                    future={activeFutureProfile}
                    futureLabel={activeFutureLabel}
                  />
                )}

                {/* Spinner — only while actively generating */}
                {activeImage && !activeFutureProfile && isGenerating && (
                  <View style={s.physLoadingCard}>
                    <ActivityIndicator size="small" color={C.textFaint} />
                    <Text style={s.physLoadingText}>
                      Physical characteristics are being calculated…
                    </Text>
                  </View>
                )}

                {/* Unavailable — status complete but no age profiles (old scan) */}
                {activeImage &&
                  !activeFutureProfile &&
                  !isGenerating &&
                  status !== "failed" && (
                    <View style={s.physUnavailCard}>
                      <View style={s.physUnavailIcon}>
                        <Feather name="info" size={14} color={C.textFaint} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.physUnavailTitle}>
                          Physical Profile Unavailable
                        </Text>
                        <Text style={s.physUnavailSub}>
                          Weight, height and visual features were not generated
                          for this scan. New scans include full physical data.
                        </Text>
                      </View>
                    </View>
                  )}

                {/* ── BOTTOM INFO STRIP — mirrors web's 4-stat grid ── */}
                <View style={s.infoStrip}>
                  {infoStrip.map((stat, i) => (
                    <View key={i} style={s.infoStripItem}>
                      <Text style={s.infoStripLabel}>{stat.label}</Text>
                      <Text
                        style={[s.infoStripValue, { color: stat.color }]}
                        numberOfLines={1}
                      >
                        {stat.value}
                      </Text>
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
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: C.violetPale,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.violetMid,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.violet,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: C.violet,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.amberMid,
    padding: 12,
    alignItems: "flex-start",
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: C.amberDark,
    marginBottom: 2,
  },
  noteText: { fontSize: 11, color: C.amberDark, lineHeight: 17, opacity: 0.85 },

  // ── Generating ──
  generatingCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  genIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.violetPale,
    borderWidth: 1,
    borderColor: C.violetMid,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  genRing: {
    position: "absolute",
    inset: -8,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.2)",
  } as any,
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
  genCheckRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  genCheck: {
    fontSize: 10,
    color: C.textFaint,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    letterSpacing: 0.6,
  },
  genDots: { flexDirection: "row", gap: 6 },
  genDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.violet },

  // ── Failed ──
  failedCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: C.redPale,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.redMid,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  failedIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.green,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 4,
  },
  backBtnText: { fontSize: 13, fontWeight: "700", color: C.white },

  // ── Still generating banner ──
  genBanner: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: C.bluePale,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.blueMid,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  genBannerText: { fontSize: 12, color: C.blue, fontWeight: "600" },

  // ── Tab selector ──
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
  tabTextActive: { color: C.violet, fontWeight: "700" },

  // ── Physical loading hint ──
  physLoadingCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  physLoadingText: {
    fontSize: 11,
    color: C.textFaint,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    letterSpacing: 0.3,
  },
  physUnavailCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  physUnavailIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  physUnavailTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMid,
    marginBottom: 3,
  },
  physUnavailSub: {
    fontSize: 11,
    color: C.textFaint,
    lineHeight: 17,
  },

  // ── Bottom info strip — mirrors web's 4-stat grid ──
  infoStrip: {
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoStripItem: {
    width: (width - 36 - 8) / 2 - 4,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoStripLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: C.textFaint,
    letterSpacing: 0.7,
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  infoStripValue: { fontSize: 13, fontWeight: "700" },

  // ── Loading screen ──
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
