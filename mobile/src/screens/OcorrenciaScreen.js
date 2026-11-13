import React, { useState, useEffect } from "react";
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const STORAGE_KEY = "@acessa_mais_fila_offline";

export default function OcorrenciaScreen() {
    const [categoria, setCategoria] = useState("Calçada irregular ou buraco");
    const [descricao, setDescricao] = useState("");
    const [latitude, setLatitude] = useState("-8.05428");
    const [longitude, setLongitude] = useState("-34.88130");
    const [enviando, setEnviando] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    // Monitora a conexão de rede do dispositivo
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOnline(state.isConnected);
            if (state.isConnected) {
                sincronizarFilaOffline();
            }
        });
        return () => unsubscribe();
    }, []);

    // Função para sincronizar dados salvos offline quando a internet retornar
    const sincronizarFilaOffline = async () => {
        try {
            const filaStr = await AsyncStorage.getItem(STORAGE_KEY);
            if (!filaStr) return;

            const fila = JSON.parse(filaStr);
            if (fila.length === 0) return;

            const novosPendentes = [];
            for (const item of fila) {
                try {
                    const res = await fetch("https://acessa-backend.onrender.com/api/v1/ocorrencias", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(item)
                    });
                    if (!res.ok) novosPendentes.push(item);
                } catch (e) {
                    novosPendentes.push(item);
                }
            }

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novosPendentes));
            if (novosPendentes.length === 0) {
                Alert.alert("Sincronização", "Todas as ocorrências offline foram enviadas com sucesso!");
            }
        } catch (error) {
            console.error("Erro na sincronização offline:", error);
        }
    };

    const handleSalvarOcorrencia = async () => {
        if (!descricao.trim()) {
            Alert.alert("Atenção", "Por favor, insira uma descrição para o obstáculo.");
            return;
        }

        setEnviando(true);
        const novaOcorrencia = {
            categoria,
            descricao,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            usuario_id: 1
        };

        if (!isOnline) {
            try {
                const filaStr = await AsyncStorage.getItem(STORAGE_KEY);
                const fila = filaStr ? JSON.parse(filaStr) : [];
                fila.push(novaOcorrencia);
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fila));

                Alert.alert(
                    "Modo Offline",
                    "Sem conexão com a internet. Sua ocorrência foi salva localmente e será enviada assim que houver sinal!"
                );
                setDescricao("");
            } catch (err) {
                Alert.alert("Erro", "Não foi possível salvar o registro offline.");
            } finally {
                setEnviando(false);
            }
            return;
        }

        try {
            const res = await fetch("https://acessa-backend.onrender.com/api/v1/ocorrencias", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(novaOcorrencia)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Erro ao registrar ocorrência.");

            Alert.alert("Sucesso!", `Ocorrência #${data.ocorrencia_id} registrada no mapa de Recife! (+15 pts)`);
            setDescricao("");
        } catch (error) {
            Alert.alert("Erro de Conexão", error.message);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.headerCard}>
                <Text style={styles.tituloHeader}>ACESSA+ Mobile</Text>
                <Text style={styles.subHeader}>
                    Status: <Text style={{ color: isOnline ? "#00A86B" : "#E53E3E" }}>{isOnline ? "Online 🟢" : "Offline 🔴"}</Text>
                </Text>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Categoria do Obstáculo</Text>
                <TextInput
                    style={styles.input}
                    value={categoria}
                    onChangeText={setCategoria}
                    placeholder="Ex: Calçada irregular"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Descrição e Referência</Text>
                <TextInput
                    style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                    multiline
                    value={descricao}
                    onChangeText={setDescricao}
                    placeholder="Descreva o problema de acessibilidade encontrado..."
                />
            </View>

            <View style={styles.coordsContainer}>
                <Text style={styles.coordsTitle}>Coordenadas Geográficas (Recife)</Text>
                <View style={styles.coordsRow}>
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={latitude}
                        onChangeText={setLatitude}
                        keyboardType="numeric"
                        placeholder="Latitude"
                    />
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={longitude}
                        onChangeText={setLongitude}
                        keyboardType="numeric"
                        placeholder="Longitude"
                    />
                </View>
            </View>

            <TouchableOpacity
                style={styles.botaoEnviar}
                onPress={handleSalvarOcorrencia}
                disabled={enviando}
            >
                {enviando ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.textoBotao}>Registrar Ocorrência</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: "#F0F4F8",
        flexGrow: 1,
        justifyContent: "center"
    },
    headerCard: {
        backgroundColor: "#0B3D91",
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: "center"
    },
    tituloHeader: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "900"
    },
    subHeader: {
        color: "#E2E8F0",
        fontSize: 13,
        marginTop: 4
    },
    formGroup: {
        marginBottom: 16
    },
    label: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0B3D91",
        marginBottom: 6
    },
    input: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#CBD5E0",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: "#2D3748"
    },
    coordsContainer: {
        backgroundColor: "#FFFFFF",
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 20
    },
    coordsTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#4A5568",
        marginBottom: 8
    },
    coordsRow: {
        flexDirection: "row",
        gap: 10
    },
    botaoEnviar: {
        backgroundColor: "#FF7A00",
        padding: 16,
        borderRadius: 10,
        alignItems: "center"
    },
    textoBotao: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800"
    }
});