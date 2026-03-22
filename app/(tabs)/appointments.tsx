import appointmentService, {
  Appointment,
} from "../../services/appointmentService";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── DESIGN TOKENS (identical to scan page) ──────────────────────────────────
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
  amberPale: "#fffbeb",
  purple: "#9333ea",
  purplePale: "#f3e8ff",
  purpleMid: "#d8b4fe",
  blue: "#2563eb",
  bluePale: "#eff6ff",
  shadow: "rgba(22,163,74,0.12)",
};

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS: Record<"pending" | "accepted" | "rejected", { label: string; color: string; bg: string; icon: "clock" | "check-circle" | "x-circle" }> = {
  pending:  { label: "Awaiting Response", color: C.amber,  bg: C.amberPale,  icon: "clock"         },
  accepted: { label: "Confirmed",         color: C.green,  bg: C.greenPale,  icon: "check-circle"  },
  rejected: { label: "Declined",          color: C.red,    bg: C.redPale,    icon: "x-circle"      },
};

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <View style={sh.row}>
      <View style={[sh.dot, { backgroundColor: color }]} />
      <Text style={[sh.label, { color }]}>{title.toUpperCase()} — {count}</Text>
      <View style={[sh.line, { backgroundColor: color + "33" }]} />
    </View>
  );
}
const sh = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  dot:   { width: 7, height: 7, borderRadius: 3.5 },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 0.7 },
  line:  { flex: 1, height: 1 },
});

// ─── REJECT REASON MODAL ──────────────────────────────────────────────────────
function RejectModal({
  visible, loading, onClose, onConfirm,
}: { visible: boolean; loading: boolean; onClose: () => void; onConfirm: (r: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={rej.overlay}>
        <View style={rej.card}>
          <Text style={rej.title}>Reason for Declining</Text>
          <TextInput
            style={rej.input}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Schedule conflict, will reschedule…"
            placeholderTextColor={C.textFaint}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={rej.row}>
            <TouchableOpacity style={rej.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={rej.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[rej.confirmBtn, loading && { opacity: 0.55 }]}
              onPress={() => onConfirm(reason)}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color={C.white} />
                : <Text style={rej.confirmText}>Confirm Decline</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const rej = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  card:       { width: "100%", backgroundColor: C.white, borderRadius: 20, padding: 20 },
  title:      { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 12 },
  input:      { backgroundColor: C.offWhite, borderRadius: 12, padding: 12, fontSize: 13, color: C.text, borderWidth: 1, borderColor: C.border, minHeight: 80, marginBottom: 14, textAlignVertical: "top" },
  row:        { flexDirection: "row", gap: 10 },
  cancelBtn:  { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  cancelText: { fontSize: 13, fontWeight: "600", color: C.textSoft },
  confirmBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, backgroundColor: C.red },
  confirmText:{ fontSize: 13, fontWeight: "700", color: C.white },
});

// ─── APPOINTMENT CARD ─────────────────────────────────────────────────────────
function AppointmentCard({
  appt, onRespond, onDelete, responding,
}: {
  appt: Appointment;
  onRespond: (id: number, status: "accepted" | "rejected", reason?: string) => void;
  onDelete: (id: number) => void;
  responding: number | null;
}) {
  const [showReject, setShowReject] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const st       = STATUS[appt.status as "pending" | "accepted" | "rejected"];
  const isClinic = (appt.initiated_by ?? "clinic") === "clinic";
  const isPending= appt.status === "pending";
  const canDelete=
    appt.initiated_by === "user" ||
    (appt.initiated_by === "clinic" && appt.status !== "pending");

  const handleDeletePress = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    onDelete(appt.id);
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <RejectModal
        visible={showReject}
        loading={responding === appt.id}
        onClose={() => setShowReject(false)}
        onConfirm={(reason) => { setShowReject(false); onRespond(appt.id, "rejected", reason); }}
      />

      <View style={ac.card}>
        {/* Header row */}
        <View style={ac.header}>
          <View style={ac.headerBadges}>
            {/* Source */}
            <View style={[ac.badge, { backgroundColor: isClinic ? C.bluePale : C.purplePale }]}>
              <View style={[ac.badgeDot, { backgroundColor: isClinic ? C.blue : C.purple }]} />
              <Text style={[ac.badgeText, { color: isClinic ? C.blue : C.purple }]}>
                {isClinic ? "From Clinic" : "Your Request"}
              </Text>
            </View>
            {/* Status */}
            <View style={[ac.badge, { backgroundColor: st.bg }]}>
              <Feather name={st.icon} size={10} color={st.color} />
              <Text style={[ac.badgeText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>

          {canDelete && (
            <TouchableOpacity
              style={[ac.deleteBtn, confirmDelete && ac.deleteBtnActive]}
              onPress={handleDeletePress}
            >
              <Feather name="trash-2" size={13} color={confirmDelete ? C.white : C.textFaint} />
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <View style={ac.titleWrap}>
          <Text style={ac.breed}>
            {appt.result?.breed ?? (isClinic ? "Consultation" : "Your Request")}
          </Text>
          <Text style={ac.scanId}>#{appt.scan_id}</Text>
        </View>

        {/* Details grid */}
        <View style={ac.grid}>
          {[
            { icon: "calendar" as const, label: "Date",   value: fmtDate(appt.appointment_date) },
            { icon: "clock"    as const, label: "Time",   value: appt.appointment_time },
            { icon: "user"     as const, label: "Vet",    value: appt.vet_name },
            { icon: "activity" as const, label: "Reason", value: appt.reason },
          ].map((item, i) => (
            <View key={i} style={ac.cell}>
              <View style={ac.cellLabelRow}>
                <Feather name={item.icon} size={9} color={C.green} />
                <Text style={ac.cellLabel}>{item.label}</Text>
              </View>
              <Text style={ac.cellValue} numberOfLines={2}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {appt.notes ? (
          <View style={ac.notesBox}>
            <Text style={ac.notesLabel}>Notes</Text>
            <Text style={ac.notesText}>{appt.notes}</Text>
          </View>
        ) : null}

        {/* Rejection reason */}
        {appt.status === "rejected" && appt.rejection_reason ? (
          <View style={ac.rejectBox}>
            <Text style={ac.rejectLabel}>{isClinic ? "Your Reason" : "Clinic's Reason"}</Text>
            <Text style={ac.rejectText}>{appt.rejection_reason}</Text>
          </View>
        ) : null}

        {/* Confirm-delete banner */}
        {confirmDelete && (
          <View style={ac.confirmBanner}>
            <Feather name="alert-triangle" size={12} color={C.red} />
            <Text style={ac.confirmBannerText}>Tap trash again to confirm deletion.</Text>
            <TouchableOpacity onPress={() => setConfirmDelete(false)}>
              <Text style={ac.confirmBannerCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action buttons — clinic pending only */}
        {isPending && isClinic && (
          <View style={ac.actions}>
            <TouchableOpacity
              style={ac.acceptBtn}
              onPress={() => onRespond(appt.id, "accepted")}
              disabled={responding === appt.id}
            >
              {responding === appt.id
                ? <ActivityIndicator size="small" color={C.white} />
                : <><Feather name="check" size={14} color={C.white} /><Text style={ac.acceptText}>Accept</Text></>}
            </TouchableOpacity>
            <TouchableOpacity
              style={ac.declineBtn}
              onPress={() => setShowReject(true)}
              disabled={responding === appt.id}
            >
              <Feather name="x" size={14} color={C.red} />
              <Text style={ac.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Waiting — user-initiated pending */}
        {isPending && !isClinic && (
          <View style={ac.waitRow}>
            <Feather name="loader" size={11} color={C.textFaint} />
            <Text style={ac.waitText}>Waiting for clinic to review your request…</Text>
          </View>
        )}
      </View>
    </>
  );
}

const ac = StyleSheet.create({
  card:              { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: "hidden", shadowColor: C.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  header:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  headerBadges:      { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 },
  badge:             { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 },
  badgeDot:          { width: 5, height: 5, borderRadius: 2.5 },
  badgeText:         { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },
  deleteBtn:         { width: 30, height: 30, borderRadius: 8, backgroundColor: C.offWhite, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  deleteBtnActive:   { backgroundColor: C.red, borderColor: C.red },
  titleWrap:         { paddingHorizontal: 14, paddingBottom: 10 },
  breed:             { fontSize: 15, fontWeight: "700", color: C.text, letterSpacing: -0.2 },
  scanId:            { fontSize: 10, color: C.textFaint, fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace", marginTop: 2 },
  grid:              { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  cell:              { width: "47%", backgroundColor: C.offWhite, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.borderLight },
  cellLabelRow:      { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  cellLabel:         { fontSize: 9, fontWeight: "600", color: C.textFaint, textTransform: "uppercase", letterSpacing: 0.5 },
  cellValue:         { fontSize: 12, fontWeight: "600", color: C.text },
  notesBox:          { marginHorizontal: 14, marginBottom: 10, backgroundColor: C.offWhite, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.borderLight },
  notesLabel:        { fontSize: 9, fontWeight: "700", color: C.green, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  notesText:         { fontSize: 12, color: C.textSoft, lineHeight: 18 },
  rejectBox:         { marginHorizontal: 14, marginBottom: 10, backgroundColor: C.redPale, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#fecaca" },
  rejectLabel:       { fontSize: 9, fontWeight: "700", color: C.red, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  rejectText:        { fontSize: 12, color: C.red, lineHeight: 18 },
  confirmBanner:     { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 14, marginBottom: 10, backgroundColor: C.redPale, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#fecaca" },
  confirmBannerText: { flex: 1, fontSize: 11, color: C.red, fontWeight: "500" },
  confirmBannerCancel:{ fontSize: 11, color: C.red, fontWeight: "700" },
  actions:           { flexDirection: "row", gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  acceptBtn:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.green, paddingVertical: 12, borderRadius: 12 },
  acceptText:        { fontSize: 13, fontWeight: "700", color: C.white },
  declineBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.redPale, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fecaca" },
  declineText:       { fontSize: 13, fontWeight: "700", color: C.red },
  waitRow:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 12 },
  waitText:          { fontSize: 11, color: C.textFaint, fontStyle: "italic" },
});

// ─── REQUEST MODAL ────────────────────────────────────────────────────────────
function RequestModal({
  visible, onClose, onSuccess,
}: { visible: boolean; onClose: () => void; onSuccess: () => void }) {
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [reason, setReason]       = useState("");
  const [notes, setNotes]         = useState("");
  const [loading, setLoading]     = useState(false);

  const reset = () => {
    setPreferredDate(""); setPreferredTime(""); setReason(""); setNotes(""); setLoading(false);
  };

  const handleSubmit = async () => {
    if (!preferredDate.trim()) { Alert.alert("Required", "Please enter a preferred date (e.g. 2026-04-15)."); return; }
    if (!preferredTime.trim()) { Alert.alert("Required", "Please enter a preferred time (e.g. 09:00)."); return; }
    if (!reason.trim())        { Alert.alert("Required", "Please enter a reason for your visit."); return; }
    setLoading(true);
    const r = await appointmentService.requestAppointment({
      preferred_date: preferredDate.trim(),
      preferred_time: preferredTime.trim(),
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    });
    setLoading(false);
    if (r.success) {
      Alert.alert("Request Sent!", "The clinic will review and get back to you.");
      reset(); onSuccess(); onClose();
    } else {
      Alert.alert("Error", r.message || "Failed to send request.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={rm.overlay}>
        <View style={rm.sheet}>
          <View style={rm.handle} />

          {/* Header */}
          <View style={rm.header}>
            <View style={rm.headerLeft}>
              <View style={rm.headerIcon}>
                <Feather name="calendar" size={18} color={C.green} />
              </View>
              <View>
                <Text style={rm.headerTitle}>Request Appointment</Text>
                <Text style={rm.headerSub}>The clinic will confirm your request.</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={rm.closeBtn}>
              <Feather name="x" size={18} color={C.textMid} />
            </TouchableOpacity>
          </View>

          <ScrollView style={rm.body} showsVerticalScrollIndicator={false}>
            {/* Date */}
            <View style={rm.field}>
              <Text style={rm.label}>Preferred Date</Text>
              <View style={rm.inputRow}>
                <Feather name="calendar" size={14} color={C.green} />
                <TextInput
                  style={rm.inputFlex}
                  value={preferredDate}
                  onChangeText={setPreferredDate}
                  placeholder="YYYY-MM-DD  e.g. 2026-04-15"
                  placeholderTextColor={C.textFaint}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Time */}
            <View style={rm.field}>
              <Text style={rm.label}>Preferred Time</Text>
              <View style={rm.inputRow}>
                <Feather name="clock" size={14} color={C.green} />
                <TextInput
                  style={rm.inputFlex}
                  value={preferredTime}
                  onChangeText={setPreferredTime}
                  placeholder="HH:MM  e.g. 09:00 or 14:30"
                  placeholderTextColor={C.textFaint}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Reason */}
            <View style={rm.field}>
              <Text style={rm.label}>Reason for Visit *</Text>
              <TextInput
                style={rm.input}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. General checkup, vaccination, skin issue…"
                placeholderTextColor={C.textFaint}
              />
            </View>

            {/* Notes */}
            <View style={rm.field}>
              <Text style={rm.label}>
                Additional Notes <Text style={{ color: C.textFaint, fontWeight: "400" }}>(optional)</Text>
              </Text>
              <TextInput
                style={[rm.input, rm.textarea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any details the clinic should know…"
                placeholderTextColor={C.textFaint}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Info */}
            <View style={rm.infoBox}>
              <Feather name="info" size={13} color={C.green} />
              <Text style={rm.infoText}>
                Your request will be sent to the clinic. They will confirm or suggest a different schedule.
              </Text>
            </View>

            {/* Buttons */}
            <View style={rm.btnRow}>
              <TouchableOpacity style={rm.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={rm.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[rm.submitBtn, loading && rm.submitDisabled]}
                onPress={handleSubmit} disabled={loading}
              >
                {loading
                  ? <ActivityIndicator size="small" color={C.white} />
                  : <><Feather name="send" size={14} color={C.white} /><Text style={rm.submitText}>Send Request</Text></>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const rm = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet:         { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%", paddingBottom: 32 },
  handle:        { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginTop: 10, marginBottom: 4 },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  headerLeft:    { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  headerIcon:    { width: 40, height: 40, borderRadius: 12, backgroundColor: C.greenPale, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.greenMid },
  headerTitle:   { fontSize: 15, fontWeight: "700", color: C.text, letterSpacing: -0.2 },
  headerSub:     { fontSize: 11, color: C.textSoft, marginTop: 1 },
  closeBtn:      { width: 32, height: 32, borderRadius: 8, backgroundColor: C.offWhite, alignItems: "center", justifyContent: "center" },
  body:          { paddingHorizontal: 20, paddingTop: 16 },
  field:         { marginBottom: 14 },
  label:         { fontSize: 12, fontWeight: "600", color: C.textMid, marginBottom: 6 },
  picker:        { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.offWhite, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: C.border },
  pickerText:    { flex: 1, fontSize: 14, fontWeight: "500", color: C.text },
  input:         { backgroundColor: C.offWhite, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  inputRow:      { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.offWhite, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
  inputFlex:     { flex: 1, fontSize: 14, color: C.text },
  textarea:      { minHeight: 80, paddingTop: 12 },
  infoBox:       { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.greenDim, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: C.greenMid },
  infoText:      { flex: 1, fontSize: 12, color: C.textMid, lineHeight: 18 },
  btnRow:        { flexDirection: "row", gap: 10, marginBottom: 8 },
  cancelBtn:     { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.white },
  cancelText:    { fontSize: 14, fontWeight: "600", color: C.textSoft },
  submitBtn:     { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: C.green },
  submitDisabled:{ opacity: 0.55 },
  submitText:    { fontSize: 14, fontWeight: "700", color: C.white },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function AppointmentsScreen() {
  const router    = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [responding, setResponding]     = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchAppointments = async (silent = false) => {
    if (!silent) setLoading(true);
    const r = await appointmentService.getAppointments();
    if (r.success && r.appointments) {
      setAppointments(r.appointments);
    } else if (!r.success) {
      console.warn("❌ fetchAppointments failed:", r.message);
    }
    setLoading(false);
    setRefreshing(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  useFocusEffect(useCallback(() => { fetchAppointments(); }, []));

  const handleRespond = async (id: number, status: "accepted" | "rejected", rejection_reason?: string) => {
    setResponding(id);
    const r = await appointmentService.updateStatus(id, { status, rejection_reason });
    setResponding(null);
    if (r.success) {
      setAppointments((prev) =>
        prev.map((a) => a.id === id ? { ...a, status, rejection_reason: rejection_reason ?? a.rejection_reason } : a)
      );
    } else {
      Alert.alert("Error", r.message || "Failed to update.");
    }
  };

  const handleDelete = async (id: number) => {
    const r = await appointmentService.deleteAppointment(id);
    if (r.success) {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } else {
      Alert.alert("Error", r.message || "Failed to delete.");
    }
  };

  // Split into three sections — null initiated_by treated as 'clinic' (pre-migration records)
  const clinicPending = appointments.filter((a) => (a.initiated_by ?? "clinic") === "clinic" && a.status === "pending");
  const userRequests  = appointments.filter((a) => a.initiated_by === "user");
  const responded     = appointments.filter((a) => (a.initiated_by ?? "clinic") === "clinic" && a.status !== "pending");

  return (
    <View style={s.root}>
      <RequestModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => fetchAppointments(true)}
      />

      {/* TOP BAR */}
      <View style={s.topBar}>
        <SafeAreaView>
          <View style={s.topRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.push("/scan")}>
              <Feather name="arrow-left" size={18} color={C.white} />
            </TouchableOpacity>
            <View style={s.topCenter}>
              <Text style={s.topTitle}>My Appointments</Text>
              <Text style={s.topSub}>Manage your clinic consultations</Text>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
              <Feather name="plus" size={18} color={C.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* BODY */}
      <View style={s.body}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.green} />
            <Text style={s.loadingText}>Loading appointments…</Text>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FlatList
              data={[]}
              renderItem={null}
              contentContainerStyle={s.scroll}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAppointments(true); }}
              ListHeaderComponent={
                <>
                  {/* Request button banner */}
                  <TouchableOpacity style={s.banner} onPress={() => setShowModal(true)} activeOpacity={0.85}>
                    <View style={s.bannerIcon}>
                      <Feather name="calendar" size={18} color={C.green} />
                    </View>
                    <View style={s.bannerTextWrap}>
                      <Text style={s.bannerTitle}>Request an Appointment</Text>
                      <Text style={s.bannerSub}>Send a request directly to the clinic</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={C.green} />
                  </TouchableOpacity>

                  {appointments.length === 0 ? (
                    <View style={s.empty}>
                      <View style={s.emptyIconWrap}>
                        <Feather name="calendar" size={28} color={C.textFaint} />
                      </View>
                      <Text style={s.emptyTitle}>No appointments yet</Text>
                      <Text style={s.emptySub}>
                        Use the button above to request one, or wait for the clinic to schedule a consultation.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Legend */}
                      <View style={s.legend}>
                        <View style={s.legendItem}>
                          <View style={[s.legendDot, { backgroundColor: C.blue }]} />
                          <Text style={s.legendText}>From Clinic</Text>
                        </View>
                        <View style={s.legendItem}>
                          <View style={[s.legendDot, { backgroundColor: C.purple }]} />
                          <Text style={s.legendText}>Your Request</Text>
                        </View>
                      </View>

                      {/* Section 1 — Action Required */}
                      {clinicPending.length > 0 && (
                        <View style={s.section}>
                          <SectionHeader title="Action Required" count={clinicPending.length} color={C.amber} />
                          <Text style={s.sectionDesc}>The clinic scheduled these. Please accept or decline.</Text>
                          {clinicPending.map((a) => (
                            <AppointmentCard key={a.id} appt={a} onRespond={handleRespond} onDelete={handleDelete} responding={responding} />
                          ))}
                        </View>
                      )}

                      {/* Section 2 — Your Requests */}
                      {userRequests.length > 0 && (
                        <View style={s.section}>
                          <SectionHeader title="Your Requests" count={userRequests.length} color={C.purple} />
                          <Text style={s.sectionDesc}>Appointments you requested from the clinic.</Text>
                          {userRequests.map((a) => (
                            <AppointmentCard key={a.id} appt={a} onRespond={handleRespond} onDelete={handleDelete} responding={responding} />
                          ))}
                        </View>
                      )}

                      {/* Section 3 — Responded */}
                      {responded.length > 0 && (
                        <View style={s.section}>
                          <SectionHeader title="Responded" count={responded.length} color={C.textFaint} />
                          {responded.map((a) => (
                            <AppointmentCard key={a.id} appt={a} onRespond={handleRespond} onDelete={handleDelete} responding={responding} />
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </>
              }
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ─── PAGE STYLES ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.green },
  topBar:        { backgroundColor: C.green },
  topRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, paddingTop: Platform.OS === "android" ? 48 : 14, gap: 12 },
  backBtn:       { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  topCenter:     { flex: 1 },
  topTitle:      { fontSize: 17, fontWeight: "700", color: C.white, letterSpacing: -0.3 },
  topSub:        { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  addBtn:        { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  body:          { flex: 1, backgroundColor: C.offWhite, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -10, overflow: "hidden" },
  scroll:        { padding: 18, paddingBottom: 48 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  loadingText:   { fontSize: 13, color: C.textSoft },
  banner:        { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.greenMid, shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  bannerIcon:    { width: 42, height: 42, borderRadius: 13, backgroundColor: C.greenPale, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.greenMid },
  bannerTextWrap:{ flex: 1 },
  bannerTitle:   { fontSize: 14, fontWeight: "700", color: C.text },
  bannerSub:     { fontSize: 11, color: C.textSoft, marginTop: 1 },
  legend:        { flexDirection: "row", gap: 14, marginBottom: 14 },
  legendItem:    { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot:     { width: 8, height: 8, borderRadius: 4 },
  legendText:    { fontSize: 11, color: C.textSoft, fontWeight: "500" },
  section:       { marginBottom: 16 },
  sectionDesc:   { fontSize: 12, color: C.textFaint, marginBottom: 8, marginTop: -2 },
  empty:         { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.borderLight, alignItems: "center", justifyContent: "center" },
  emptyTitle:    { fontSize: 15, fontWeight: "700", color: C.textMid },
  emptySub:      { fontSize: 12, color: C.textFaint, textAlign: "center", lineHeight: 18, paddingHorizontal: 20 },
});