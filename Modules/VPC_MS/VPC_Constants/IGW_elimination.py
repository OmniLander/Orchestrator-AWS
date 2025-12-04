import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def delete_igw(igw_id):
    try:
        igw_client = boto3.client('ec2')
        response = igw_client.delete_internet_gateway(
            InternetGatewayId = igw_id
        )
        return {"success": True, "data": {"message": "Successfully deleted", "igw_id": igw_id}}
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}    