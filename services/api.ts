import axios from "axios";
import { Platform } from "react-native";
import authService from "./authService";

const API_BASE_URL = "https://petbreed-id-main-7penqx.free.laravel.cloud/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 60000,
});

api.interceptors.request.use(async (config) => {
  const token = await authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface PredictionResult {
  breed: string;
  confidence: number;
}

export interface AnalysisResponse {
  success: boolean;
  data?: {
    scan_id: string;
    breed: string;
    confidence: number;
    top_predictions: PredictionResult[];
    image_url: string;
    created_at: string;
  };
  message?: string;
  errors?: any;
}

export interface ResultResponse {
  success: boolean;
  data?: {
    scan_id: string;
    breed: string;
    confidence: number;
    top_predictions: PredictionResult[];
    image_url: string;
    description: string;
    created_at: string;
  };
  message?: string;
}

// ── Physical / age data types ─────────────────────────────────────────────────
export interface VisualFeature {
  label: string;
  value: string;
}

export interface HealthNote {
  issue: string;
  note: string;
}

export interface WeightHeight {
  male?: string;
  female?: string;
}

export interface AgeProfile {
  weight?: WeightHeight | string;
  height?: WeightHeight | string;
  visual_features?: VisualFeature[] | string[];
  health_notes?: HealthNote[];
}

export interface AgeProfiles {
  "1_year"?: AgeProfile;
  "3_years"?: AgeProfile;
}

export interface CurrentHealth {
  weight?: WeightHeight | string;
  height?: WeightHeight | string;
  visual_features?: VisualFeature[] | string[];
  health_notes?: HealthNote[];
  lifespan?: string;
}

// ── Simulation interfaces ─────────────────────────────────────────────────────
export interface SimulationResponse {
  success: boolean;
  data?: {
    breed: string;
    original_image: string;
    simulations: {
      "1_years": string | null;
      "3_years": string | null;
    };
    status: "pending" | "generating" | "complete" | "failed";
    age_profiles?: AgeProfiles | null;
    current_health?: CurrentHealth | null;
  };
  message?: string;
}

export interface SimulationStatusResponse {
  success: boolean;
  data?: {
    status: "pending" | "generating" | "complete" | "failed";
    simulations: {
      "1_years": string | null;
      "3_years": string | null;
    };
    has_1_year: boolean;
    has_3_years: boolean;
    age_profiles?: AgeProfiles | null;
  };
  message?: string;
}

export interface DeleteScanResponse {
  success: boolean;
  message?: string;
}

export interface ScanHistoryItem {
  id: number;
  scan_id: string;
  image_url: string;
  breed: string;
  confidence: number;
  created_at: string;
  status?: "pending" | "verified";
}

export interface ScanStats {
  total: number;
  verified_count: number;
  pending_count: number;
  avg_confidence: number;
}

export interface PaginationMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
  has_more: boolean;
}

export interface RecentResultsResponse {
  success: boolean;
  data?: ScanHistoryItem[];
  stats?: ScanStats;
  pagination?: PaginationMeta;
  message?: string;
}

class ApiService {
  async analyzeImage(imageUri: string): Promise<AnalysisResponse> {
    try {
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          message: "Not authenticated. Please sign in.",
        };
      }

      let cleanUri = imageUri;
      if (
        Platform.OS === "android" &&
        !cleanUri.startsWith("file://") &&
        !cleanUri.startsWith("content://")
      ) {
        cleanUri = `file://${cleanUri}`;
      }

      const filename = cleanUri.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(filename.toLowerCase());
      const ext = match ? match[1] : "jpg";
      let mimeType = "image/jpeg";
      if (ext === "png") mimeType = "image/png";
      if (ext === "webp") mimeType = "image/webp";

      const formData = new FormData();
      formData.append("image", {
        uri: cleanUri,
        name: filename,
        type: mimeType,
      } as any);

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Upload failed",
          errors: data.errors,
        };
      }
      return data;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Network request failed",
      };
    }
  }

  async getResult(scanId: string): Promise<ResultResponse> {
    try {
      const response = await api.get<ResultResponse>(`/results/${scanId}`);
      return response.data;
    } catch (error: any) {
      return { success: false, message: "Failed to fetch result" };
    }
  }

  async getSimulation(scanId: string): Promise<SimulationResponse> {
    try {
      const response = await api.get<SimulationResponse>(
        `/results/${scanId}/simulation`,
      );
      return response.data;
    } catch (error: any) {
      return { success: false, message: "Failed to fetch simulation data" };
    }
  }

  async getSimulationStatus(scanId: string): Promise<SimulationStatusResponse> {
    try {
      const response = await api.get<SimulationStatusResponse>(
        `/results/${scanId}/simulation-status`,
      );
      return response.data;
    } catch (error: any) {
      return { success: false, message: "Failed to fetch simulation status" };
    }
  }

  async getHealthRisk(scanId: string) {
    try {
      const response = await api.get(`/results/${scanId}/health-risk`);
      return response.data;
    } catch (error) {
      return { success: false, message: "Failed to fetch health data" };
    }
  }

  async getOriginHistory(scanId: string) {
    try {
      const response = await api.get(`/results/${scanId}/origin_history`);
      return response.data;
    } catch (error) {
      return { success: false, message: "Failed to fetch origin history data" };
    }
  }

  async getRecentResults(
    page: number = 1,
    perPage: number = 20,
  ): Promise<RecentResultsResponse> {
    try {
      const response = await api.get(
        `/results?page=${page}&per_page=${perPage}`,
      );
      return response.data;
    } catch (error: any) {
      return { success: false, message: "Failed to fetch scan history" };
    }
  }

  async deleteScan(scanId: number): Promise<DeleteScanResponse> {
    try {
      const response = await api.delete<DeleteScanResponse>(
        `/results/${scanId}`,
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete scan",
      };
    }
  }
}

export default new ApiService();
