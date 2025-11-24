import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def acl_in_existance():
    try:
        ec2 = boto3.client('ec2')
        response = ec2.describe_network_acls()

        data = {
            "acl_per_vpc": {},
            "assotiations": {},
            "rules": {}
        }

        for acl in response['NetworkAcls']:
            vpc_id = acl['VpcId']
            acl_id = acl['NetworkAclId']

            # Lista ACLs por VPC
            if vpc_id not in data["acl_per_vpc"]:
                data["acl_per_vpc"][vpc_id] = []

            data["acl_per_vpc"][vpc_id].append(acl_id)

            # assotiations
            for ass in acl.get('Associations', []):
                ass_id = ass['NetworkAclAssociationId']
                data["assotiations"][ass_id] = {
                    "acl_id": ass["NetworkAclId"],
                    "subnet_id": ass["SubnetId"]
                }

            # rules
            for entry in acl.get('Entries', []):
                rule_id = f"{acl_id}_{entry['RuleNumber']}"

                data["rules"][rule_id] = {
                    "acl_id": acl_id,
                    "rule_number": entry["RuleNumber"],
                    "type": "Egress" if entry["Egress"] else "Ingress",
                    "action": entry["RuleAction"],
                    "protocol": entry["Protocol"],
                    "cidr_block": entry.get("CidrBlock"),
                    "ipv6_cidr": entry.get("Ipv6CidrBlock", 'N/A'),
                    "port_range": entry.get("PortRange", 'N/A')
                }

        return data

    except NoCredentialsError as e:
        print(f"Error con las credenciales: {e}")
    except ClientError as e:
        print(f"Error del cliente AWS: {e}")
    except Exception as e:
        print(f"Error inesperado: {e}")

print(acl_in_existance())