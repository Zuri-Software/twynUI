import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface Country {
  id: string;
  name: string;
  dialCode: string;
  flag: string;
  code: string;
}

const COUNTRIES: Country[] = [
  { id: '1', name: 'Canada', dialCode: '+1', flag: '🇨🇦', code: 'CA' },
  { id: '2', name: 'United States', dialCode: '+1', flag: '🇺🇸', code: 'US' },
  { id: '3', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', code: 'GB' },
  { id: '4', name: 'Australia', dialCode: '+61', flag: '🇦🇺', code: 'AU' },
  { id: '5', name: 'Germany', dialCode: '+49', flag: '🇩🇪', code: 'DE' },
  { id: '6', name: 'France', dialCode: '+33', flag: '🇫🇷', code: 'FR' },
  { id: '7', name: 'Italy', dialCode: '+39', flag: '🇮🇹', code: 'IT' },
  { id: '8', name: 'Spain', dialCode: '+34', flag: '🇪🇸', code: 'ES' },
  { id: '9', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', code: 'NL' },
  { id: '10', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', code: 'SE' },
  { id: '11', name: 'Norway', dialCode: '+47', flag: '🇳🇴', code: 'NO' },
  { id: '12', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', code: 'DK' },
  { id: '13', name: 'Japan', dialCode: '+81', flag: '🇯🇵', code: 'JP' },
  { id: '14', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', code: 'KR' },
  { id: '15', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', code: 'SG' },
  { id: '16', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', code: 'BR' },
  { id: '17', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', code: 'MX' },
  { id: '18', name: 'India', dialCode: '+91', flag: '🇮🇳', code: 'IN' },
  { id: '19', name: 'China', dialCode: '+86', flag: '🇨🇳', code: 'CN' },
  { id: '20', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', code: 'NZ' },
];

// Default country (Canada)
export const DEFAULT_COUNTRY = COUNTRIES[0];

interface CountryPickerProps {
  selectedCountry: Country;
  onCountrySelect: (country: Country) => void;
  style?: any;
}

interface CountryPickerModalProps {
  visible: boolean;
  selectedCountry: Country;
  onCountrySelect: (country: Country) => void;
  onClose: () => void;
}

const CountryPickerModal: React.FC<CountryPickerModalProps> = ({
  visible,
  selectedCountry,
  onCountrySelect,
  onClose,
}) => {
  const [searchText, setSearchText] = useState('');

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchText.toLowerCase()) ||
    country.dialCode.includes(searchText) ||
    country.code.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleCountrySelect = (country: Country) => {
    onCountrySelect(country);
    setSearchText('');
    onClose();
  };

  const renderCountryItem = ({ item: country }: { item: Country }) => (
    <TouchableOpacity
      style={styles.countryItem}
      onPress={() => handleCountrySelect(country)}
    >
      <Text style={styles.countryFlag}>{country.flag}</Text>
      
      <View style={styles.countryInfo}>
        <Text style={styles.countryName}>{country.name}</Text>
        <Text style={styles.countryCode}>{country.dialCode}</Text>
      </View>
      
      {selectedCountry.id === country.id && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Country</Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={onClose}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search countries"
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#999999"
            />
          </View>
        </View>

        {/* Countries List */}
        <FlatList
          data={filteredCountries}
          renderItem={renderCountryItem}
          keyExtractor={(item) => item.id}
          style={styles.countriesList}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
};

const CountryPicker: React.FC<CountryPickerProps> = ({
  selectedCountry,
  onCountrySelect,
  style,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, style]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.flag}>{selectedCountry.flag}</Text>
        <Text style={styles.dialCode}>{selectedCountry.dialCode}</Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      <CountryPickerModal
        visible={modalVisible}
        selectedCountry={selectedCountry}
        onCountrySelect={onCountrySelect}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 8,
    gap: 8,
  },
  flag: {
    fontSize: 20,
  },
  dialCode: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 12,
    color: '#666666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  doneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  doneButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(128,128,128,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    padding: 0,
  },
  countriesList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 2,
  },
  countryCode: {
    fontSize: 14,
    color: '#666666',
  },
  checkmark: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default CountryPicker;