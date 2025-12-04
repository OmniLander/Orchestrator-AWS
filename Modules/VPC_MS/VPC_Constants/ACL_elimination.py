import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def delete_acl(acl_id):
    try:
        acl_client = boto3.client('ec2')
        response = acl_client.delete_network_acl(
            NetworkAclId = acl_id
        )

        return {"success": True, "data": {"message": "Successfully  deleted", "acl_id": acl_id}}

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}    
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}    
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}    


def delete_acl_entry(acl_id, rule_number, egress: bool):
    try:
        acl_client = boto3.client('ec2')
        response = acl_client.delete_network_acl_entry(
            NetworkAclId = acl_id,
            RuleNumber = int(rule_number),
            Egress = egress
        )
    
        return {"success": True, "data": {"message": "Successfully  deleted", "rule_number": rule_number}}

    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
            
    except ClientError as e:
        print(f"There's been an error with the client side {e}")    
        return {"success": False, "error": str(e)}    
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}