import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def key_in_existance():
    try:
        key_client = boto3.client('ec2')
        response = key_client.describe_key_pairs()
        
        keys = {}

        for key in response['KeyPairs']:
            key_id = key['KeyPairId']
            key_name = key.get('KeyName', 'N/A')
            key_type = key['KeyType']

            keys[key_id] = {
                'Key_name': key_name,
                'key_type': key_type
            }  

        return keys
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}