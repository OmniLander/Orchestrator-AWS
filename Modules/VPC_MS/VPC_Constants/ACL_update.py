import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def acl_update(acl_id, rule_number, protocol, action, egress: bool, cidr_block, port_from=None, port_to=None):
    try:
        acl_client = boto3.client('ec2')
        
        acl_args = {
            'NetworkAclId': acl_id,
            'RuleNumber': int(rule_number), 
            'Protocol': protocol,
            'RuleAction': action,
            'Egress': egress,
            'CidrBlock': cidr_block 
        }

        if protocol in ['tcp', 'udp', '6', '17'] and port_from and port_to:
            acl_args['PortRange'] = {
                'From': int(port_from),
                'To': int(port_to)
            }

        response = acl_client.create_network_acl_entry(**acl_args)

        return {"success": True, "data": {"message": "Successfully  updated", "rule_number": rule_number}}

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}