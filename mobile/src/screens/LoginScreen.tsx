import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [role, setRole] = useState<'client' | 'provider'>('client');
  const [id, setId] = useState('');

  const doLogin = () => {
    if (!id.trim()) return;
    login(role, id.trim());
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Login</Text>
      <View style={styles.switcher}>
        <TouchableOpacity
          style={[styles.switchBtn, role === 'client' && styles.switchBtnActive]}
          onPress={() => setRole('client')}
        >
          <Text style={styles.switchText}>Cliente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switchBtn, role === 'provider' && styles.switchBtnActive]}
          onPress={() => setRole('provider')}
        >
          <Text style={styles.switchText}>Prestador</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        placeholder={role === 'client' ? 'ID do cliente' : 'ID do prestador'}
        value={id}
        onChangeText={setId}
        autoCapitalize="none"
        style={styles.input}
      />
      <TouchableOpacity style={styles.loginBtn} onPress={doLogin}>
        <Text style={styles.loginText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 16, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  switcher: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  switchBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#ccc' },
  switchBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  switchText: { color: '#000' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  loginBtn: { backgroundColor: '#111', padding: 12, borderRadius: 8, alignItems: 'center' },
  loginText: { color: '#fff', fontWeight: '700' },
});

