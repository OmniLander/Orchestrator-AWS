import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def acl_in_existance():
    try:
        acl_client = boto3.client('ec2')
        response = acl_client.describe_network_acls()

        data = {
            "acl_per_vpc": {},
            "assotiations": {},
            "rules": {}
        }

        for acl in response['NetworkAcls']:
            vpc_id = acl['VpcId']
            acl_id = acl['NetworkAclId']
            
           
            acl_name = 'N/A'
            for tag in acl.get('Tags', []):
                if tag['Key'] == 'Name':
                    acl_name = tag['Value']
                    break

            if vpc_id not in data["acl_per_vpc"]:
                data["acl_per_vpc"][vpc_id] = []

            data["acl_per_vpc"][vpc_id].append({
                "acl_id": acl_id,
                "name": acl_name
            })

            for ass in acl.get('Associations', []):
                ass_id = ass['NetworkAclAssociationId']
                data["assotiations"][ass_id] = {
                    "acl_id": ass["NetworkAclId"],
                    "subnet_id": ass["SubnetId"]
                }

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
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
