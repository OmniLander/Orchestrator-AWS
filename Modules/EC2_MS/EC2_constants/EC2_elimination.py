import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def  delete_ec2(instance_id):
    try:
        ec2_client = boto3.client('ec2')
        response = ec2_client.terminate_instances(
        InstanceIds = [instance_id]
        )

        return f'Ec2 with id: {instance_id} has been successfully erradicated'
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return None
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return None
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return None    
    