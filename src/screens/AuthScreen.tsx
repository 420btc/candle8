import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  ImageBackground,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import NetInfo from '@react-native-community/netinfo';
// Ensure the polyfill is imported
import 'react-native-get-random-values';

const { width, height } = Dimensions.get('window');

interface BulkUserData {
  username: string;
  password: string;
}

const AuthScreen: React.FC = () => {
  // Animation values
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [isOfflineLoginAttempted, setIsOfflineLoginAttempted] = useState(false);
  const [showBulkRegisterModal, setShowBulkRegisterModal] = useState(false);
  const [bulkUserData, setBulkUserData] = useState('');
  const [isBulkRegistering, setIsBulkRegistering] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  const { 
    signIn, 
    signUp, 
    loginAsGuest, 
    tryOfflineLogin, 
    bulkRegisterUsers,
    syncUserData,
    user
  } = useAuth();

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected && state.isInternetReachable);
    });
    
    // Initial check
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected && state.isInternetReachable);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Sync user data when connected and logged in
  useEffect(() => {
    if (isConnected && user) {
      syncUserData();
    }
  }, [isConnected, user, syncUserData]);

  // Check for internet connection and try offline login if needed
  useEffect(() => {
    const checkConnectionAndLogin = async () => {
      if (isOfflineLoginAttempted) return;
      
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || !netInfo.isInternetReachable) {
        console.log("No internet connection detected, trying offline login");
        const success = await tryOfflineLogin();
        if (success) {
          console.log("Offline login successful");
        } else {
          console.log("Offline login failed");
        }
      }
      
      setIsOfflineLoginAttempted(true);
    };
    
    checkConnectionAndLogin();
  }, [isOfflineLoginAttempted, tryOfflineLogin]);

  useEffect(() => {
    console.log("AuthScreen mounted");
  }, []);

  const handleAuth = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        console.log("Attempting login with username:", username);
        const { error } = await signIn(username, password);
        if (error) {
          console.log("Login failed:", error);
          Alert.alert('Login Failed', error);
        } else {
          console.log("Login successful");
        }
      } else {
        console.log("Attempting signup with username:", username);
        const { error } = await signUp(username, password);
        if (error) {
          console.log("Signup failed:", error);
          Alert.alert('Signup Failed', error);
        } else {
          console.log("Signup successful");
          Alert.alert('Success', 'Account created successfully! You can now log in.');
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      await loginAsGuest();
    } catch (error) {
      console.error('Guest login error:', error);
      Alert.alert('Error', 'Failed to login as guest');
    } finally {
      setIsGuestLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
  };
  
  const handleBulkRegister = async () => {
    if (!bulkUserData.trim()) {
      Alert.alert('Error', 'Please enter user data in the correct format');
      return;
    }
    
    setIsBulkRegistering(true);
    
    try {
      // Parse the bulk user data
      // Expected format: username,password\nusername2,password2
      const lines = bulkUserData.split('\n');
      const users: BulkUserData[] = [];
      
      for (const line of lines) {
        const parts = line.trim().split(',');
        if (parts.length >= 2) {
          users.push({
            username: parts[0].trim(),
            password: parts[1].trim()
          });
        }
      }
      
      if (users.length === 0) {
        Alert.alert('Error', 'No valid user data found. Please use format: username,password');
        setIsBulkRegistering(false);
        return;
      }
      
      // Register the users
      const result = await bulkRegisterUsers(users);
      
      // Show results
      Alert.alert(
        'Bulk Registration Results',
        `Successfully registered: ${result.success}\nFailed: ${result.failed}\n\n${
          result.errors.length > 0 ? `Errors:\n${result.errors.join('\n')}` : ''
        }`
      );
      
      // Close modal on success
      if (result.success > 0) {
        setShowBulkRegisterModal(false);
        setBulkUserData('');
      }
    } catch (error: any) {
      console.error('Bulk registration error:', error);
      Alert.alert('Error', `Failed to register users: ${error.message || 'Unknown error'}`);
    } finally {
      setIsBulkRegistering(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1287&q=80' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(18, 18, 18, 0.4)', 'rgba(18, 18, 18, 0.8)', '#121212']}
          style={styles.gradient}
          locations={[0, 0.6, 1]}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <FontAwesome5 name="bitcoin" size={60} color="#f7931a" />
                </View>
                <View style={styles.logoRow}>
                  <Text style={styles.logoGreen}>Candle</Text>
                  <Text style={styles.logoRed}>Rush</Text>
                </View>
                <Text style={styles.subtitle}>
                  {isLogin ? 'Sign in to predict Bitcoin\'s next move!' : 'Create an account to start trading!'}
                </Text>
              </View>

              <View style={styles.formContainer}>
                {/* Connection status indicator */}
                <View style={styles.connectionStatus}>
                  <Ionicons 
                    name={isConnected ? "wifi" : "wifi-off"} 
                    size={16} 
                    color={isConnected ? "#16a34a" : "#dc2626"} 
                  />
                  <Text style={[
                    styles.connectionStatusText,
                    {color: isConnected ? "#16a34a" : "#dc2626"}
                  ]}>
                    {isConnected ? "Online" : "Offline"}
                  </Text>
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#9ca3af"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={styles.authButton}
                  onPress={handleAuth}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#f7931a', '#e67e22']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name={isLogin ? "log-in-outline" : "person-add-outline"} size={20} color="#ffffff" />
                        <Text style={styles.authButtonText}>{isLogin ? 'SIGN IN' : 'SIGN UP'}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.guestButton}
                  onPress={handleGuestLogin}
                  disabled={isGuestLoading}
                >
                  <LinearGradient
                    colors={['#4b5563', '#6b7280']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isGuestLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="person-outline" size={20} color="#ffffff" />
                        <Text style={styles.authButtonText}>CONTINUE AS GUEST</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={toggleAuthMode}
                >
                  <Text style={styles.toggleButtonText}>
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </Text>
                </TouchableOpacity>
                
                {/* Botón de Bulk Register eliminado */}
              </View>

              <View style={styles.footer}>
                <View style={styles.cryptoIconsContainer}>
                  <FontAwesome5 name="bitcoin" size={20} color="#f7931a" style={styles.cryptoIcon} />
                  <FontAwesome5 name="ethereum" size={20} color="#627eea" style={styles.cryptoIcon} />
                  <FontAwesome5 name="chart-line" size={20} color="#16a34a" style={styles.cryptoIcon} />
                </View>
                <Text style={styles.disclaimer}>
                  Trade virtual Bitcoin with real-time market data.
                </Text>
                <Text style={styles.disclaimer}>
                  Your game progress will be saved to your account.
                </Text>
                <Text style={styles.offlineLoginNote}>
                  <Ionicons name="wifi-outline" size={14} color="#9ca3af" /> Offline login available
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
      
      {/* Bulk Register Modal - Se mantiene para uso futuro pero no es accesible desde la UI */}
      <Modal
        visible={showBulkRegisterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBulkRegisterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Register Users</Text>
              <TouchableOpacity onPress={() => setShowBulkRegisterModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalInstructions}>
              Enter one user per line in format: username,password
            </Text>
            
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={8}
                placeholder="username1,password1&#10;username2,password2&#10;..."
                placeholderTextColor="#9ca3af"
                value={bulkUserData}
                onChangeText={setBulkUserData}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <TouchableOpacity
              style={styles.bulkRegisterActionButton}
              onPress={handleBulkRegister}
              disabled={isBulkRegistering}
            >
              <LinearGradient
                colors={['#f7931a', '#e67e22']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isBulkRegistering ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="people" size={20} color="#ffffff" />
                    <Text style={styles.authButtonText}>REGISTER USERS</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#f7931a',
    shadowColor: '#f7931a',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  logoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  logoGreen: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#16a34a',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  logoRed: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#dc2626',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  connectionStatusText: {
    fontSize: 14,
    marginLeft: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 45, 45, 0.8)',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    height: '100%',
  },
  authButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#f7931a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  guestButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 5,
    shadowColor: '#6b7280',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  toggleButton: {
    alignItems: 'center',
    padding: 12,
  },
  toggleButtonText: {
    color: '#f7931a',
    fontSize: 16,
  },
  bulkRegisterButton: {
    alignItems: 'center',
    padding: 8,
    marginTop: 8,
  },
  bulkRegisterText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cryptoIconsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cryptoIcon: {
    marginHorizontal: 10,
  },
  disclaimer: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  offlineLoginNote: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalInstructions: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 16,
  },
  textAreaContainer: {
    backgroundColor: 'rgba(45, 45, 45, 0.8)',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    color: '#ffffff',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 160,
  },
  bulkRegisterActionButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#f7931a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default AuthScreen;
