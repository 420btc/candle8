import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import GameScreen from '../screens/GameScreen';
import GameScreen5Min from '../screens/GameScreen5Min';
import GameOverScreen from '../screens/GameOverScreen';
import AuthScreen from '../screens/AuthScreen';
import { useAuth } from '../context/AuthContext';
import ProfileScreen from '../screens/ProfileScreen';
import StoreScreen from '../screens/StoreScreen';
import BetDetailsScreen from '../screens/BetDetailsScreen';
import HistorialScreen from '../screens/HistorialScreen';
import RankingScreen from '../screens/RankingScreen';
import TutorialScreen from '../screens/TutorialScreen';
import IntroScreen from '../screens/IntroScreen';
import WheelSpinScreen from '../screens/WheelSpinScreen';
import AchievementsScreen from '../screens/AchievementsScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#121212' }
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Intro" component={IntroScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
            <Stack.Screen name="Game5Min" component={GameScreen5Min} />
            <Stack.Screen name="GameOver" component={GameOverScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Store" component={StoreScreen} />
            <Stack.Screen name="BetDetails" component={BetDetailsScreen} />
            <Stack.Screen name="Historial" component={HistorialScreen} />
            <Stack.Screen name="Ranking" component={RankingScreen} />
            <Stack.Screen name="Tutorial" component={TutorialScreen} />
            <Stack.Screen name="WheelSpin" component={WheelSpinScreen} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
