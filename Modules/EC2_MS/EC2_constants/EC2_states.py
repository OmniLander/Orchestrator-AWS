import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def ec2_stop(instance_id):
    try:
        ec2_client = boto3.client('ec2')
        response = ec2_client.stop_instances(
            InstanceIds = [instance_id]
        )
        return f"success"
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}

def ec2_start(instance_id):
    try:
        ec2_client = boto3.client('ec2')
        response = ec2_client.start_instances(
            InstanceIds = [instance_id]
        )
        return f"success"
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}

    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
