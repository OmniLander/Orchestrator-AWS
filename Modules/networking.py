# modules/networking.py
import boto3
from Modules.state import ESTADO

# Cliente Boto3 configurado para us-east-1
ec2 = boto3.client('ec2', region_name='us-east-1')
ec2_resource = boto3.resource('ec2', region_name='us-east-1')

def desplegar_red():
    print(">>> Iniciando despliegue de Networking...")
    
    # 1. Crear VPC
    vpc_response = ec2.create_vpc(CidrBlock='10.0.0.0/16')
    vpc_id = vpc_response['Vpc']['VpcId']
    ESTADO['vpc_id'] = vpc_id
    
    # Agregar Tags para identificarla
    ec2.create_tags(Resources=[vpc_id], Tags=[{'Key': 'Name', 'Value': 'Proyecto-Orchestrator-VPC'}])

    # CRITICO: Habilitar DNS Support y Hostnames (requiere dos llamadas)
    ec2.modify_vpc_attribute(VpcId=vpc_id, EnableDnsSupport={'Value': True})
    ec2.modify_vpc_attribute(VpcId=vpc_id, EnableDnsHostnames={'Value': True})
    
    # 2. Crear Internet Gateway (IGW) y adjuntar
    igw_response = ec2.create_internet_gateway()
    igw_id = igw_response['InternetGateway']['InternetGatewayId']
    ESTADO['igw_id'] = igw_id
    ec2.attach_internet_gateway(InternetGatewayId=igw_id, VpcId=vpc_id)
    
    # 3. Crear Subnets
    # Subnet Pública (us-east-1a)
    sub_pub = ec2.create_subnet(
        VpcId=vpc_id,
        CidrBlock='10.0.1.0/24',
        AvailabilityZone='us-east-1a'
    )
    sub_pub_id = sub_pub['Subnet']['SubnetId']
    ESTADO['subnet_pub_id'] = sub_pub_id
    # Habilitar asignación automática de IP pública
    ec2.modify_subnet_attribute(SubnetId=sub_pub_id, MapPublicIpOnLaunch={'Value': True})
    ec2.create_tags(Resources=[sub_pub_id], Tags=[{'Key': 'Name', 'Value': 'Subnet-Publica'}])

    # Subnet Privada (us-east-1b)
    sub_priv = ec2.create_subnet(
        VpcId=vpc_id,
        CidrBlock='10.0.2.0/24',
        AvailabilityZone='us-east-1b'
    )
    sub_priv_id = sub_priv['Subnet']['SubnetId']
    ESTADO['subnet_priv_id'] = sub_priv_id
    ec2.create_tags(Resources=[sub_priv_id], Tags=[{'Key': 'Name', 'Value': 'Subnet-Privada'}])

    # 4. Route Table para Subnet Pública
    rt_response = ec2.create_route_table(VpcId=vpc_id)
    rt_id = rt_response['RouteTable']['RouteTableId']
    ESTADO['rt_id'] = rt_id
    
    # Ruta 0.0.0.0/0 -> IGW
    ec2.create_route(
        RouteTableId=rt_id,
        DestinationCidrBlock='0.0.0.0/0',
        GatewayId=igw_id
    )
    
    # Asociar RT a Subnet Pública
    ec2.associate_route_table(RouteTableId=rt_id, SubnetId=sub_pub_id)

    return {"status": "success", "data": ESTADO}