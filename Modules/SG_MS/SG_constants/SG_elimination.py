import boto3
from botocore.exceptions import NoCredentialsError, ClientError

def delete_sg(group_id):
    try:
        sg_client = boto3.client('ec2')
        response = sg_client.delete_security_group(
            GroupId=group_id
        )

        return response
    
    except NoCredentialsError as e:
        print(f"There's been an error with the credentials:{e}")
        return {"success": False, "error": str(e)}
        
    except ClientError as e:
        print(f"There's been an error with the client side {e}")
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        print(f"Unexpected error {e}")
        return {"success": False, "error": str(e)}