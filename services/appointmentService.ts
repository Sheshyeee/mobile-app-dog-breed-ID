import axios from "axios";
import authService from "./authService";

const API_BASE_URL = "https://petbreed-id-main-7penqx.free.laravel.cloud/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: "application/json", "ngrok-skip-browser-warning": "true" },
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await authService.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface AppointmentResult {
  id: number;
  scan_id: string;
  breed: string;
  confidence: number;
  image: string;
}
export interface Appointment {
  id: number;
  scan_id: string;
  appointment_date: string;
  appointment_time: string;
  vet_name: string;
  reason: string;
  notes?: string;
  status: "pending" | "accepted" | "rejected";
  rejection_reason?: string;
  initiated_by: "clinic" | "user" | null;
  result?: AppointmentResult;
  created_at: string;
}
export interface AppointmentResponse {
  success: boolean;
  appointments?: Appointment[];
  data?: Appointment;
  message?: string;
}
export interface RequestAppointmentPayload {
  preferred_date: string;
  preferred_time: string;
  reason: string;
  notes?: string;
}
export interface UpdateStatusPayload {
  status: "accepted" | "rejected";
  rejection_reason?: string;
}

class AppointmentService {
  async getAppointments(): Promise<AppointmentResponse> {
    try {
      const r = await api.get<AppointmentResponse>("/appointments");
      return r.data;
    } catch (e: any) {
      return {
        success: false,
        message: e.response?.data?.message || "Failed to fetch appointments",
      };
    }
  }
  async requestAppointment(
    payload: RequestAppointmentPayload,
  ): Promise<AppointmentResponse> {
    try {
      const r = await api.post<AppointmentResponse>(
        "/appointments/request",
        payload,
      );
      return r.data;
    } catch (e: any) {
      const errors = e.response?.data?.errors;
      if (errors) {
        const k = Object.keys(errors)[0];
        return {
          success: false,
          message: errors[k]?.[0] || "Validation failed",
        };
      }
      return {
        success: false,
        message: e.response?.data?.message || "Failed to submit",
      };
    }
  }
  async updateStatus(
    id: number,
    payload: UpdateStatusPayload,
  ): Promise<AppointmentResponse> {
    try {
      const r = await api.post<AppointmentResponse>(
        `/appointments/${id}/status`,
        payload,
      );
      return r.data;
    } catch (e: any) {
      return {
        success: false,
        message: e.response?.data?.message || "Failed to update status",
      };
    }
  }
  async deleteAppointment(id: number): Promise<AppointmentResponse> {
    try {
      const r = await api.delete<AppointmentResponse>(`/appointments/${id}`);
      return r.data;
    } catch (e: any) {
      return {
        success: false,
        message: e.response?.data?.message || "Failed to delete",
      };
    }
  }
}
export default new AppointmentService();
