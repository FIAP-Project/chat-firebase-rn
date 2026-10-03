import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { useAuth } from './src/hooks/useAuth';
import { navigationRef } from './src/navigation/rootNavigation';
import Loading from './src/components/Loading';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ConversationsScreen from './src/screens/ConversationsScreen';
import UsersScreen from './src/screens/UsersScreen';
import GroupFormScreen from './src/screens/GroupFormScreen';
import ChatScreen from './src/screens/ChatScreen';
import GroupMembersScreen from './src/screens/GroupMembersScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Routes(): React.JSX.Element {
  const { user, loading } = useAuth();
  if (loading) return <Loading message="Recuperando sessão..." />;

  // Sem usuário autenticado só existem as telas de autenticação; após o logout o fluxo volta ao Login
  // e as telas protegidas são desmontadas (seus listeners são removidos nos cleanups dos efeitos).
  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversas' }} />
          <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Nova conversa' }} />
          <Stack.Screen name="GroupForm" component={GroupFormScreen} options={{ title: 'Grupo' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
          <Stack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Integrantes' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <StatusBar style="dark" />
          <Routes />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
