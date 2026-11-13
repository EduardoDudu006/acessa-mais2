import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { apiRequest } from '../services/api';

export default function OcorrenciaScreen({ token, navigation }) {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permissão negada", "Precisamos da sua localização para registrar o obstáculo.");
                return;
            }

            let currentLocation = await Location.getCurrentPositionAsync({});
            setLocation(currentLocation.coords);
        })();
    }, []);

    const handleRegistrarObstaculo = async () => {
        if (!location) {
            Alert.alert("Aviso", "Aguardando sinal de GPS...");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                categoria: "Calçada irregular ou buraco",
                descricao: "Registrado via aplicativo mobile em campo",
                latitude: location.latitude,
                longitude: location.longitude
            };

            await apiRequest("/ocorrencias", "POST", payload, token);
            Alert.alert("Sucesso!", "Ocorrência registrada e enviada para validação comunitária.");
        } catch (error) {
            Alert.alert("Erro", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Novo Registro - ACESSA+</Text>
            {location ? (
                <Text style={styles.coordText}>
                    Lat: {location.latitude.toFixed(5)} | Lon: {location.longitude.toFixed(5)}
                </Text>
            ) : (
                <Text style={styles.coordText}>Obtendo localização GPS...</Text>
            )}

            <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                onPress={handleRegistrarObstaculo}
                disabled={loading}
            >
                <Text style={styles.buttonText}>{loading ? "Enviando..." : "Registrar Obstáculo"}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8' },
    title: { fontSize: 20, fontWeight: '900', color: '#0B3D91', marginBottom: 20 },
    coordText: { fontSize: 14, color: '#4A5568', marginBottom: 30 },
    button: { backgroundColor: '#FF7A00', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10, alignItems: 'center' },
    buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 }
});