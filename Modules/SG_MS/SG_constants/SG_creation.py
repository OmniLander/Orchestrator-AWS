import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def create_sg(vpc_id, group_name, description):
    try:
        sg_client = boto3.client('ec2')

        response = sg_client.create_security_group(
            VpcId = vpc_id,
            GroupName = group_name,
            Description = description
        )

        return response['GroupId']
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return None
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return None
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None 
 
