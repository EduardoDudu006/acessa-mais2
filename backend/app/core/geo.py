from math import atan2, cos, radians, sin, sqrt


def distancia_metros(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    raio_terra_metros = 6_371_000
    diferenca_lat = radians(latitude_b - latitude_a)
    diferenca_lon = radians(longitude_b - longitude_a)
    a = (
        sin(diferenca_lat / 2) ** 2
        + cos(radians(latitude_a))
        * cos(radians(latitude_b))
        * sin(diferenca_lon / 2) ** 2
    )
    return raio_terra_metros * 2 * atan2(sqrt(a), sqrt(1 - a))
