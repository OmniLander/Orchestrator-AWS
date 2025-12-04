# modules/security.py
import boto3
from Modules.state import ESTADO

ec2 = boto3.client('ec2', region_name='us-east-1')

def desplegar_seguridad():
    if not ESTADO['vpc_id']:
        return {"status": "error", "message": "Primero despliega Networking (VPC faltante)."}

    print(">>> Iniciando despliegue de Seguridad...")

    # 1. SG-Oficina
    sg_oficina = ec2.create_security_group(
        GroupName='SG-Oficina',
        Description='Permite RDP y SSH',
        VpcId=ESTADO['vpc_id']
    )
    sg_oficina_id = sg_oficina['GroupId']
    ESTADO['sg_oficina_id'] = sg_oficina_id

    # Reglas Ingress SG-Oficina (SSH 22, RDP 3389)
    ec2.authorize_security_group_ingress(
        GroupId=sg_oficina_id,
        IpPermissions=[
            {'IpProtocol': 'tcp', 'FromPort': 22, 'ToPort': 22, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]},
            {'IpProtocol': 'tcp', 'FromPort': 3389, 'ToPort': 3389, 'IpRanges': [{'CidrIp': '0.0.0.0/0'}]}
        ]
    )

    # 2. SG-WebPrivada
    sg_web = ec2.create_security_group(
        GroupName='SG-WebPrivada',
        Description='HTTP solo desde Oficina',
        VpcId=ESTADO['vpc_id']
    )
    sg_web_id = sg_web['GroupId']
    ESTADO['sg_web_id'] = sg_web_id

    # Reglas Ingress SG-WebPrivada (HTTP 80 desde SG-Oficina)
    # Referencia cruzada usando UserIdGroupPairs
    ec2.authorize_security_group_ingress(
        GroupId=sg_web_id,
        IpPermissions=[
            {
                'IpProtocol': 'tcp',
                'FromPort': 80,
                'ToPort': 80,
                'UserIdGroupPairs': [{'GroupId': sg_oficina_id}]
            }
        ]
    )

    return {"status": "success", "data": ESTADO}