import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def create_keypair(key_name, key_format):
    try:
        key_client = boto3.client('ec2')
        response = key_client.create_key_pair(
            KeyName = key_name,
            KeyFormat = key_format
        )

        key_info = {
            'Key_name': response['KeyName'],
            'Key_id': response['KeyPairId']
        }

        return key_info
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}