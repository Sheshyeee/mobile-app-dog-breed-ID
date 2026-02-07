import axios from "axios";
import { Platform } from "react-native";
import authService from "./authService";

const API_BASE_URL =
  "https://gloomily-meritorious-giuseppe.ngrok-free.dev/api/v1";

// Axios instance for GET requests (Dashboard, History)
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 60000,
});

// Add auth token to all requests
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

// NEW: Simulation response interface
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
  };
  message?: string;
}

// NEW: Simulation status response interface
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
  };
  message?: string;
}

class ApiService {
  /**
   * Analyze pet image
   */
  async analyzeImage(imageUri: string): Promise<AnalysisResponse> {
    try {
      console.log("🔄 Starting image upload...");

      // Get auth token
      const token = await authService.getToken();
      if (!token) {
        return {
          success: false,
          message: "Not authenticated. Please sign in.",
        };
      }

      // 1. Android URI Fix: Ensure it starts with file://
      let cleanUri = imageUri;
      if (
        Platform.OS === "android" &&
        !cleanUri.startsWith("file://") &&
        !cleanUri.startsWith("content://")
      ) {
        cleanUri = `file://${cleanUri}`;
      }

      console.log("📁 Clean URI:", cleanUri);

      // 2. Get Filename & Type
      const filename = cleanUri.split("/").pop() || "photo.jpg";
      const match = /\.(\w+)$/.exec(filename.toLowerCase());
      const ext = match ? match[1] : "jpg";

      let mimeType = "image/jpeg";
      if (ext === "png") mimeType = "image/png";
      if (ext === "webp") mimeType = "image/webp";

      // 3. Create FormData
      const formData = new FormData();
      formData.append("image", {
        uri: cleanUri,
        name: filename,
        type: mimeType,
      } as any);

      console.log(`📤 Uploading to ${API_BASE_URL}/analyze`);

      // 4. Use Fetch (Better for file uploads in React Native)
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
        console.error("🔴 Server Error:", data);
        return {
          success: false,
          message: data.message || "Upload failed",
          errors: data.errors,
        };
      }

      console.log("✅ Success:", data);
      return data;
    } catch (error: any) {
      console.error("❌ Upload Error:", error);
      return {
        success: false,
        message: error.message || "Network request failed",
      };
    }
  }

  /**
   * Get result by scan ID
   */
  async getResult(scanId: string): Promise<ResultResponse> {
    try {
      const response = await api.get<ResultResponse>(`/results/${scanId}`);
      return response.data;
    } catch (error: any) {
      console.error("Fetch Result Error:", error);
      return {
        success: false,
        message: "Failed to fetch result",
      };
    }
  }

  /**
   * NEW: Get simulation data by scan ID
   */
  async getSimulation(scanId: string): Promise<SimulationResponse> {
    try {
      const response = await api.get<SimulationResponse>(
        `/results/${scanId}/simulation`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Fetch Simulation Error:", error);
      return {
        success: false,
        message: "Failed to fetch simulation data",
      };
    }
  }

  /**
   * NEW: Poll simulation status
   */
  async getSimulationStatus(scanId: string): Promise<SimulationStatusResponse> {
    try {
      const response = await api.get<SimulationStatusResponse>(
        `/results/${scanId}/simulation-status`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Fetch Simulation Status Error:", error);
      return {
        success: false,
        message: "Failed to fetch simulation status",
      };
    }
  }

  /**
   * Get health risk data
   */
  async getHealthRisk(scanId: string) {
    try {
      const response = await api.get(`/results/${scanId}/health-risk`);
      return response.data;
    } catch (error) {
      return { success: false, message: "Failed to fetch health data" };
    }
  }

  /**
   * Get origin history data
   */
  async getOriginHistory(scanId: string) {
    try {
      const response = await api.get(`/results/${scanId}/origin_history`);
      return response.data;
    } catch (error) {
      return { success: false, message: "Failed to fetch origin history data" };
    }
  }

  /**
   * Get recent results
   */
  async getRecentResults(limit: number = 10): Promise<{
    success: boolean;
    data?: Array<{
      id: number;
      scan_id: string;
      image_url: string;
      breed: string;
      confidence: number;
      created_at: string;
      status?: "pending" | "verified";
    }>;
    message?: string;
  }> {
    try {
      const response = await api.get(`/results?limit=${limit}`);
      return response.data;
    } catch (error: any) {
      console.error("Fetch Recent Results Error:", error);
      return {
        success: false,
        message: "Failed to fetch scan history",
      };
    }
  }
}

export default new ApiService();
