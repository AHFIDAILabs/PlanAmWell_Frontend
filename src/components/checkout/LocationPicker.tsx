// ─── Types ───────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { NIGERIA_STATES } from "../../constants/nigeriaLocations";
import { getDeliveryZones, IDeliveryZoneState } from "../../services/checkout";

type PickerMode = "state" | "lga";

interface PickerItem {
  name: string;
  price?: number; // present only for LGA items backed by live delivery-zone data
}

interface SearchModalProps {
  visible: boolean;
  mode: PickerMode;
  items: PickerItem[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

interface LocationPickerProps {
  state: string;
  lga: string;
  city: string;
  onStateChange: (value: string) => void;
  onLgaChange: (value: string) => void;
  onCityChange: (value: string) => void;
}

// ─── Search Modal ─────────────────────────────────────────────────────────────

const SearchModal: React.FC<SearchModalProps> = ({
  visible,
  mode,
  items,
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);

  const filtered = query.trim()
    ? items.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const handleSelect = (value: string) => {
    setQuery("");
    Keyboard.dismiss();
    onSelect(value);
  };

  const handleClose = () => {
    setQuery("");
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={modal.container}>
        {/* Header */}
        <View style={modal.header}>
          <Text style={modal.title}>
            {mode === "state" ? "Select State" : "Select LGA"}
          </Text>
          <TouchableOpacity onPress={handleClose} style={modal.closeBtn}>
            <Feather name="x" size={22} color="#222" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={modal.searchRow}>
          <Feather name="search" size={16} color="#999" style={modal.searchIcon} />
          <TextInput
            ref={inputRef}
            style={modal.searchInput}
            placeholder={mode === "state" ? "Search states…" : "Search LGAs…"}
            placeholderTextColor="#AAA"
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} style={modal.clearBtn}>
              <Feather name="x-circle" size={16} color="#BBB" />
            </TouchableOpacity>
          )}
        </View>

        {/* Count badge */}
        <Text style={modal.countText}>
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </Text>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={modal.listContent}
          ItemSeparatorComponent={() => <View style={modal.separator} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={modal.item}
              onPress={() => handleSelect(item.name)}
              activeOpacity={0.6}
            >
              <Text style={modal.itemText}>{item.name}</Text>
              {typeof item.price === "number" && (
                <Text style={modal.itemPrice}>
                  {item.price > 0 ? `₦${item.price.toLocaleString()}` : "Free"}
                </Text>
              )}
              <Feather name="chevron-right" size={16} color="#CCC" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={modal.emptyContainer}>
              <Feather name="map-pin" size={32} color="#DDD" />
              <Text style={modal.emptyText}>No results for "{query}"</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const LocationPicker: React.FC<LocationPickerProps> = ({
  state,
  lga,
  city,
  onStateChange,
  onLgaChange,
  onCityChange,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>("state");
  const [zones, setZones] = useState<IDeliveryZoneState[] | null>(null);
  const [loadingZones, setLoadingZones] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getDeliveryZones();
        if (!cancelled && data.length > 0) setZones(data);
      } catch (err) {
        console.warn("[LocationPicker] Failed to load delivery zones, falling back to full state/LGA list:", err);
      } finally {
        if (!cancelled) setLoadingZones(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefer the partner's actual coverage list; fall back to the full static
  // Nigeria list (no price data) only if the live fetch fails or is empty.
  const usingLiveZones = !!zones;
  const stateNames: PickerItem[] = usingLiveZones
    ? zones!.map((s) => ({ name: s.state }))
    : NIGERIA_STATES.map((s) => ({ name: s.name }));

  const lgaList: PickerItem[] = usingLiveZones
    ? zones!.find((s) => s.state === state)?.lgas.map((l) => ({ name: l.name, price: l.price })) ?? []
    : NIGERIA_STATES.find((s) => s.name === state)?.lgas.map((name) => ({ name })) ?? [];

  const openStatePicker = () => {
    setPickerMode("state");
    setModalVisible(true);
  };

  const openLgaPicker = () => {
    if (!state) return; // guard — must pick state first
    setPickerMode("lga");
    setModalVisible(true);
  };

  const handleSelect = (value: string) => {
    if (pickerMode === "state") {
      onStateChange(value);
    } else {
      onLgaChange(value);
    }
    setModalVisible(false);
  };

  return (
    <View>
      {/* City + State row — mirrors original layout */}
      <View style={picker.row}>
        {/* City — remains a free-text input */}
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={picker.label}>City</Text>
          <TextInput
            style={picker.input}
            value={city}
            onChangeText={onCityChange}
            placeholder="Enter city"
            placeholderTextColor="#BBB"
          />
        </View>

        {/* State — searchable picker */}
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={picker.label}>State</Text>
          <TouchableOpacity
            style={[picker.input, picker.pickerTrigger]}
            onPress={openStatePicker}
            activeOpacity={0.7}
            disabled={loadingZones}
          >
            {loadingZones ? (
              <>
                <ActivityIndicator size="small" color="#999" />
                <Text style={[picker.pickerPlaceholderText, { marginLeft: 8 }]}>Loading states…</Text>
              </>
            ) : (
              <Text
                style={state ? picker.pickerValueText : picker.pickerPlaceholderText}
                numberOfLines={1}
              >
                {state || "Select state"}
              </Text>
            )}
            <Feather name="chevron-down" size={16} color="#999" />
          </TouchableOpacity>
        </View>
      </View>

      {/* LGA */}
      <Text style={[picker.label, { marginTop: 12 }]}>LGA</Text>
      <TouchableOpacity
        style={[
          picker.input,
          picker.pickerTrigger,
          !state && picker.pickerDisabled,
        ]}
        onPress={openLgaPicker}
        activeOpacity={state ? 0.7 : 1}
      >
        <Text
          style={
            !state
              ? picker.pickerDisabledText
              : lga
              ? picker.pickerValueText
              : picker.pickerPlaceholderText
          }
          numberOfLines={1}
        >
          {!state ? "Select state first" : lga || "Select LGA"}
        </Text>
        <Feather
          name="chevron-down"
          size={16}
          color={state ? "#999" : "#CCC"}
        />
      </TouchableOpacity>

      {/* Hint when state is chosen but LGA isn't */}
      {state && !lga && (
        <Text style={picker.hintText}>
          Choose your Local Government Area to calculate delivery fee
        </Text>
      )}

      {/* Search Modal */}
      <SearchModal
        visible={modalVisible}
        mode={pickerMode}
        items={pickerMode === "state" ? stateNames : lgaList}
        onSelect={handleSelect}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const picker = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: "#FAFAFA",
  },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    paddingVertical: 0,
  },
  pickerValueText: {
    fontSize: 14,
    color: "#222",
    flex: 1,
    marginRight: 4,
  },
  pickerPlaceholderText: {
    fontSize: 14,
    color: "#BBB",
    flex: 1,
    marginRight: 4,
  },
  pickerDisabled: {
    backgroundColor: "#F5F5F5",
    borderColor: "#EEE",
  },
  pickerDisabledText: {
    fontSize: 14,
    color: "#CCC",
    flex: 1,
    marginRight: 4,
  },
  hintText: {
    fontSize: 12,
    color: "#D81E5B",
    marginTop: -8,
    marginBottom: 8,
  },
});

const modal = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },
  closeBtn: {
    padding: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#222",
    height: 44,
    padding: 0,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  countText: {
    fontSize: 12,
    color: "#AAA",
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  separator: {
    height: 1,
    backgroundColor: "#F5F5F5",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  itemText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    color: "#00897B",
    fontWeight: "600",
    marginRight: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#AAA",
  },
});

