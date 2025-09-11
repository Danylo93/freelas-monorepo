import React, { useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, BackHandler } from "react-native";
import * as Haptics from "expo-haptics";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  playSound?: boolean;      // toca som em loop
};

export default function AlertModal({
  visible,
  title,
  message,
  confirmText = "Aceitar",
  cancelText = "Recusar",
  onConfirm,
  onCancel,
  playSound = false
}: Props) {
  useEffect(() => {
    let sound: Audio.Sound | null = null;

    const start = async () => {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers
        });
        if (visible && playSound) {
          sound = new Audio.Sound();
          await sound.loadAsync(require("../../assets/sounds/opportunity.mp3"));
          await sound.setIsLoopingAsync(true);
          await sound.playAsync();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {}
    };

    const stop = async () => {
      try {
        await sound?.stopAsync();
        await sound?.unloadAsync();
      } catch {}
    };

    start();
    return () => { stop(); };
  }, [visible, playSound]);

  // botão físico "voltar" fecha o modal com recusa
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!visible) return false;
      onCancel?.();
      return true;
    });
    return () => sub.remove();
  }, [visible, onCancel]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.msg}>{message}</Text>}
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={onCancel}>
              <Text style={styles.btnText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={onConfirm}>
              <Text style={styles.btnText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 20 },
  box: { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  msg: { color: "#444" },
  row: { flexDirection: "row", gap: 12, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnReject: { backgroundColor: "#991B1B" },
  btnAccept: { backgroundColor: "#065F46" },
  btnText: { color: "#fff", fontWeight: "700" },
});
