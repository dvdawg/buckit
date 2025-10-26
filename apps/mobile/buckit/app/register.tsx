import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import BucketLogo from '@/components/BucketLogo';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    city: '',
    birthday: '',
    profilePicture: null,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [countryCode, setCountryCode] = useState('+1');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  
  const countryCodes = [
    { code: '+1', country: 'US/CA' },
    { code: '+44', country: 'UK' },
    { code: '+33', country: 'France' },
    { code: '+49', country: 'Germany' },
    { code: '+81', country: 'Japan' },
    { code: '+86', country: 'China' },
    { code: '+91', country: 'India' },
    { code: '+61', country: 'Australia' },
    { code: '+55', country: 'Brazil' },
    { code: '+52', country: 'Mexico' },
  ];
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);


  const updateFormData = (key: string, value: string) => {
    let processedValue = value;
    
    // Format phone number with automatic + and dashes
    if (key === 'phone') {
      processedValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({ ...prev, [key]: processedValue }));
    
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // If no digits, return empty string
    if (digits.length === 0) {
      return '';
    }
    
    // Return just the digits (no formatting)
    return digits;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      setFormData(prev => ({ ...prev, birthday: formattedDate }));
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    if (!phone.trim()) return true; // Empty phone is valid since it's optional
    // Check if it's 10 digits (US phone number)
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  const validateBirthday = (birthday: string) => {
    if (!birthday) return false;
    
    const date = new Date(birthday);
    const now = new Date();
    
    // Check if it's a valid date
    if (isNaN(date.getTime())) return false;
    
    // Check if date is not in the future
    if (date > now) return false;
    
    // Check if user is at least 13 years old
    const age = now.getFullYear() - date.getFullYear();
    const monthDiff = now.getMonth() - date.getMonth();
    const dayDiff = now.getDate() - date.getDate();
    
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    
    return actualAge >= 13 && actualAge <= 120;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // City is now optional - no validation needed

    if (!formData.birthday) {
      newErrors.birthday = 'Birthday is required';
    } else if (!validateBirthday(formData.birthday)) {
      newErrors.birthday = 'Please select a valid birthday and ensure you are at least 13 years old';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep < 2) {
      if (validateForm()) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      handleCreateAccount();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    
    try {
      // Step 1: Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            city: formData.city,
            birthday: formData.birthday,
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Step 2: Create user profile in our database
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          auth_id: authData.user.id,
          full_name: `${formData.firstName} ${formData.lastName}`,
          handle: formData.email.split('@')[0], // Use email prefix as handle
          avatar_url: formData.profilePicture,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // If profile creation fails, we should clean up the auth user
        // But for now, we'll just show an error
        throw new Error('Failed to create user profile');
      }

      // Step 3: Check if email confirmation is required
      if (authData.user.email_confirmed_at) {
        // User is immediately confirmed, navigate to app
        router.replace('/(tabs)/home');
      } else {
        // Show confirmation message
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link. Please check your email and click the link to activate your account.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login')
            }
          ]
        );
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'An error occurred during registration. Please try again.';
      
      if (error.message?.includes('already registered')) {
        errorMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.email && formData.password && formData.confirmPassword && 
               formData.firstName && formData.lastName && formData.birthday;
      case 2:
        return true; // Profile picture is optional
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>Let's get started with your account</Text>
      
      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email *</Text>
          <TextInput
            style={[styles.textInput, errors.email && styles.textInputError]}
            placeholder="Enter your email"
            placeholderTextColor="#9BA1A6"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={closeDatePicker}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
          <View style={styles.phoneInputWrapper}>
            <View style={styles.phoneInputContainer}>
              <TouchableOpacity 
                style={styles.countryCodeContainer}
                onPress={() => setShowCountryPicker(!showCountryPicker)}
              >
                <Text style={styles.countryCodeText}>{countryCode}</Text>
                <Ionicons name="chevron-down" size={16} color="#9BA1A6" />
              </TouchableOpacity>
              <TextInput
                style={[styles.phoneTextInput, errors.phone && styles.textInputError]}
                placeholder="Enter your phone number"
                placeholderTextColor="#9BA1A6"
                value={formData.phone}
                onChangeText={(value) => updateFormData('phone', value)}
                keyboardType="phone-pad"
                onFocus={closeDatePicker}
              />
            </View>
            <Modal
              visible={showCountryPicker}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowCountryPicker(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowCountryPicker(false)}
              >
                <View style={styles.countryPickerModal}>
                  <View style={styles.countryPickerHeader}>
                    <Text style={styles.countryPickerTitle}>Select Country Code</Text>
                    <TouchableOpacity 
                      onPress={() => setShowCountryPicker(false)}
                      style={styles.closeButton}
                    >
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.countryPickerList}>
                    {countryCodes.map((country) => (
                      <TouchableOpacity
                        key={country.code}
                        style={[
                          styles.countryOption,
                          countryCode === country.code && styles.countryOptionSelected
                        ]}
                        onPress={() => {
                          setCountryCode(country.code);
                          setShowCountryPicker(false);
                        }}
                      >
                        <Text style={styles.countryOptionText}>{country.code}</Text>
                        <Text style={styles.countryOptionCountry}>{country.country}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password *</Text>
          <TextInput
            style={[styles.textInput, errors.password && styles.textInputError]}
            placeholder="Create a password"
            placeholderTextColor="#9BA1A6"
            value={formData.password}
            onChangeText={(value) => updateFormData('password', value)}
            secureTextEntry
            autoCapitalize="none"
            onFocus={closeDatePicker}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password *</Text>
          <TextInput
            style={[styles.textInput, errors.confirmPassword && styles.textInputError]}
            placeholder="Confirm your password"
            placeholderTextColor="#9BA1A6"
            value={formData.confirmPassword}
            onChangeText={(value) => updateFormData('confirmPassword', value)}
            secureTextEntry
            autoCapitalize="none"
            onFocus={closeDatePicker}
          />
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>First Name *</Text>
          <TextInput
            style={[styles.textInput, errors.firstName && styles.textInputError]}
            placeholder="Enter your first name"
            placeholderTextColor="#9BA1A6"
            value={formData.firstName}
            onChangeText={(value) => updateFormData('firstName', value)}
            autoCapitalize="words"
            onFocus={closeDatePicker}
          />
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Last Name *</Text>
          <TextInput
            style={[styles.textInput, errors.lastName && styles.textInputError]}
            placeholder="Enter your last name"
            placeholderTextColor="#9BA1A6"
            value={formData.lastName}
            onChangeText={(value) => updateFormData('lastName', value)}
            autoCapitalize="words"
            onFocus={closeDatePicker}
          />
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>City (Optional)</Text>
          <TextInput
            style={[styles.textInput, errors.city && styles.textInputError]}
            placeholder="Enter your city (optional)"
            placeholderTextColor="#9BA1A6"
            value={formData.city}
            onChangeText={(value) => updateFormData('city', value)}
            autoCapitalize="words"
            onFocus={closeDatePicker}
          />
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Birthday *</Text>
          <TouchableOpacity 
            style={[styles.textInput, styles.dateInput, errors.birthday && styles.textInputError]}
            onPress={openDatePicker}
          >
            <Text style={[styles.dateText, !formData.birthday && styles.placeholderText]}>
              {formData.birthday ? new Date(formData.birthday).toLocaleDateString() : 'Select your birthday'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#9BA1A6" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={formData.birthday ? new Date(formData.birthday) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
            />
          )}
          {errors.birthday && <Text style={styles.errorText}>{errors.birthday}</Text>}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Profile Picture</Text>
      <Text style={styles.stepSubtitle}>Add a photo to personalize your profile</Text>
      
      <View style={styles.formContainer}>
        <TouchableOpacity style={styles.profilePictureContainer}>
          <Text style={styles.profilePictureText}>📷</Text>
          <Text style={styles.profilePictureLabel}>Add Profile Picture</Text>
          <Text style={styles.profilePictureSubtext}>Optional</Text>
        </TouchableOpacity>
      </View>
    </View>
  );


  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <BucketLogo size={24} color="#fff" />
            <Text style={styles.buckitText}>Buckit</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentStep / 2) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep} of 2
          </Text>
        </View>

        {/* Content */}
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="interactive"
          >
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canProceed() || loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? 'Creating Account...' : currentStep === 2 ? 'Create Account' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4ade80',
    fontWeight: '500',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buckitText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
    marginLeft: 8,
  },
  headerSpacer: {
    width: 60,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ade80',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#9BA1A6',
    textAlign: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  stepContainer: {
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#9BA1A6',
    marginBottom: 32,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  placeholderText: {
    color: '#9BA1A6',
  },
  textInputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  profilePictureContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePictureText: {
    fontSize: 48,
    marginBottom: 12,
  },
  profilePictureLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  profilePictureSubtext: {
    fontSize: 14,
    color: '#9BA1A6',
  },
  navigationContainer: {
    paddingVertical: 20,
    paddingBottom: 40,
  },
  nextButton: {
    backgroundColor: '#4ade80',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#374151',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  phoneInputWrapper: {
    position: 'relative',
    zIndex: 1,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderRightWidth: 1,
    borderRightColor: '#4b5563',
  },
  countryCodeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
  phoneTextInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 16,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  countryPickerModal: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    width: '100%',
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  countryPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  countryPickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  countryPickerList: {
    maxHeight: 300,
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  countryOptionSelected: {
    backgroundColor: '#374151',
  },
  countryOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  countryOptionCountry: {
    color: '#9BA1A6',
    fontSize: 14,
  },
});
