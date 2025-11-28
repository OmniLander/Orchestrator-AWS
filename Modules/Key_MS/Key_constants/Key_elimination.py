import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def delete_key(key_id, key_name):
    try:
        key_client = boto3.client('ec2')
        response = key_client.delete_key_pair(
            KeyName= key_name,
            KeyPairId= key_id
        )
        
        reply = f'The Key-pair with the id {key_id}, have been succesfully deleted'

        return reply
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}