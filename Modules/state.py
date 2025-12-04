# modules/state.py

# Diccionario global para persistir IDs y datos entre peticiones
ESTADO = {
    'vpc_id': None,
    'subnet_pub_id': None,
    'subnet_priv_id': None,
    'igw_id': None,
    'rt_id': None,
    'sg_oficina_id': None,
    'sg_web_id': None,
    'ip_privada_web': None,
    'ip_publica_oficina': None
}