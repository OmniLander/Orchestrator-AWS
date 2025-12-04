import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def igw_attach(igw_id, vpc_id):
    try:
        igw_client = boto3.client('ec2')
        response = igw_client.attach_internet_gateway(
            InternetGatewayId = igw_id,
            VpcId = vpc_id
        )
        return {"success": True, "data": {"message": "Successfully  attached", "igw_id": igw_id}}
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}

