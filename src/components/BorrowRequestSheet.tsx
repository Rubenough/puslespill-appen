// Delt låneforespørsel-ark for LibraryScreen og FriendCollectionScreen.
// Tre tilstander: utlånt (dødt), ventende (avbryt), ellers melding + send.
// Arket eier meldings-/submitting-state og RPC-kallene; skjermene eier
// pending-mapet og refetch (forespørsels-id-en finnes først etter ny henting).
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import BottomSheet from "./BottomSheet";

type BorrowRequestSheetProps = {
  /** Gjenstanden arket gjelder — null skjuler arket. */
  item: { id: string; title: string } | null;
  /** Undertittel (f.eks. "Puslespill" eller "Puslespill · Kari"). */
  subtitle: string;
  isLoaned: boolean;
  /** Ventende forespørsels-id for gjenstanden, om noen. */
  pendingRequestId: string | null;
  onClose: () => void;
  /** Etter vellykket sending (skjermen refetcher for å få forespørsels-id). */
  onRequestSent: () => void | Promise<void>;
  /** Etter vellykket kansellering (skjermen fjerner gjenstanden fra pending-mapet). */
  onRequestCancelled: (itemId: string) => void;
};

export default function BorrowRequestSheet({
  item,
  subtitle,
  isLoaned,
  pendingRequestId,
  onClose,
  onRequestSent,
  onRequestCancelled,
}: BorrowRequestSheetProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Nullstill meldingen når arket åpnes for en (annen) gjenstand.
  useEffect(() => {
    setMessage("");
  }, [item?.id]);

  async function handleRequest() {
    if (!item) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("request_to_borrow", {
        p_item_id: item.id,
        p_message: message.trim() || undefined,
      });
      if (error) {
        Alert.alert(t("borrow.failed"), error.message);
        return;
      }
      setMessage("");
      await onRequestSent();
      Alert.alert(t("borrow.sent"), t("borrow.sentBody"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelRequest() {
    if (!item || !pendingRequestId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("cancel_request", {
        p_request_id: pendingRequestId,
      });
      if (error) {
        Alert.alert(t("common.somethingWrong"), error.message);
        return;
      }
      onRequestCancelled(item.id);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet
      visible={item !== null}
      onClose={onClose}
      closeLabel={t("common.cancel")}
    >
      <Text className="text-content dark:text-content-dark text-lg font-semibold mb-1 px-1">
        {item?.title}
      </Text>
      <Text className="text-content-secondary dark:text-content-secondary-dark text-sm mb-4 px-1">
        {subtitle}
      </Text>

      {isLoaned ? (
        <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl py-4 items-center mb-2">
          <Text className="text-content-secondary dark:text-content-secondary-dark font-medium">
            {t("borrow.unavailable")}
          </Text>
        </View>
      ) : pendingRequestId ? (
        <>
          <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl py-4 items-center mb-3">
            <Text className="text-content-secondary dark:text-content-secondary-dark font-medium">
              {t("borrow.requested")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleCancelRequest}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={t("borrow.cancelRequest")}
            accessibilityState={{ disabled: submitting }}
            className="border border-border dark:border-border-dark rounded-2xl py-4 items-center mb-2"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#1D9E75" />
            ) : (
              <Text className="text-content dark:text-content-dark font-semibold text-base">
                {t("borrow.cancelRequest")}
              </Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-2xl border border-border dark:border-border-dark px-4 py-3 mb-4">
            <TextInput
              className="text-content dark:text-content-dark text-base"
              placeholder={t("borrow.messagePlaceholder")}
              placeholderTextColor="#A8A29E"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              accessibilityLabel={t("borrow.messagePlaceholder")}
            />
          </View>
          <TouchableOpacity
            onPress={handleRequest}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={t("borrow.ask")}
            accessibilityState={{ disabled: submitting }}
            className="bg-accent dark:bg-accent-dark rounded-2xl py-4 items-center mb-2"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {t("borrow.send")}
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t("common.cancel")}
        className="py-3 items-center"
      >
        <Text className="text-content-secondary dark:text-content-secondary-dark text-sm">
          {t("common.cancel")}
        </Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}
