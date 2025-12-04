import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def delete_vpc(vpc_id):
    try:
        vpc_client = boto3.client('ec2')

        response = vpc_client.delete_vpc(
            VpcId = vpc_id,
        )
        
        return {"success": True, "data": {"message": "Successfully  deleted", "vpc_id": vpc_id}}
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}
    
def delete_subnet(subnet_id):
    try:
        subnet_client = boto3.client('ec2')
        response = subnet_client.delete_subnet(
            SubnetId = subnet_id,
        )
        
        return {"success": True, "data": {"message": "Successfully  deleted", "subnet_id": subnet_id}}
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}