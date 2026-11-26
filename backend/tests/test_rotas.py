import unittest
from fastapi import HTTPException
from app.api.rotas import (
    RotaRequest,
    criar_pedido_valhalla,
    decodificar_polyline6,
    validar_resposta_valhalla,
)


class DecodificarPolyline6Tests(unittest.TestCase):
    def test_decodifica_coordenadas_lon_lat(self):
        self.assertEqual(
            decodificar_polyline6("???A"),
            [[0.0, 0.0], [0.000001, 0.0]],
        )

    def test_rejeita_polyline_truncada(self):
        with self.assertRaises(ValueError):
            decodificar_polyline6("?")


class CriarPedidoValhallaTests(unittest.TestCase):
    def test_configura_perfil_pedestre_e_velocidade_escolhida(self):
        pedido = criar_pedido_valhalla(
            RotaRequest(
                origem_lat=-8.05,
                origem_lon=-34.88,
                destino_lat=-8.06,
                destino_lon=-34.87,
                perfil="pe_lento",
            )
        )

        self.assertEqual(pedido["costing"], "pedestrian")
        self.assertEqual(
            pedido["costing_options"]["pedestrian"]["walking_speed"],
            3.0,
        )
        self.assertEqual(len(pedido["locations"]), 2)

    def test_recusa_perfil_de_cadeira_de_rodas_sem_roteamento_proprio(self):
        with self.assertRaises(HTTPException) as erro:
            criar_pedido_valhalla(
                RotaRequest(
                    origem_lat=-8.05,
                    origem_lon=-34.88,
                    destino_lat=-8.06,
                    destino_lon=-34.87,
                    perfil="cadeira_de_rodas",
                )
            )

        self.assertEqual(erro.exception.status_code, 422)


class ValidarRespostaValhallaTests(unittest.TestCase):
    def test_aceita_resposta_de_sucesso_sem_campo_status(self):
        trip = {"summary": {"length": 1.0}, "legs": []}

        self.assertIs(
            validar_resposta_valhalla({"trip": trip}),
            trip,
        )

    def test_rejeita_resposta_de_erro(self):
        with self.assertRaises(ValueError):
            validar_resposta_valhalla({"status": 400, "error": "No route"})


if __name__ == "__main__":
    unittest.main()
