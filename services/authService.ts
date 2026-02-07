import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

const API_BASE_URL =
  "https://gloomily-meritorious-giuseppe.ngrok-free.dev/api/v1";

const WEB_BASE_URL = "https://gloomily-meritorious-giuseppe.ngrok-free.dev";

// ============================================================================
// INTERFACES
// ============================================================================

export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  is_admin: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: { user: User; token: string };
  error?: string;
}

// ============================================================================
// AUTH SERVICE (EXPO GO COMPATIBLE)
// ============================================================================

class AuthService {
  private token: string | null = null;

  /**
   * Initialize auth state from storage
   */
  async init(): Promise<User | null> {
    const token = await AsyncStorage.getItem("auth_token");
    if (token) {
      this.token = token;
      return await this.getCurrentUser();
    }
    return null;
  }

  /**
   * Sign in with Google using web browser
   */
  async signInWithGoogle(): Promise<AuthResponse> {
    try {
      console.log("🔐 Starting Google Sign-In...");

      // Build the redirect URL
      const redirectUrl = Linking.createURL("auth-success");
      console.log("📱 Redirect URL:", redirectUrl);

      // Build the Google OAuth URL with mobile redirect and mobile flag
      const googleAuthUrl = `${WEB_BASE_URL}/auth/google?mobile=1&redirect_to=${encodeURIComponent(redirectUrl)}`;
      console.log("🌐 Opening browser:", googleAuthUrl);

      // Open browser for Google auth
      const result = await WebBrowser.openAuthSessionAsync(
        googleAuthUrl,
        redirectUrl,
      );

      console.log("🔄 Browser result:", result);

      if (result.type === "cancel") {
        return {
          success: false,
          message: "Sign-in cancelled",
        };
      }

      if (result.type !== "success") {
        return {
          success: false,
          message: "Sign-in failed",
        };
      }

      // Extract token from URL
      const url = result.url;
      const tokenMatch = url.match(/[?&]token=([^&]+)/);

      if (!tokenMatch) {
        return {
          success: false,
          message: "No authentication token received",
        };
      }

      // Decode the URL-encoded token
      const token = decodeURIComponent(tokenMatch[1]);
      console.log("✅ Token received:", token);

      // Save token
      this.token = token;
      await AsyncStorage.setItem("auth_token", token);

      // Get user info
      const user = await this.getCurrentUser();

      if (user) {
        console.log("✅ Authentication successful!");
        return {
          success: true,
          data: { user, token },
        };
      }

      return {
        success: false,
        message: "Failed to get user info",
      };
    } catch (error: any) {
      console.error("❌ Google Sign-In Error:", error);
      return {
        success: false,
        message: error.message || "Sign-in failed",
      };
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      if (!this.token) {
        this.token = await AsyncStorage.getItem("auth_token");
      }
      if (!this.token) return null;

      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (response.data.success) {
        await AsyncStorage.setItem(
          "user",
          JSON.stringify(response.data.data.user),
        );
        return response.data.data.user;
      }
      return null;
    } catch (error: any) {
      console.error("Get user error:", error);
      if (error.response?.status === 401) {
        await this.logout();
      }
      return null;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      if (this.token) {
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: "application/json",
              "ngrok-skip-browser-warning": "true",
            },
          },
        );
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("user");
      this.token = null;
    }
  }

  /**
   * Get stored auth token
   */
  async getToken(): Promise<string | null> {
    if (!this.token) {
      this.token = await AsyncStorage.getItem("auth_token");
    }
    return this.token;
  }

  /**
   * Check if user has valid token
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    const user = await this.getCurrentUser();
    return !!user;
  }
}

export default new AuthService();
