# modules/compute.py
import boto3
import time
from Modules.state import ESTADO

ec2_resource = boto3.resource('ec2', region_name='us-east-1')

# --- CONFIGURACIÓN DE IMÁGENES ---
# PEGA AQUÍ EL ID DE UBUNTU 22.04 QUE APARECE EN TU CONSOLA
# Ejemplo común en us-east-1: 'ami-080e1f13689e07408' (Pero usa el tuyo si es diferente)
AMI_OFICINA_UBUNTU_22 = 'ami-080e1f13689e07408' 

# Amazon Linux 2 (Para el servidor web)
AMI_WEB = 'ami-0cff7528ff583bf9a'

def lanzar_web():
    if not ESTADO['subnet_priv_id'] or not ESTADO['sg_web_id']:
        return {"status": "error", "message": "Faltan dependencias de Red o Seguridad."}

    print(">>> Lanzando Servidor Web (Privado)...")

    user_data_script = """#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd
echo "<h1>Bienvenido al Servidor Privado del Proyecto AWS Orchestrator</h1>" > /var/www/html/index.html
"""

    instances = ec2_resource.create_instances(
        ImageId=AMI_WEB,
        MinCount=1, MaxCount=1,
        InstanceType='t2.micro',
        SubnetId=ESTADO['subnet_priv_id'],
        SecurityGroupIds=[ESTADO['sg_web_id']],
        UserData=user_data_script,
        TagSpecifications=[{'ResourceType': 'instance', 'Tags': [{'Key': 'Name', 'Value': 'Srv-Web-Privado'}]}]
    )
    
    instance = instances[0]
    print("Esperando a que la instancia Web esté Running...")
    instance.wait_until_running()
    instance.reload()
    
    ESTADO['ip_privada_web'] = instance.private_ip_address
    return {"status": "success", "ip_privada": ESTADO['ip_privada_web']}

def lanzar_oficina():
    if not ESTADO['ip_privada_web']:
        return {"status": "error", "message": "Falta IP Web."}

    print(">>> Lanzando Workstation Oficina (Ubuntu 22.04)...")
    ip_web = ESTADO['ip_privada_web']
    
    # SCRIPT BLINDADO PARA UBUNTU 22.04
    user_data_oficina = f"""#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
echo "INICIANDO SETUP UBUNTU 22.04..."

# 1. Crear usuario EMPLEADO (Prioridad 1)
useradd -m -s /bin/bash empleado
echo "empleado:Oficina123" | chpasswd
usermod -aG sudo empleado

# 2. Instalación de paquetes
apt-get update
export DEBIAN_FRONTEND=noninteractive
# Se instala ubuntu-mate-desktop (más compatible con xrdp que gnome)
apt-get install -y ubuntu-mate-desktop xrdp firefox

# 3. FIX CRITICO PARA UBUNTU 22.04 (Soluciona pantalla negra/desconexión)
adduser xrdp ssl-cert

# 4. Configurar sesión
echo mate-session > /home/empleado/.xsession
chown empleado:empleado /home/empleado/.xsession

# 5. Configurar Polkit (Evita popups de permisos)
cat <<EOF > /etc/polkit-1/localauthority/50-local.d/45-allow-colord.pkla
[Allow Colord all Users]
Identity=unix-user:*
Action=org.freedesktop.color-manager.create-device;org.freedesktop.color-manager.create-profile;org.freedesktop.color-manager.delete-device;org.freedesktop.color-manager.delete-profile;org.freedesktop.color-manager.modify-device;org.freedesktop.color-manager.modify-profile
ResultAny=no
ResultInactive=no
ResultActive=yes
EOF

# 6. Acceso Directo
mkdir -p /home/empleado/Desktop
cat <<EOF > /home/empleado/Desktop/Portal.desktop
[Desktop Entry]
Version=1.0
Type=Application
Name=PORTAL PRIVADO
Exec=firefox http://{ip_web}
Icon=firefox
Terminal=false
EOF
chmod +x /home/empleado/Desktop/Portal.desktop
chown -R empleado:empleado /home/empleado/Desktop

# 7. Reiniciar servicio
systemctl restart xrdp
echo "SETUP 22.04 FINALIZADO"
"""

    instances = ec2_resource.create_instances(
        ImageId='ami-0ecb62995f68bb549', 
        MinCount=1, MaxCount=1,
        InstanceType='t3.medium',
        SubnetId=ESTADO['subnet_pub_id'],
        SecurityGroupIds=[ESTADO['sg_oficina_id']],
        UserData=user_data_oficina,
        TagSpecifications=[{'ResourceType': 'instance', 'Tags': [{'Key': 'Name', 'Value': 'PC-Oficina-Ubuntu22'}]}],
        BlockDeviceMappings=[{
            'DeviceName': '/dev/sda1',
            'Ebs': {'VolumeSize': 20, 'VolumeType': 'gp3', 'DeleteOnTermination': True}
        }]
    )

    instance = instances[0]
    print("Esperando instancia Oficina...")
    instance.wait_until_running()
    instance.reload()
    
    ESTADO['ip_publica_oficina'] = instance.public_ip_address
    return {"status": "success", "ip_publica": ESTADO['ip_publica_oficina']}