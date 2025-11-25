import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def acl_update(acl_id, rule_number, protocol, action, egress: bool):
    try:
        acl_client = boto3.client('ec2')
        response = acl_client.create_network_acl_entry(
            NetworkAclId = acl_id,
            RuleNumber = rule_number,
            Protocol = protocol,
            RuleAction = action,
            Egress  = egress,   
        )

        return response

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return None
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return None
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None
