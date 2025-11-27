import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def delete_acl(acl_id):
    try:
        acl_client = boto3.client('ec2')
        response = acl_client.delete_network_acl(
            NetworkAclId = acl_id
        )

        return  f'The acl with the id {acl_id}, have been succesfully deleted'

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"error": str(e)}    
        
    except Clienterror as e:
        print(f"There's been an error with the client side {e}")
        return {"error": str(e)}    
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"error": str(e)}    


def delete_acl_entry(acl_id, rule_number, egress: bool):
    try:
        acl_client = boto3.client('ec2')
        response = acl_client.delete_network_acl_entry(
            NetworkAclId = acl_id,
            RuleNumber = int(rule_number),
            Egress = egress
        )
    
        return  f'The acl entry with the id {rule_number}, have been succesfully deleted'

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"error": str(e)}
            
    except Clienterror as e:
        print(f"There's been an error with the client side {e}")    
        return {"error": str(e)}    
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"error": str(e)}