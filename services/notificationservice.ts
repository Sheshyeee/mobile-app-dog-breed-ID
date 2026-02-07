import axios from "axios";
import authService from "./authService";

const API_BASE_URL =
  "https://gloomily-meritorious-giuseppe.ngrok-free.dev/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 30000,
});

// Add auth token to all requests
api.interceptors.request.use(async (config) => {
  const token = await authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: {
    scan_id?: string;
    breed?: string;
    original_breed?: string;
    confidence?: number;
    image?: string;
  };
  read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationResponse {
  success: boolean;
  notifications?: {
    data: Notification[];
    current_page: number;
    last_page: number;
    total: number;
  };
  count?: number;
  message?: string;
}

class NotificationService {
  /**
   * Get all notifications for the current user
   */
  async getNotifications(page: number = 1): Promise<NotificationResponse> {
    try {
      const response = await api.get<NotificationResponse>(
        `/notifications?page=${page}`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Fetch Notifications Error:", error);
      return {
        success: false,
        message: "Failed to fetch notifications",
      };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<NotificationResponse> {
    try {
      const response = await api.get<NotificationResponse>(
        "/notifications/unread-count",
      );
      return response.data;
    } catch (error: any) {
      console.error("Fetch Unread Count Error:", error);
      return {
        success: false,
        count: 0,
        message: "Failed to fetch unread count",
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number): Promise<NotificationResponse> {
    try {
      const response = await api.post<NotificationResponse>(
        `/notifications/${notificationId}/read`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Mark As Read Error:", error);
      return {
        success: false,
        message: "Failed to mark notification as read",
      };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<NotificationResponse> {
    try {
      const response = await api.post<NotificationResponse>(
        "/notifications/read-all",
      );
      return response.data;
    } catch (error: any) {
      console.error("Mark All As Read Error:", error);
      return {
        success: false,
        message: "Failed to mark all notifications as read",
      };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(
    notificationId: number,
  ): Promise<NotificationResponse> {
    try {
      const response = await api.delete<NotificationResponse>(
        `/notifications/${notificationId}`,
      );
      return response.data;
    } catch (error: any) {
      console.error("Delete Notification Error:", error);
      return {
        success: false,
        message: "Failed to delete notification",
      };
    }
  }
}

export default new NotificationService();
