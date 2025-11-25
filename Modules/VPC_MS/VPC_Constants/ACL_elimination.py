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
        return None
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return None
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None
