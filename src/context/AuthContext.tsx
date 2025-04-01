import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';
// Ensure the polyfill is imported
import 'react-native-get-random-values';

interface User {
  id: string;
  username: string;
  isGuest?: boolean;
}

interface StoredCredential {
  username: string;
  password: string;
}

interface UserData {
  id: string;
  password: string;
  createdAt: string;
  deviceId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signUp: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  getStoredCredentials: () => Promise<StoredCredential[]>;
  bulkRegisterUsers: (users: StoredCredential[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  tryOfflineLogin: () => Promise<boolean>;
  syncUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Secret key for password encryption
const SECRET_KEY = 'candlerush-secret-key-2024';
// Key for storing credentials in SecureStore
const CREDENTIALS_STORAGE_KEY = 'candlerush-credentials';
// Key for storing device ID
const DEVICE_ID_KEY = 'candlerush-device-id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // Initialize device ID on mount
  useEffect(() => {
    const initDeviceId = async () => {
      try {
        let storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
        
        if (!storedDeviceId) {
          // Generate a new device ID if none exists
          storedDeviceId = uuidv4();
          await AsyncStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
        }
        
        setDeviceId(storedDeviceId);
        console.log("Device ID:", storedDeviceId);
      } catch (error) {
        console.error('Error initializing device ID:', error);
        // Fallback to a new ID if there's an error
        const newDeviceId = uuidv4();
        setDeviceId(newDeviceId);
        try {
          await AsyncStorage.setItem(DEVICE_ID_KEY, newDeviceId);
        } catch (e) {
          console.error('Failed to save fallback device ID:', e);
        }
      }
    };
    
    initDeviceId();
  }, []);

  // Check for existing user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        console.log("Checking for stored user...");
        const storedUser = await AsyncStorage.getItem('user');
        
        if (storedUser) {
          console.log("Found stored user:", storedUser);
          setUser(JSON.parse(storedUser));
        } else {
          console.log("No stored user found");
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Helper function to encrypt passwords
  const encryptPassword = (password: string): string => {
    return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
  };

  // Helper function to decrypt passwords
  const decryptPassword = (encryptedPassword: string): string => {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  // Store credentials securely
  const storeCredentials = async (username: string, password: string): Promise<void> => {
    try {
      // Get existing credentials
      const existingCredentialsStr = await SecureStore.getItemAsync(CREDENTIALS_STORAGE_KEY);
      const existingCredentials: StoredCredential[] = existingCredentialsStr 
        ? JSON.parse(existingCredentialsStr) 
        : [];
      
      // Check if credentials for this username already exist
      const existingIndex = existingCredentials.findIndex(cred => cred.username === username);
      
      if (existingIndex >= 0) {
        // Update existing credentials
        existingCredentials[existingIndex].password = password;
      } else {
        // Add new credentials
        existingCredentials.push({ username, password });
      }
      
      // Save updated credentials
      await SecureStore.setItemAsync(
        CREDENTIALS_STORAGE_KEY, 
        JSON.stringify(existingCredentials)
      );
      
      console.log(`Credentials stored securely for ${username}`);
    } catch (error) {
      console.error('Error storing credentials:', error);
    }
  };

  // Get all stored credentials
  const getStoredCredentials = async (): Promise<StoredCredential[]> => {
    try {
      const credentialsStr = await SecureStore.getItemAsync(CREDENTIALS_STORAGE_KEY);
      if (!credentialsStr) return [];
      
      return JSON.parse(credentialsStr) as StoredCredential[];
    } catch (error) {
      console.error('Error retrieving stored credentials:', error);
      return [];
    }
  };

  // Sync user data across devices
  const syncUserData = async (): Promise<void> => {
    if (!user) return;
    
    try {
      console.log("Syncing user data across devices");
      
      // Get stored users
      const storedUsersJson = await AsyncStorage.getItem('users');
      const storedUsers = storedUsersJson ? JSON.parse(storedUsersJson) : {};
      
      // Check if the current user exists in stored users
      if (storedUsers[user.username]) {
        // Update the device ID for this user
        if (deviceId) {
          storedUsers[user.username].deviceId = deviceId;
          
          // Save updated users
          await AsyncStorage.setItem('users', JSON.stringify(storedUsers));
          console.log("Updated device ID for user:", user.username);
        }
      }
    } catch (error) {
      console.error('Error syncing user data:', error);
    }
  };

  // Try to login with stored credentials when offline
  const tryOfflineLogin = async (): Promise<boolean> => {
    try {
      // Check network status
      const netInfo = await NetInfo.fetch();
      
      // If online, no need for offline login
      if (netInfo.isConnected && netInfo.isInternetReachable) {
        console.log("Internet connection available, skipping offline login");
        return false;
      }
      
      console.log("No internet connection, attempting offline login");
      
      // Get stored credentials
      const credentials = await getStoredCredentials();
      if (credentials.length === 0) {
        console.log("No stored credentials found for offline login");
        return false;
      }
      
      // Use the most recent credentials (last in the array)
      const lastCredential = credentials[credentials.length - 1];
      
      // Get stored users
      const storedUsersJson = await AsyncStorage.getItem('users');
      const storedUsers = storedUsersJson ? JSON.parse(storedUsersJson) : {};
      
      // Check if username exists
      if (!storedUsers[lastCredential.username]) {
        console.log("User not found in local storage");
        return false;
      }
      
      const userData = storedUsers[lastCredential.username];
      
      // Create user object
      const userObject: User = {
        id: userData.id,
        username: lastCredential.username
      };

      // Store user in state and AsyncStorage
      setUser(userObject);
      await AsyncStorage.setItem('user', JSON.stringify(userObject));
      console.log("Offline login successful with stored credentials");

      return true;
    } catch (error) {
      console.error('Error during offline login:', error);
      return false;
    }
  };

  // Local authentication implementation
  const signIn = async (username: string, password: string) => {
    try {
      console.log("Attempting to sign in user:", username);
      
      // Get stored users
      const storedUsersJson = await AsyncStorage.getItem('users');
      const storedUsers = storedUsersJson ? JSON.parse(storedUsersJson) : {};
      
      // Check if username exists
      if (!storedUsers[username]) {
        return { error: 'User not found' };
      }
      
      const userData = storedUsers[username];
      
      // Decrypt the stored password and compare
      const decryptedPassword = decryptPassword(userData.password);
      if (decryptedPassword !== password) {
        return { error: 'Invalid password' };
      }
      
      // Create user object
      const userObject: User = {
        id: userData.id,
        username
      };

      // Store user in state and AsyncStorage
      setUser(userObject);
      await AsyncStorage.setItem('user', JSON.stringify(userObject));
      console.log("User stored in AsyncStorage");
      
      // Store credentials securely for offline login
      await storeCredentials(username, password);
      
      // Update device ID for this user
      if (deviceId) {
        storedUsers[username].deviceId = deviceId;
        await AsyncStorage.setItem('users', JSON.stringify(storedUsers));
      }

      return { error: null };
    } catch (error: any) {
      console.error('Error signing in:', error);
      return { error: error.message || 'An unexpected error occurred' };
    }
  };

  const signUp = async (username: string, password: string) => {
    try {
      console.log("Attempting to register user:", username);
      
      // Get stored users
      const storedUsersJson = await AsyncStorage.getItem('users');
      const storedUsers = storedUsersJson ? JSON.parse(storedUsersJson) : {};
      
      // Check if username already exists
      if (storedUsers[username]) {
        return { error: 'Username already exists' };
      }
      
      // Generate a new user ID
      const userId = uuidv4();
      
      // Encrypt the password before storing
      const encryptedPassword = encryptPassword(password);
      
      // Add new user to stored users with device ID
      storedUsers[username] = {
        id: userId,
        password: encryptedPassword,
        createdAt: new Date().toISOString(),
        deviceId: deviceId || undefined
      };
      
      // Save updated users
      await AsyncStorage.setItem('users', JSON.stringify(storedUsers));
      
      // Initialize user profile with default values
      await AsyncStorage.setItem(`profile_${userId}`, JSON.stringify({
        coins: 50,
        highScore: 0,
        maxStreak: 0,
        totalBets: 0,
        bullBets: 0,
        bearBets: 0,
        oneMinBets: 0,
        fiveMinBets: 0
      }));

      // Create user object
      const userObject: User = {
        id: userId,
        username
      };

      // Store user in state and AsyncStorage
      setUser(userObject);
      await AsyncStorage.setItem('user', JSON.stringify(userObject));
      console.log("User stored in AsyncStorage");
      
      // Store credentials securely for offline login
      await storeCredentials(username, password);

      return { error: null };
    } catch (error: any) {
      console.error('Error signing up:', error);
      return { error: error.message || 'An unexpected error occurred' };
    }
  };

  // Bulk register multiple users
  const bulkRegisterUsers = async (users: StoredCredential[]): Promise<{ 
    success: number; 
    failed: number; 
    errors: string[] 
  }> => {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      // Get stored users
      const storedUsersJson = await AsyncStorage.getItem('users');
      let storedUsers = storedUsersJson ? JSON.parse(storedUsersJson) : {};
      
      // Process each user in the array
      for (const userCred of users) {
        try {
          const { username, password } = userCred;
          
          // Skip if username is empty
          if (!username || !password) {
            errors.push(`Invalid credentials for user: ${username || 'unknown'}`);
            failedCount++;
            continue;
          }
          
          // Check if username already exists
          if (storedUsers[username]) {
            errors.push(`Username already exists: ${username}`);
            failedCount++;
            continue;
          }
          
          // Generate a new user ID
          const userId = uuidv4();
          
          // Encrypt the password before storing
          const encryptedPassword = encryptPassword(password);
          
          // Add new user to stored users with device ID
          storedUsers[username] = {
            id: userId,
            password: encryptedPassword,
            createdAt: new Date().toISOString(),
            deviceId: deviceId || undefined
          };
          
          // Initialize user profile with default values
          await AsyncStorage.setItem(`profile_${userId}`, JSON.stringify({
            coins: 50,
            highScore: 0,
            maxStreak: 0,
            totalBets: 0,
            bullBets: 0,
            bearBets: 0,
            oneMinBets: 0,
            fiveMinBets: 0
          }));
          
          // Store credentials securely for offline login
          await storeCredentials(username, password);
          
          successCount++;
        } catch (error: any) {
          console.error(`Error registering user ${userCred.username}:`, error);
          errors.push(`Error for ${userCred.username}: ${error.message || 'Unknown error'}`);
          failedCount++;
        }
      }
      
      // Save all updated users at once
      await AsyncStorage.setItem('users', JSON.stringify(storedUsers));
      
      return { success: successCount, failed: failedCount, errors };
    } catch (error: any) {
      console.error('Error in bulk registration:', error);
      errors.push(`General error: ${error.message || 'Unknown error'}`);
      return { success: successCount, failed: failedCount + (users.length - successCount - failedCount), errors };
    }
  };

  const loginAsGuest = async () => {
    try {
      console.log("Logging in as guest");
      
      // Generate a random guest ID
      const guestId = uuidv4();
      const guestUsername = `Guest-${Math.random().toString(36).substring(2, 7)}`;
      
      // Create guest user object
      const guestUser: User = {
        id: guestId,
        username: guestUsername,
        isGuest: true
      };
      
      // Initialize user profile with default values
      await AsyncStorage.setItem(`profile_${guestId}`, JSON.stringify({
        coins: 50,
        highScore: 0,
        maxStreak: 0,
        totalBets: 0,
        bullBets: 0,
        bearBets: 0,
        oneMinBets: 0,
        fiveMinBets: 0
      }));
      
      // Store guest user in state and AsyncStorage
      setUser(guestUser);
      await AsyncStorage.setItem('user', JSON.stringify(guestUser));
      console.log("Guest user stored in AsyncStorage:", guestUser);
      
    } catch (error) {
      console.error('Error logging in as guest:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log("Signing out user");
      // Clear user from state and AsyncStorage
      setUser(null);
      await AsyncStorage.removeItem('user');
      console.log("User removed from AsyncStorage");
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn,
        signUp,
        signOut,
        loginAsGuest,
        getStoredCredentials,
        bulkRegisterUsers,
        tryOfflineLogin,
        syncUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
