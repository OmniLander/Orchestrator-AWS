import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def delete_vpc(vpc_id):
    try:
        vpc_client = boto3.client('ec2')

        response = vpc_client.delete_vpc(
            VpcId = vpc_id,
        )
        reply = f"The VPC with id {vpc_id} have been succesfully deleted" 
        return reply
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return None
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return None
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None
    
def delete_subnet(subnet_id):
    try:
        vpc_client = boto3.client('ec2')

        response = vpc_client.delete_vpc(
            VpcId = subnet_id,
        )
        reply = f"The VPC with id {subnet_id} have been succesfully deleted" 
        return reply
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return None
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return None
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None