import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def create_ACL(vpc_id, acl_name):
    try:
        acl_client = boto3.client('ec2')
        response = acl_client.create_network_acl(
            TagSpecifications = [
                {
                    'ResourceType': 'network-acl',
                    'Tags': [
                        {
                        'Key' : 'Name',
                        'Value' : acl_name
                        }
                    ]
                }
            ],
            VpcId = vpc_id
        )

        return f'Success'

    except NoCredentialserror as e:
        print(f"There's been an error with the credentials:{e}")
        return {"error": str(e)}    
        
    except Clienterror as e:
        print(f"There's been an error with the client side {e}")
        return {"error": str(e)}    
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"error": str(e)}    
