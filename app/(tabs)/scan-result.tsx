import ApiService from "@/services/api";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type PredictionResult = {
  breed: string;
  confidence: number;
};

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

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scanId = params.scan_id;

  useEffect(() => {
    const fetchResult = async () => {
      const scanId = params.scan_id as string;

      if (!scanId) {
        setError("No scan ID provided");
        setLoading(false);
        return;
      }

      try {
        console.log("Fetching result for scan_id:", scanId);
        const response = await ApiService.getResult(scanId);

        if (response.success && response.data) {
          console.log("Result fetched successfully:", response.data);
          setResult(response.data as Result);
        } else {
          setError(response.message || "Failed to load results");
        }
      } catch (err: any) {
        console.error("Error fetching result:", err);
        setError("Failed to load results. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [params.scan_id]);

  // FIXED: Better filtering and validation of predictions
  const filteredPredictions = React.useMemo(() => {
    if (!result?.top_predictions) return [];

    return result.top_predictions.filter((prediction) => {
      // Remove invalid entries
      if (!prediction || !prediction.breed) return false;

      const breedLower = prediction.breed.toLowerCase().trim();

      // Filter out placeholder/invalid breeds
      const invalidBreeds = [
        "other breeds",
        "other breed",
        "alternative 1",
        "alternative 2",
        "alternative 3",
        "alternative",
        "unknown",
      ];

      if (invalidBreeds.includes(breedLower)) return false;

      // Must have positive confidence
      if (!prediction.confidence || prediction.confidence <= 0) return false;

      // Don't show if it's the same as the primary breed
      if (result?.breed && breedLower === result.breed.toLowerCase().trim()) {
        return false;
      }

      return true;
    });
  }, [result]);

  // Sort by confidence and take top 3
  const topAlternatives = React.useMemo(() => {
    return [...filteredPredictions]
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 3);
  }, [filteredPredictions]);

  const ProgressBar = ({ value }: { value: number }) => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { width: `${value}%` }]} />
    </View>
  );

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Analyzing your pet...</Text>
          <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error State
  if (error || !result) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorMessage}>{error || "No results found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.push("/scan")}
          >
            <Feather name="refresh-cw" size={20} color="#ffffff" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Success State - Display Results
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push("/scan")}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Scan Results</Text>
            <Text style={styles.headerSubtitle}>
              Here's what we found about your pet
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Primary Result Card */}
          <View style={styles.primaryCard}>
            <Image
              source={{
                uri: result.image_url || `https://via.placeholder.com/400`,
              }}
              style={styles.petImage}
              resizeMode="cover"
            />
            <View style={styles.primaryCardContent}>
              <View style={styles.badge}>
                <Feather name="award" size={14} color="#ffffff" />
                <Text style={styles.badgeText}>Primary Match</Text>
              </View>
              <Text style={styles.breedName}>{result.breed}</Text>
              <Text style={styles.insightDescription}>
                {result.description}
              </Text>
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>Confidence Score</Text>
                <Text style={styles.confidenceValue}>
                  {Math.round(result.confidence)}%
                </Text>
              </View>
              <ProgressBar value={result.confidence} />
              <Text style={styles.scanId}>Scan ID: {result.scan_id}</Text>
            </View>
          </View>

          {/* FIXED: Top Breeds Card - Only show if there are valid alternatives */}
          {topAlternatives.length > 0 && (
            <View style={styles.topBreedsCard}>
              <View style={styles.topBreedsHeader}>
                <Feather name="list" size={20} color="#60a5fa" />
                <Text style={styles.topBreedsTitle}>Other Possible Breeds</Text>
              </View>
              {topAlternatives.map((prediction, index) => (
                <View
                  key={`${prediction.breed}-${index}`}
                  style={styles.predictionCard}
                >
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.predictionContent}>
                    <Text style={styles.predictionBreed}>
                      {prediction.breed}
                    </Text>
                    <View style={styles.predictionRow}>
                      <View style={styles.predictionProgressContainer}>
                        <View
                          style={[
                            styles.predictionProgressBar,
                            { width: `${prediction.confidence}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.predictionConfidence}>
                        {Math.round(prediction.confidence)}%
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* FIXED: Show message when only one confident prediction */}
          {topAlternatives.length === 0 && result.confidence >= 80 && (
            <View style={styles.highConfidenceCard}>
              <View style={styles.highConfidenceContent}>
                <Feather name="check-circle" size={24} color="#10b981" />
                <View style={styles.highConfidenceTextContainer}>
                  <Text style={styles.highConfidenceTitle}>
                    High Confidence Identification
                  </Text>
                  <Text style={styles.highConfidenceText}>
                    Our system is very confident about this breed
                    identification.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Explore More Section */}
          <Text style={styles.exploreTitle}>Explore More Insights</Text>

          <TouchableOpacity
            style={styles.insightCard}
            onPress={() =>
              router.push({
                pathname: "/view-simulation",
                params: { scan_id: scanId },
              })
            }
          >
            <View style={[styles.iconContainer, styles.violetBg]}>
              <Feather name="clock" size={32} color="#7c3aed" />
            </View>
            <Text style={styles.insightTitle}>Future Appearance</Text>
            <Text style={styles.insightDescription}>
              See how your pet will look as they age over the years
            </Text>
            <View style={styles.insightButton}>
              <Text style={styles.insightButtonText}>View Simulation</Text>
              <Feather name="arrow-right" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.insightCard}
            onPress={() =>
              router.push({
                pathname: "/health-risk",
                params: { scan_id: scanId },
              })
            }
          >
            <View style={[styles.iconContainer, styles.pinkBg]}>
              <Feather name="activity" size={32} color="#ec4899" />
            </View>
            <Text style={styles.insightTitle}>Health Risk</Text>
            <Text style={styles.insightDescription}>
              Learn about breed-specific health considerations
            </Text>
            <View style={styles.insightButton}>
              <Text style={styles.insightButtonText}>View Risk</Text>
              <Feather name="arrow-right" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.insightCard}
            onPress={() =>
              router.push({
                pathname: "/origin",
                params: { scan_id: scanId },
              })
            }
          >
            <View style={[styles.iconContainer, styles.blueBg]}>
              <Feather name="globe" size={32} color="#3b82f6" />
            </View>
            <Text style={styles.insightTitle}>Origin History</Text>
            <Text style={styles.insightDescription}>
              Discover the history and origin of your pet's breed
            </Text>
            <View style={styles.insightButton}>
              <Text style={styles.insightButtonText}>Explore History</Text>
              <Feather name="arrow-right" size={16} color="#ffffff" />
            </View>
          </TouchableOpacity>

          {/* New Scan Button */}
          <TouchableOpacity
            style={styles.newScanButton}
            onPress={() => router.push("/scan")}
          >
            <Feather name="camera" size={20} color="#ffffff" />
            <Text style={styles.newScanButtonText}>Scan Another Pet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#9ca3af",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: "center",
    gap: 10,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  primaryCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
    marginBottom: 16,
  },
  petImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
  },
  primaryCardContent: {
    gap: 10,
  },
  badge: {
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  breedName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
  },
  confidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidenceLabel: {
    fontSize: 14,
    color: "#9ca3af",
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#60a5fa",
  },
  progressContainer: {
    width: "100%",
    height: 10,
    backgroundColor: "#2a2a2a",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 5,
  },
  scanId: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },
  topBreedsCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 20,
    marginBottom: 16,
    gap: 12,
  },
  topBreedsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  topBreedsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  predictionCard: {
    backgroundColor: "#0f0f0f",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#60a5fa",
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#60a5fa",
  },
  predictionContent: {
    flex: 1,
    gap: 6,
  },
  predictionBreed: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  predictionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  predictionProgressContainer: {
    flex: 1,
    height: 6,
    backgroundColor: "#2a2a2a",
    borderRadius: 3,
    overflow: "hidden",
  },
  predictionProgressBar: {
    height: "100%",
    backgroundColor: "#60a5fa",
    borderRadius: 3,
  },
  predictionConfidence: {
    fontSize: 14,
    fontWeight: "600",
    color: "#d1d5db",
    width: 45,
    textAlign: "right",
  },
  highConfidenceCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 20,
    marginBottom: 16,
  },
  highConfidenceContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  highConfidenceTextContainer: {
    flex: 1,
    gap: 4,
  },
  highConfidenceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  highConfidenceText: {
    fontSize: 14,
    color: "#9ca3af",
    lineHeight: 20,
  },
  exploreTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 8,
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 20,
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  violetBg: {
    backgroundColor: "#1e1b4b",
  },
  pinkBg: {
    backgroundColor: "#500724",
  },
  blueBg: {
    backgroundColor: "#1e3a8a",
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  insightDescription: {
    fontSize: 14,
    color: "#9ca3af",
    lineHeight: 20,
  },
  insightButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 10,
    marginTop: 4,
  },
  insightButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  newScanButton: {
    flexDirection: "row",
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  newScanButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ScanResults;
