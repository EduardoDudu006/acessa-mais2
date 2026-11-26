import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { apiRequest } from "../services/api";

const STORAGE_KEY = "@acessa_mais_fila_offline";

export default function OcorrenciaScreen() {
    const [usuario, setUsuario] = useState(null);
    const [sessaoCarregando, setSessaoCarregando] = useState(true);
    const [modoCadastro, setModoCadastro] = useState(false);
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [senhaVisivel, setSenhaVisivel] = useState(false);
    const [erroAutenticacao, setErroAutenticacao] = useState("");
    const [categoria, setCategoria] = useState("Calçada irregular ou buraco");
    const [descricao, setDescricao] = useState("");
    const [latitude, setLatitude] = useState("-8.05428");
    const [longitude, setLongitude] = useState("-34.88130");
    const [enviando, setEnviando] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        async function restaurarSessao() {
            const token = await AsyncStorage.getItem("acessa_token");
            const usuarioSalvo = await AsyncStorage.getItem("acessa_usuario");
            if (!token) {
                setSessaoCarregando(false);
                return;
            }
            if (usuarioSalvo) {
                try {
                    setUsuario(JSON.parse(usuarioSalvo));
                } catch (_error) {
                    await AsyncStorage.removeItem("acessa_usuario");
                }
            }
            try {
                const perfil = await apiRequest("/auth/me");
                await AsyncStorage.setItem(
                    "acessa_usuario",
                    JSON.stringify(perfil),
                );
                setUsuario(perfil);
            } catch (error) {
                if (error.status === 401) {
                    await AsyncStorage.multiRemove([
                        "acessa_token",
                        "acessa_usuario",
                    ]);
                    setUsuario(null);
                }
            } finally {
                setSessaoCarregando(false);
            }
        }
        restaurarSessao();
    }, []);

    const handleAutenticacao = async () => {
        setErroAutenticacao("");
        try {
            const resultado = await apiRequest(
                modoCadastro ? "/auth/register" : "/auth/login",
                "POST",
                modoCadastro
                    ? { nome: nome.trim(), email: email.trim(), senha }
                    : { email: email.trim(), senha },
                null,
            );
            await AsyncStorage.multiSet([
                ["acessa_token", resultado.access_token],
                ["acessa_usuario", JSON.stringify(resultado.usuario)],
            ]);
            setUsuario(resultado.usuario);
        } catch (error) {
            setErroAutenticacao(error.message);
        }
    };

    const handleSair = async () => {
        await AsyncStorage.multiRemove(["acessa_token", "acessa_usuario"]);
        setUsuario(null);
    };

    const sincronizarFilaOffline = useCallback(async () => {
        if (!usuario) return;
        try {
            const chaveFila = `${STORAGE_KEY}_${usuario.id}`;
            const filaStr = await AsyncStorage.getItem(chaveFila);
            if (!filaStr) return;

            const fila = JSON.parse(filaStr);
            if (!Array.isArray(fila) || fila.length === 0) return;

            const novosPendentes = [];
            for (const item of fila) {
                try {
                    await apiRequest("/ocorrencias", "POST", item);
                } catch (_e) {
                    novosPendentes.push(item);
                }
            }

            await AsyncStorage.setItem(
                chaveFila,
                JSON.stringify(novosPendentes),
            );
            if (novosPendentes.length === 0) {
                Alert.alert(
                    "Sincronização",
                    "Todas as ocorrências offline foram enviadas com sucesso!",
                );
            }
        } catch (error) {
            console.error("Erro na sincronização offline:", error);
        }
    }, [usuario]);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            const conectado = Boolean(state.isConnected);
            setIsOnline(conectado);
            if (conectado) {
                sincronizarFilaOffline();
            }
        });
        return () => unsubscribe();
    }, [sincronizarFilaOffline]);

    if (sessaoCarregando) {
        return (
            <View style={styles.authContainer}>
                <ActivityIndicator color="#0B3D91" />
                <Text style={styles.authSubtitle}>Verificando sua conta...</Text>
            </View>
        );
    }

    if (!usuario) {
        return (
            <ScrollView contentContainerStyle={styles.authContainer}>
                <View style={styles.authCard}>
                    <Text style={styles.tituloHeader}>ACESSA+ Mobile</Text>
                    <Text style={styles.authSubtitle}>
                        {modoCadastro
                            ? "Crie sua conta para contribuir com o mapa."
                            : "Entre para acessar o mapa colaborativo."}
                    </Text>
                    {modoCadastro && (
                        <TextInput
                            style={styles.input}
                            value={nome}
                            onChangeText={setNome}
                            placeholder="Nome"
                            autoComplete="name"
                            maxLength={100}
                        />
                    )}
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="E-mail"
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                    />
                    <View style={styles.passwordInputRow}>
                        <TextInput
                            style={[styles.input, styles.passwordInput]}
                            value={senha}
                            onChangeText={setSenha}
                            placeholder={
                                modoCadastro
                                    ? "Senha (mínimo 8 caracteres)"
                                    : "Senha"
                            }
                            secureTextEntry={!senhaVisivel}
                            autoComplete={
                                modoCadastro ? "new-password" : "current-password"
                            }
                        />
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={
                                senhaVisivel ? "Ocultar senha" : "Mostrar senha"
                            }
                            accessibilityState={{ selected: senhaVisivel }}
                            style={styles.passwordVisibilityToggle}
                            onPress={() =>
                                setSenhaVisivel((visivel) => !visivel)
                            }
                        >
                            <Text style={styles.passwordVisibilityToggleText}>
                                {senhaVisivel ? "Ocultar" : "Mostrar"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {Boolean(erroAutenticacao) && (
                        <Text style={styles.authError}>{erroAutenticacao}</Text>
                    )}
                    <TouchableOpacity
                        style={styles.botaoEnviar}
                        onPress={handleAutenticacao}
                    >
                        <Text style={styles.textoBotao}>
                            {modoCadastro ? "Criar conta" : "Entrar"}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.authSwitch}
                        onPress={() => {
                            setErroAutenticacao("");
                            setSenhaVisivel(false);
                            setModoCadastro((atual) => !atual);
                        }}
                    >
                        <Text style={styles.authSwitchText}>
                            {modoCadastro
                                ? "Já tem conta? Entrar"
                                : "Criar uma conta"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    const handleSalvarOcorrencia = async () => {
        if (!descricao.trim()) {
            Alert.alert(
                "Atenção",
                "Por favor, insira uma descrição para o obstáculo.",
            );
            return;
        }

        setEnviando(true);
        const novaOcorrencia = {
            categoria,
            descricao,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
        };

        if (!isOnline) {
            try {
                const chaveFila = `${STORAGE_KEY}_${usuario.id}`;
                const filaStr = await AsyncStorage.getItem(chaveFila);
                const fila = filaStr ? JSON.parse(filaStr) : [];
                fila.push(novaOcorrencia);
                await AsyncStorage.setItem(
                    chaveFila,
                    JSON.stringify(fila),
                );
                Alert.alert(
                    "Modo Offline",
                    "Sem conexão com a internet. Sua ocorrência foi salva localmente e será enviada assim que houver sinal!",
                );
                setDescricao("");
            } catch (_err) {
                Alert.alert(
                    "Erro",
                    "Não foi possível salvar o registro offline.",
                );
            } finally {
                setEnviando(false);
            }
            return;
        }

        try {
            const data = await apiRequest(
                "/ocorrencias",
                "POST",
                novaOcorrencia,
            );
            Alert.alert(
                "Sucesso!",
                `Ocorrência #${data.ocorrencia_id} registrada no mapa de Recife! (+15 pts)`,
            );
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
                    Olá, {usuario.nome} · {usuario.pontos} pontos
                </Text>
                <Text style={styles.subHeader}>
                    Status:{" "}
                    <Text style={{ color: isOnline ? "#00A86B" : "#E53E3E" }}>
                        {isOnline ? "Online ●" : "Offline ○"}
                    </Text>
                    <TouchableOpacity onPress={handleSair}>
                        <Text style={styles.authLogoutText}>Sair da conta</Text>
                    </TouchableOpacity>
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
                    style={[
                        styles.input,
                        { height: 90, textAlignVertical: "top" },
                    ]}
                    multiline
                    value={descricao}
                    onChangeText={setDescricao}
                    placeholder="Descreva o problema de acessibilidade encontrado..."
                />
            </View>

            <View style={styles.coordsContainer}>
                <Text style={styles.coordsTitle}>
                    Coordenadas Geográficas (Recife)
                </Text>
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
    authContainer: {
        padding: 20,
        backgroundColor: "#F0F4F8",
        flexGrow: 1,
        justifyContent: "center",
    },
    authCard: {
        width: "100%",
        maxWidth: 480,
        alignSelf: "center",
        gap: 14,
        padding: 22,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
    },
    authSubtitle: {
        marginBottom: 8,
        color: "#4A5568",
        fontSize: 14,
        textAlign: "center",
    },
    authError: {
        color: "#9B2C2C",
        fontSize: 13,
    },
    authSwitch: {
        alignItems: "center",
        padding: 8,
    },
    authSwitchText: {
        color: "#0B3D91",
        fontSize: 13,
        fontWeight: "700",
    },
    authLogoutText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "700",
        marginTop: 8,
    },
    container: {
        padding: 20,
        backgroundColor: "#F0F4F8",
        flexGrow: 1,
        justifyContent: "center",
    },
    headerCard: {
        backgroundColor: "#0B3D91",
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: "center",
    },
    tituloHeader: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "900",
    },
    subHeader: {
        color: "#E2E8F0",
        fontSize: 13,
        marginTop: 4,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0B3D91",
        marginBottom: 6,
    },
    input: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#CBD5E0",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: "#2D3748",
    },
    passwordInputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    passwordInput: {
        flex: 1,
    },
    passwordVisibilityToggle: {
        minHeight: 44,
        justifyContent: "center",
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: "#EAF1F8",
    },
    passwordVisibilityToggleText: {
        color: "#0B3D91",
        fontSize: 13,
        fontWeight: "700",
    },
    coordsContainer: {
        backgroundColor: "#FFFFFF",
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 20,
    },
    coordsTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#4A5568",
        marginBottom: 8,
    },
    coordsRow: {
        flexDirection: "row",
        gap: 10,
    },
    botaoEnviar: {
        backgroundColor: "#FF7A00",
        padding: 16,
        borderRadius: 10,
        alignItems: "center",
    },
    textoBotao: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "800",
    },
});
